// wallet.token.js — ERC20 / TRC20：USDT（及同接口代币）转账、授权、余额与 Gas 估算
// 依赖：ethers（UMD）、loadTronWeb / TronWeb、TRON_GRID、wwTronWebOptions（api-config）

(function (global) {
  'use strict';

  var ERC20_MIN_ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function allowance(address,address) view returns (uint256)',
    'function approve(address,uint256) returns (bool)',
    'function transfer(address,uint256) returns (bool)'
  ];

  /**
   * USDT 主网合约与展示用元数据（decimals 以链为准；BSC 为 18）
   * @type {Record<string, { key:string, label:string, family:'tron'|'evm', chainId:number, decimals:number, contract:string, nativeSymbol:string }>}
   */
  global.WW_USDT_NETWORK_META = {
    tron: {
      key: 'tron',
      label: 'Tron · TRC-20',
      family: 'tron',
      chainId: 0,
      decimals: 6,
      contract: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
      nativeSymbol: 'TRX'
    },
    eth: {
      key: 'eth',
      label: 'Ethereum · ERC-20',
      family: 'evm',
      chainId: 1,
      decimals: 6,
      contract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      nativeSymbol: 'ETH'
    },
    polygon: {
      key: 'polygon',
      label: 'Polygon · ERC-20',
      family: 'evm',
      chainId: 137,
      decimals: 6,
      contract: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      nativeSymbol: 'POL'
    },
    bsc: {
      key: 'bsc',
      label: 'BSC · BEP-20',
      family: 'evm',
      chainId: 56,
      decimals: 18,
      contract: '0x55d398326f99059fF775485246999027B3197955',
      nativeSymbol: 'BNB'
    }
  };

  function _rpcUrlsForChainId(chainId) {
    var id = Number(chainId);
    if (id === 1) {
      if (typeof WW_ETH_RPC_URLS !== 'undefined' && WW_ETH_RPC_URLS && WW_ETH_RPC_URLS.length) return WW_ETH_RPC_URLS.slice();
      if (typeof ETH_RPC !== 'undefined' && ETH_RPC) return [ETH_RPC];
      return ['https://rpc.ankr.com/eth'];
    }
    if (id === 137) return ['https://polygon-bor.publicnode.com', 'https://polygon-rpc.com', 'https://rpc.ankr.com/polygon'];
    if (id === 56) return ['https://bsc-dataseed.binance.org', 'https://rpc.ankr.com/bsc'];
    return [];
  }

  /**
   * 返回可发起 JSON-RPC 的 Provider（多节点 Fallback）
   */
  global.wwMakeEvmProviderForChain = function (chainId) {
    if (typeof ethers === 'undefined' || !ethers.providers) return null;
    var urls = _rpcUrlsForChainId(chainId);
    if (!urls.length) return null;
    if (urls.length === 1) {
      try {
        return new ethers.providers.JsonRpcProvider({ url: urls[0], chainId: Number(chainId) });
      } catch (_e) {
        return new ethers.providers.JsonRpcProvider(urls[0]);
      }
    }
    var configs = urls.map(function (u, i) {
      return {
        provider: new ethers.providers.JsonRpcProvider(u),
        priority: i + 1,
        weight: 1,
        stallTimeout: 1400
      };
    });
    return new ethers.providers.FallbackProvider(configs, 1);
  };

  global.wwExplorerTxUrlForChain = function (chainId, txHash) {
    var h = String(txHash || '').trim();
    if (!h) return '';
    var cid = Number(chainId);
    if (!cid) return 'https://tronscan.org/#/transaction/' + encodeURIComponent(h);
    var map = {
      1: 'https://etherscan.io/tx/',
      137: 'https://polygonscan.com/tx/',
      56: 'https://bscscan.com/tx/'
    };
    return (map[cid] || map[1]) + encodeURIComponent(h);
  };

  function _erc20Contract(provider, tokenAddr) {
    return new ethers.Contract(ethers.utils.getAddress(String(tokenAddr)), ERC20_MIN_ABI, provider);
  }

  /**
   * 人类可读余额（token）
   */
  global.wwErc20BalanceHuman = async function (ownerAddr, meta) {
    if (!meta || meta.family !== 'evm' || !meta.contract || !ownerAddr) return 0;
    var p = global.wwMakeEvmProviderForChain(meta.chainId);
    if (!p) return 0;
    var c = _erc20Contract(p, meta.contract);
    var raw = await c.balanceOf(ethers.utils.getAddress(ownerAddr));
    return parseFloat(ethers.utils.formatUnits(raw, meta.decimals));
  };

  global.wwEvmNativeBalanceHuman = async function (ownerAddr, chainId) {
    if (!ownerAddr || !chainId) return 0;
    var p = global.wwMakeEvmProviderForChain(chainId);
    if (!p) return 0;
    var b = await p.getBalance(ethers.utils.getAddress(ownerAddr));
    return parseFloat(ethers.utils.formatEther(b));
  };

  /**
   * 估算 ERC20 transfer 的 gasLimit 与原生币费用（EIP-1559 或 legacy）
   */
  global.wwErc20EstimateTransferCost = async function (fromAddr, toAddr, amountHuman, meta) {
    if (!meta || meta.family !== 'evm') throw new Error('非 EVM 代币');
    var p = global.wwMakeEvmProviderForChain(meta.chainId);
    if (!p) throw new Error('无法连接 RPC');
    var cRead = _erc20Contract(p, meta.contract);
    var v = ethers.utils.parseUnits(String(amountHuman), meta.decimals);
    var gas = await cRead.estimateGas.transfer(ethers.utils.getAddress(toAddr), v, { from: ethers.utils.getAddress(fromAddr) });
    gas = gas.mul(120).div(100);
    var fd = await p.getFeeData();
    var mult = 100;
    try {
      if (typeof getTransferFeeSpeed === 'function') {
        var sp = getTransferFeeSpeed();
        mult = sp === 'slow' ? 88 : sp === 'fast' ? 124 : 100;
      }
    } catch (_e) {}
    var feeWei;
    if (fd.maxFeePerGas) {
      feeWei = gas.mul(fd.maxFeePerGas.mul(mult).div(100));
    } else if (fd.gasPrice) {
      feeWei = gas.mul(fd.gasPrice.mul(mult).div(100));
    } else {
      throw new Error('无法获取 Gas 单价');
    }
    return {
      gasLimit: gas,
      feeWei: feeWei,
      feeNativeHuman: parseFloat(ethers.utils.formatEther(feeWei)),
      nativeSymbol: meta.nativeSymbol || 'ETH'
    };
  };

  /**
   * 广播 ERC20 transfer（已连接私钥钱包）
   */
  global.wwErc20SendTransfer = async function (toAddr, amountHuman, privateKeyHex, meta) {
    if (!meta || meta.family !== 'evm') throw new Error('非 EVM 代币');
    var p = global.wwMakeEvmProviderForChain(meta.chainId);
    if (!p) throw new Error('无法连接 RPC');
    var w = new ethers.Wallet(privateKeyHex, p);
    var c = _erc20Contract(p, meta.contract).connect(w);
    var v = ethers.utils.parseUnits(String(amountHuman), meta.decimals);
    var sp = typeof getTransferFeeSpeed === 'function' ? getTransferFeeSpeed() : 'normal';
    var m = sp === 'slow' ? 88 : sp === 'fast' ? 124 : 100;
    var fd = await p.getFeeData();
    var txOpts = {};
    if (fd.maxFeePerGas && fd.maxPriorityFeePerGas) {
      txOpts.maxFeePerGas = fd.maxFeePerGas.mul(m).div(100);
      txOpts.maxPriorityFeePerGas = fd.maxPriorityFeePerGas.mul(m).div(100);
    } else if (fd.gasPrice) {
      txOpts.gasPrice = fd.gasPrice.mul(m).div(100);
    }
    var tx = await c.transfer(ethers.utils.getAddress(toAddr), v, txOpts);
    await tx.wait(1);
    return tx.hash;
  };

  /**
   * ERC20 approve（spender 为合约；amountHuman 为数字字符串，'max' 表示无限）
   */
  global.wwErc20SendApprove = async function (spenderAddr, amountHumanOrMax, privateKeyHex, meta) {
    if (!meta || meta.family !== 'evm') throw new Error('非 EVM 代币');
    var p = global.wwMakeEvmProviderForChain(meta.chainId);
    if (!p) throw new Error('无法连接 RPC');
    var w = new ethers.Wallet(privateKeyHex, p);
    var c = _erc20Contract(p, meta.contract).connect(w);
    var v =
      amountHumanOrMax === 'max' || amountHumanOrMax === '' || amountHumanOrMax == null
        ? ethers.constants.MaxUint256
        : ethers.utils.parseUnits(String(amountHumanOrMax), meta.decimals);
    var sp = typeof getTransferFeeSpeed === 'function' ? getTransferFeeSpeed() : 'normal';
    var m = sp === 'slow' ? 88 : sp === 'fast' ? 124 : 100;
    var fd = await p.getFeeData();
    var txOpts = {};
    if (fd.maxFeePerGas && fd.maxPriorityFeePerGas) {
      txOpts.maxFeePerGas = fd.maxFeePerGas.mul(m).div(100);
      txOpts.maxPriorityFeePerGas = fd.maxPriorityFeePerGas.mul(m).div(100);
    } else if (fd.gasPrice) {
      txOpts.gasPrice = fd.gasPrice.mul(m).div(100);
    }
    var tx = await c.approve(ethers.utils.getAddress(spenderAddr), v, txOpts);
    await tx.wait(1);
    return tx.hash;
  };

  /**
   * TRC20：通用 triggerSmartContract transfer
   */
  global.wwTrc20SendTransfer = async function (toAddr, amountHuman, meta) {
    if (!meta || meta.family !== 'tron' || !meta.contract) throw new Error('非 Tron TRC20');
    await loadTronWeb();
    var opt = typeof wwTronWebOptions === 'function' ? wwTronWebOptions() : { fullHost: typeof TRON_GRID !== 'undefined' ? TRON_GRID : 'https://api.trongrid.io' };
    var tw = new TronWeb(opt);
    var pk = (typeof REAL_WALLET !== 'undefined' && REAL_WALLET && REAL_WALLET.trxPrivateKey) || (typeof REAL_WALLET !== 'undefined' && REAL_WALLET && REAL_WALLET.privateKey);
    tw.setPrivateKey(pk);
    var owner =
      (typeof REAL_WALLET !== 'undefined' && REAL_WALLET && REAL_WALLET.trxAddress) ||
      (typeof tw.defaultAddress !== 'undefined' && tw.defaultAddress && tw.defaultAddress.base58);
    if (!owner) throw new Error('缺少 Tron 发送地址（REAL_WALLET.trxAddress）');
    if (typeof tw.isAddress === 'function' && !tw.isAddress(String(toAddr || '').trim())) {
      throw new Error('收款地址不是有效的 Tron 地址');
    }
    var dec = Number(meta.decimals) || 6;
    if (typeof ethers === 'undefined' || !ethers.utils || !ethers.utils.parseUnits) throw new Error('ethers 未加载');
    var rawStr = ethers.utils.parseUnits(String(amountHuman), dec).toString();
    var feeLim = typeof getTronFeeLimitUsdt === 'function' ? getTronFeeLimitUsdt() : 20000000;
    var tx = await tw.transactionBuilder.triggerSmartContract(
      meta.contract,
      'transfer(address,uint256)',
      { feeLimit: feeLim },
      [
        { type: 'address', value: toAddr },
        { type: 'uint256', value: rawStr }
      ],
      owner
    );
    var signed = await tw.trx.sign(tx.transaction);
    var result = await tw.trx.sendRawTransaction(signed);
    if (result.result) return result.txid;
    throw new Error(result.message || 'TRC20 广播失败');
  };

  /**
   * TRC20 approve（部分 DApp 需要先授权）
   */
  global.wwTrc20SendApprove = async function (spenderAddr, amountHumanOrMax, meta) {
    if (!meta || meta.family !== 'tron') throw new Error('非 Tron TRC20');
    await loadTronWeb();
    var opt = typeof wwTronWebOptions === 'function' ? wwTronWebOptions() : { fullHost: typeof TRON_GRID !== 'undefined' ? TRON_GRID : 'https://api.trongrid.io' };
    var tw = new TronWeb(opt);
    var pk = (typeof REAL_WALLET !== 'undefined' && REAL_WALLET && REAL_WALLET.trxPrivateKey) || (typeof REAL_WALLET !== 'undefined' && REAL_WALLET && REAL_WALLET.privateKey);
    tw.setPrivateKey(pk);
    var dec = Number(meta.decimals) || 6;
    var val =
      amountHumanOrMax === 'max' || amountHumanOrMax === '' || amountHumanOrMax == null
        ? '115792089237316195423570985008687907853269984665640564039457584007913129639935'
        : ethers.utils.parseUnits(String(amountHumanOrMax), dec).toString();
    var feeLim = typeof getTronFeeLimitUsdt === 'function' ? getTronFeeLimitUsdt() : 20000000;
    var ownerA =
      (typeof REAL_WALLET !== 'undefined' && REAL_WALLET && REAL_WALLET.trxAddress) ||
      (typeof tw.defaultAddress !== 'undefined' && tw.defaultAddress && tw.defaultAddress.base58);
    if (!ownerA) throw new Error('缺少 Tron 地址（REAL_WALLET.trxAddress）');
    var tx = await tw.transactionBuilder.triggerSmartContract(
      meta.contract,
      'approve(address,uint256)',
      { feeLimit: feeLim },
      [
        { type: 'address', value: spenderAddr },
        { type: 'uint256', value: val }
      ],
      ownerA
    );
    var signed = await tw.trx.sign(tx.transaction);
    var result = await tw.trx.sendRawTransaction(signed);
    if (result.result) return result.txid;
    throw new Error(result.message || 'TRC20 授权失败');
  };

  global.wwGetUsdtMetaByKey = function (key) {
    var k = String(key || 'tron').trim();
    return global.WW_USDT_NETWORK_META[k] || global.WW_USDT_NETWORK_META.tron;
  };

  var TRC20_BAL_ABI = [
    {
      constant: true,
      inputs: [{ name: 'who', type: 'address' }],
      name: 'balanceOf',
      outputs: [{ name: '', type: 'uint256' }],
      type: 'Function'
    }
  ];

  /**
   * TRC20 人类可读余额（需已加载 TronWeb）
   */
  global.wwTrc20BalanceHuman = async function (ownerAddr, meta) {
    if (!meta || meta.family !== 'tron' || !meta.contract || !ownerAddr) return 0;
    await loadTronWeb();
    var opt =
      typeof wwTronWebOptions === 'function'
        ? wwTronWebOptions()
        : { fullHost: typeof TRON_GRID !== 'undefined' ? TRON_GRID : 'https://api.trongrid.io' };
    var tw = new TronWeb(opt);
    var dec = Number(meta.decimals) || 6;
    try {
      var cx = await tw.contract(TRC20_BAL_ABI, meta.contract);
      var raw = await cx.balanceOf(String(ownerAddr).trim()).call();
      var s = raw && raw.toString ? raw.toString() : String(raw);
      if (typeof ethers !== 'undefined' && ethers.utils && ethers.utils.formatUnits) {
        return parseFloat(ethers.utils.formatUnits(s, dec));
      }
      return parseFloat(s) / Math.pow(10, dec);
    } catch (e) {
      console.warn('[wwTrc20BalanceHuman]', e);
      return 0;
    }
  };

  /**
   * Tron TRC20 transfer 的 Energy / TRX 消耗估算（constant call + 链参数）
   */
  global.wwTrc20EstimateTransferCost = async function (fromAddr, toAddr, amountHuman, meta) {
    if (!meta || meta.family !== 'tron' || !meta.contract) throw new Error('非 Tron TRC20，请使用 EVM 的 Gas 估算');
    await loadTronWeb();
    var opt =
      typeof wwTronWebOptions === 'function'
        ? wwTronWebOptions()
        : { fullHost: typeof TRON_GRID !== 'undefined' ? TRON_GRID : 'https://api.trongrid.io' };
    var tw = new TronWeb(opt);
    var dec = Number(meta.decimals) || 6;
    if (typeof ethers === 'undefined' || !ethers.utils || !ethers.utils.parseUnits) throw new Error('ethers 未加载，无法解析金额');
    var rawStr = ethers.utils.parseUnits(String(amountHuman), dec).toString();
    var from = String(fromAddr || '').trim();
    var to = String(toAddr || '').trim();
    if (typeof tw.isAddress === 'function') {
      if (!tw.isAddress(to)) throw new Error('收款地址不是有效的 Tron 地址（请使用 T 开头的 Base58）');
    } else if (!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(to)) {
      throw new Error('收款地址格式不正确（Tron 应为 34 位 Base58，以 T 开头）');
    }
    var energyUsed = 35000;
    try {
      var res = await tw.transactionBuilder.triggerConstantContract(
        meta.contract,
        'transfer(address,uint256)',
        {},
        [
          { type: 'address', value: to },
          { type: 'uint256', value: rawStr }
        ],
        from
      );
      if (res && res.energy_used != null) energyUsed = Number(res.energy_used);
      else if (res && res.result && res.result.energy_used != null) energyUsed = Number(res.result.energy_used);
    } catch (_e) {}
    var sunPerEnergy = 420;
    try {
      var chain = await tw.trx.getChainParameters();
      if (Array.isArray(chain)) {
        for (var i = 0; i < chain.length; i++) {
          var p = chain[i];
          if (p && p.key === 'getEnergyFee' && p.value != null) {
            sunPerEnergy = Number(p.value);
            break;
          }
        }
      }
    } catch (_e2) {}
    if (!isFinite(sunPerEnergy) || sunPerEnergy <= 0) sunPerEnergy = 420;
    var feeSun = Math.ceil(energyUsed * sunPerEnergy);
    var feeTrx = feeSun / 1e6;
    var feeLim = typeof getTronFeeLimitUsdt === 'function' ? getTronFeeLimitUsdt() : 20000000;
    return {
      family: 'tron',
      gasLimit: null,
      energyUsed: energyUsed,
      sunPerEnergy: sunPerEnergy,
      feeSun: feeSun,
      feeTrxEstimate: feeTrx,
      feeNativeHuman: feeTrx,
      feeLimitSun: feeLim,
      nativeSymbol: 'TRX',
      note: '若账户已冻结 TRX 获得能量或受委托能量，实付 TRX 可能更低；带宽另计。'
    };
  };

  global.wwValidateEvmAddressChecksum = function (addr) {
    if (typeof ethers === 'undefined' || !ethers.utils) throw new Error('ethers 未加载');
    try {
      return ethers.utils.getAddress(String(addr || '').trim());
    } catch (e) {
      throw new Error('EVM 地址无效或 EIP-55 校验和不匹配：' + (e && e.message ? e.message : String(e)));
    }
  };

  global.wwValidateTronAddressFormat = function (addr) {
    var s = String(addr || '').trim();
    if (typeof window !== 'undefined' && window.TronWeb && typeof TronWeb.isAddress === 'function') {
      if (!TronWeb.isAddress(s)) throw new Error('不是有效的 Tron 地址');
      return s;
    }
    if (!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(s)) {
      throw new Error('Tron 地址应为 34 位 Base58（以 T 开头）');
    }
    return s;
  };

  function _resolveMeta(metaOrKey) {
    if (!metaOrKey) throw new Error('请指定网络（如 tron / eth / polygon / bsc）或 WW_USDT_NETWORK_META 对象');
    if (typeof metaOrKey === 'string') return global.wwGetUsdtMetaByKey(metaOrKey);
    if (typeof metaOrKey === 'object' && metaOrKey.contract) return metaOrKey;
    throw new Error('无法解析代币网络元数据');
  }

  /**
   * 统一入口：balanceOf / transfer / approve / estimateGas（ETH·Polygon·BSC·Tron USDT 等）
   */
  global.WWToken = {
    balanceOf: async function (owner, metaOrKey) {
      var meta = _resolveMeta(metaOrKey);
      if (!owner) throw new Error('缺少持有者地址');
      if (meta.family === 'evm') {
        var p = global.wwMakeEvmProviderForChain(meta.chainId);
        if (!p) throw new Error('无法连接 RPC（chainId=' + meta.chainId + '）');
        var c = _erc20Contract(p, meta.contract);
        var chk = global.wwValidateEvmAddressChecksum(owner);
        var raw = await c.balanceOf(chk);
        return {
          human: ethers.utils.formatUnits(raw, meta.decimals),
          raw: raw.toString(),
          decimals: meta.decimals,
          meta: meta
        };
      }
      var h = await global.wwTrc20BalanceHuman(owner, meta);
      return { human: String(h), raw: null, decimals: meta.decimals, meta: meta };
    },
    transfer: async function (toAddr, amountHuman, metaOrKey, opts) {
      opts = opts || {};
      var meta = _resolveMeta(metaOrKey);
      if (meta.family === 'evm') {
        var pk = opts.privateKey || (typeof REAL_WALLET !== 'undefined' && REAL_WALLET && REAL_WALLET.privateKey);
        if (!pk) throw new Error('缺少 EVM 私钥（opts.privateKey 或 REAL_WALLET.privateKey）');
        global.wwValidateEvmAddressChecksum(toAddr);
        return global.wwErc20SendTransfer(toAddr, amountHuman, pk, meta);
      }
      global.wwValidateTronAddressFormat(toAddr);
      return global.wwTrc20SendTransfer(toAddr, amountHuman, meta);
    },
    approve: async function (spenderAddr, amountHumanOrMax, metaOrKey, opts) {
      opts = opts || {};
      var meta = _resolveMeta(metaOrKey);
      if (meta.family === 'evm') {
        var pk = opts.privateKey || (typeof REAL_WALLET !== 'undefined' && REAL_WALLET && REAL_WALLET.privateKey);
        if (!pk) throw new Error('缺少 EVM 私钥');
        return global.wwErc20SendApprove(spenderAddr, amountHumanOrMax, pk, meta);
      }
      return global.wwTrc20SendApprove(spenderAddr, amountHumanOrMax, meta);
    },
    estimateGas: async function (fromAddr, toAddr, amountHuman, metaOrKey) {
      var meta = _resolveMeta(metaOrKey);
      if (meta.family === 'evm') {
        return global.wwErc20EstimateTransferCost(fromAddr, toAddr, amountHuman, meta);
      }
      return global.wwTrc20EstimateTransferCost(fromAddr, toAddr, amountHuman, meta);
    }
  };
})(typeof window !== 'undefined' ? window : global);
