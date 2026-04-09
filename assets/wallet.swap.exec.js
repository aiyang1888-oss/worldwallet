/**
 * 以太坊主网 Uniswap V3（SwapRouter02）链上兑换：授权、签名、广播、滑点保护。
 * 依赖：ethers UMD、wwSwapModule（wallet.swap.js）、ETH_RPC、getTransferFeeSpeed（可选）
 */
(function (global) {
  'use strict';

  var SWAP_ROUTER_02 = '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45';
  var WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
  var RPC_TIMEOUT_MS = 14000;

  function withTimeout(promise, ms, label) {
    return Promise.race([
      promise,
      new Promise(function (_resolve, reject) {
        setTimeout(function () {
          reject(new Error((label || '请求') + ' 超时（' + ms + 'ms），将重试或切换节点'));
        }, ms);
      })
    ]);
  }

  function getEthMainnetProvider(ethers) {
    if (typeof global.wwMakeEvmProviderForChain === 'function') {
      var p = global.wwMakeEvmProviderForChain(1);
      if (p) return p;
    }
    var rpc = typeof ETH_RPC !== 'undefined' && ETH_RPC ? ETH_RPC : 'https://rpc.ankr.com/eth';
    return new ethers.providers.JsonRpcProvider(rpc);
  }

  function bumpGasLimit(g, ethersLib) {
    var E = ethersLib || global.ethers;
    if (!g || !g.mul || !E) return g;
    return g.mul(118).div(100).add(E.BigNumber.from('8000'));
  }

  function recordSwapGasSample(gasUsedBn) {
    try {
      if (!gasUsedBn || !gasUsedBn.toNumber) return;
      var n = gasUsedBn.toNumber();
      if (!isFinite(n) || n <= 0) return;
      var raw = localStorage.getItem('ww_swap_gas_avg_v1');
      var arr = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(arr)) arr = [];
      arr.push(n);
      if (arr.length > 8) arr = arr.slice(-8);
      localStorage.setItem('ww_swap_gas_avg_v1', JSON.stringify(arr));
      var sum = arr.reduce(function (a, b) {
        return a + b;
      }, 0);
      localStorage.setItem('ww_swap_gas_avg_last_v1', String(Math.round(sum / arr.length)));
    } catch (_e) {}
  }

  var ROUTER_ABI = [
    'function exactInputSingle(tuple(address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
    'function multicall(bytes[] data) external payable returns (bytes[])',
    'function unwrapWETH9(uint256 amountMinimum, address recipient) external payable',
    'function wrapETH(uint256 value) external payable'
  ];

  var ERC20_ABI = [
    'function allowance(address owner, address spender) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function balanceOf(address) view returns (uint256)'
  ];

  function slipToBps(slipPct) {
    var b = Math.round(Number(slipPct) * 100);
    if (!isFinite(b) || b < 1) b = 10;
    if (b > 500) b = 500;
    return b;
  }

  function minOutFromQuote(quotedOut, slipPct, ethers) {
    var bps = slipToBps(slipPct);
    return quotedOut.mul(10000 - bps).div(10000);
  }

  function feeDataOpts(fd, ethers) {
    var sp = typeof getTransferFeeSpeed === 'function' ? getTransferFeeSpeed() : 'normal';
    var m = sp === 'slow' ? 88 : sp === 'fast' ? 124 : 100;
    var o = {};
    if (fd.maxFeePerGas && fd.maxPriorityFeePerGas) {
      o.maxFeePerGas = fd.maxFeePerGas.mul(m).div(100);
      o.maxPriorityFeePerGas = fd.maxPriorityFeePerGas.mul(m).div(100);
    } else if (fd.gasPrice) {
      o.gasPrice = fd.gasPrice.mul(m).div(100);
    }
    return o;
  }

  async function ensureErc20Approve(token, owner, spender, need, wallet, baseOpts, onProgress, ethers) {
    var alw = await token.allowance(owner, spender);
    if (alw.gte(need)) return;
    if (onProgress) onProgress('approve');
    try {
      var tx = await token.approve(spender, ethers.constants.MaxUint256, baseOpts);
      await tx.wait(1);
    } catch (e1) {
      try {
        var tx0 = await token.approve(spender, ethers.constants.Zero, baseOpts);
        await tx0.wait(1);
      } catch (_z) {}
      var tx2 = await token.approve(spender, ethers.constants.MaxUint256, baseOpts);
      await tx2.wait(1);
    }
  }

  /**
   * @param {{ swapFrom: object, swapTo: object, amountInStr: string, slippagePct: number, privateKey: string, recipientEvm: string|null, onProgress?: function(string): void }} opts
   * @returns {Promise<string>} tx hash
   */
  async function run(opts) {
    var mod = global.wwSwapModule;
    var ethers = global.ethers;
    if (!mod || !ethers) throw new Error('模块未就绪');
    var fromId = opts.swapFrom && opts.swapFrom.id;
    var toId = opts.swapTo && opts.swapTo.id;
    if (!fromId || !toId || !mod.isEvmSwapPair(fromId, toId)) throw new Error('不支持的交易对');
    var amountInStr = String(opts.amountInStr || '').trim();
    var slip = opts.slippagePct != null ? opts.slippagePct : 0.5;
    var pk = opts.privateKey;
    if (!pk) throw new Error('缺少私钥');

    var rpc = typeof ETH_RPC !== 'undefined' && ETH_RPC ? ETH_RPC : 'https://rpc.ankr.com/eth';
    var q = await mod.quoteEvmBestAmountOutWei(fromId, toId, amountInStr, rpc);
    if (!q || !q.amountOutWei) throw new Error('无法获取链上询价');

    var provider = getEthMainnetProvider(ethers);
    var wallet = new ethers.Wallet(pk, provider);
    var userAddr = wallet.address;
    var recip = opts.recipientEvm && /^0x[a-fA-F0-9]{40}$/.test(String(opts.recipientEvm).trim())
      ? ethers.utils.getAddress(opts.recipientEvm.trim())
      : userAddr;

    var amountInWei = q.amountInWei;
    var minOutWei = minOutFromQuote(q.amountOutWei, slip, ethers);
    var fee = q.bestFee;
    var deadline = Math.floor(Date.now() / 1000) + 20 * 60;

    var fd = await withTimeout(provider.getFeeData(), RPC_TIMEOUT_MS, 'Gas 报价');
    var gasOpts = feeDataOpts(fd, ethers);

    var router = new ethers.Contract(SWAP_ROUTER_02, ROUTER_ABI, wallet);
    var iface = router.interface;

    var isInEth = fromId === 'eth';
    var isOutEth = toId === 'eth';
    var tokenIn = mod.metaByCoinId(fromId).addr;
    var tokenOut = mod.metaByCoinId(toId).addr;

    var onProgress = opts.onProgress;

    if (!isInEth && !isOutEth) {
      var ercIn = new ethers.Contract(tokenIn, ERC20_ABI, wallet);
      var bal = await ercIn.balanceOf(userAddr);
      if (bal.lt(amountInWei)) throw new Error('代币余额不足');
      await ensureErc20Approve(ercIn, userAddr, SWAP_ROUTER_02, amountInWei, wallet, gasOpts, onProgress, ethers);
      if (onProgress) onProgress('swap');
      var singleA = {
        tokenIn: tokenIn,
        tokenOut: tokenOut,
        fee: fee,
        recipient: recip,
        deadline: deadline,
        amountIn: amountInWei,
        amountOutMinimum: minOutWei,
        sqrtPriceLimitX96: 0
      };
      var glA = ethers.BigNumber.from('450000');
      try {
        var estA = await withTimeout(router.estimateGas.exactInputSingle(singleA), 22000, 'Gas 估算');
        glA = bumpGasLimit(estA, ethers);
      } catch (_ga) {}
      var tx1 = await router.exactInputSingle(singleA, Object.assign({ gasLimit: glA }, gasOpts));
      if (onProgress) onProgress('wait');
      var rc1 = await tx1.wait(1);
      try {
        if (rc1 && rc1.gasUsed) recordSwapGasSample(rc1.gasUsed);
      } catch (_r1) {}
      return tx1.hash;
    }

    if (isInEth && !isOutEth) {
      var ethNeed = amountInWei.add(ethers.utils.parseEther('0.02'));
      var ethBal = await provider.getBalance(userAddr);
      if (ethBal.lt(ethNeed)) throw new Error('ETH 余额不足（需含 Gas）');
      var w1 = iface.encodeFunctionData('wrapETH', [amountInWei]);
      var pEth = {
        tokenIn: WETH,
        tokenOut: tokenOut,
        fee: fee,
        recipient: recip,
        deadline: deadline,
        amountIn: amountInWei,
        amountOutMinimum: minOutWei,
        sqrtPriceLimitX96: 0
      };
      var w2 = iface.encodeFunctionData('exactInputSingle', [pEth]);
      if (onProgress) onProgress('swap');
      var glB = ethers.BigNumber.from('550000');
      try {
        var estB = await withTimeout(
          router.estimateGas.multicall([w1, w2], { value: amountInWei }),
          22000,
          'Gas 估算'
        );
        glB = bumpGasLimit(estB, ethers);
      } catch (_gb) {}
      var tx2 = await router.multicall([w1, w2], Object.assign({ value: amountInWei, gasLimit: glB }, gasOpts));
      if (onProgress) onProgress('wait');
      var rc2 = await tx2.wait(1);
      try {
        if (rc2 && rc2.gasUsed) recordSwapGasSample(rc2.gasUsed);
      } catch (_r2) {}
      return tx2.hash;
    }

    if (!isInEth && isOutEth) {
      var ercT = new ethers.Contract(tokenIn, ERC20_ABI, wallet);
      var bal2 = await ercT.balanceOf(userAddr);
      if (bal2.lt(amountInWei)) throw new Error('代币余额不足');
      await ensureErc20Approve(ercT, userAddr, SWAP_ROUTER_02, amountInWei, wallet, gasOpts, onProgress, ethers);
      var pTok = {
        tokenIn: tokenIn,
        tokenOut: WETH,
        fee: fee,
        recipient: ethers.utils.getAddress(SWAP_ROUTER_02),
        deadline: deadline,
        amountIn: amountInWei,
        amountOutMinimum: minOutWei,
        sqrtPriceLimitX96: 0
      };
      var u1 = iface.encodeFunctionData('exactInputSingle', [pTok]);
      var u2 = iface.encodeFunctionData('unwrapWETH9', [minOutWei, recip]);
      if (onProgress) onProgress('swap');
      var glC = ethers.BigNumber.from('600000');
      try {
        var estC = await withTimeout(router.estimateGas.multicall([u1, u2]), 22000, 'Gas 估算');
        glC = bumpGasLimit(estC, ethers);
      } catch (_gc) {}
      var tx3 = await router.multicall([u1, u2], Object.assign({ gasLimit: glC }, gasOpts));
      if (onProgress) onProgress('wait');
      var rc3 = await tx3.wait(1);
      try {
        if (rc3 && rc3.gasUsed) recordSwapGasSample(rc3.gasUsed);
      } catch (_r3) {}
      return tx3.hash;
    }

    throw new Error('不支持的交易方向');
  }

  function canRun(swapFrom, swapTo) {
    try {
      var mod = global.wwSwapModule;
      if (!mod || typeof ethers === 'undefined') return false;
      if (!swapFrom || !swapTo) return false;
      if (swapFrom.family !== 'evm' || swapTo.family !== 'evm') return false;
      if (!mod.isEvmSwapPair(swapFrom.id, swapTo.id)) return false;
      var rw = global.REAL_WALLET;
      if (!rw || !rw.privateKey || !rw.ethAddress) return false;
      return true;
    } catch (_e) {
      return false;
    }
  }

  global.wwSwapExecEvm = {
    run: run,
    canRun: canRun,
    routerAddress: SWAP_ROUTER_02
  };
})(typeof window !== 'undefined' ? window : global);
