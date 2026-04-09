/**
 * WorldWallet Core API
 * 纯逻辑层 — 不碰 DOM，不碰 localStorage
 * 
 * 核心函数：
 *   createWallet(wordCount)   → 生成新钱包
 *   importWallet(mnemonic)    → 导入钱包
 *   deriveAddress(mnemonic)   → 派生地址
 *   getBalance(addresses)     → 查询余额
 *   sendTx(chain, to, amount, privateKey) → 发送交易
 */

// ── 配置（TRON_GRID / ETH_RPC 由 js/api-config.js 注入，缺省时兜底）──
if (typeof TRON_GRID === 'undefined') var TRON_GRID = 'https://api.trongrid.io';
if (typeof ETH_RPC === 'undefined') var ETH_RPC = 'https://rpc.ankr.com/eth';
var USDT_TRC20 = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
var ENTROPY_MAP = { 12: 16, 15: 20, 18: 24, 21: 28, 24: 32 };
var DERIVE_PATHS = {
  eth: "m/44'/60'/0'/0/0",
  trx: "m/44'/195'/0'/0/0",
  btc: "m/44'/0'/0'/0/0"
};

/** Base58 字母表（与 Bitcoin / Tron 一致） */
var WW_TRX_B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/**
 * 任意字节缓冲区 → Base58（含前导 0x00 → 多个首字符）。
 */
function wwBase58EncodeBytes(input) {
  var bytes = ethers.utils.arrayify(input);
  if (!bytes.length) return '';
  var digits = [0];
  var i;
  var j;
  var carry;
  for (i = 0; i < bytes.length; i++) {
    carry = bytes[i];
    for (j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  var string = '';
  for (var k = 0; k < bytes.length && bytes[k] === 0; k++) {
    string += WW_TRX_B58[0];
  }
  for (var q = digits.length - 1; q >= 0; q--) {
    string += WW_TRX_B58[digits[q]];
  }
  return string;
}

/**
 * 无 TronWeb 时：ETH 格式 20 字节公钥哈希 + Tron 主网前缀 0x41 → Base58Check，与 TronWeb.address.fromHex('41'+hex) 一致。
 * 旧实现用 T+十六进制切片，含字符 0、长度错误，转账页正则判为「地址有误」。
 */
function wwTrxBase58FromEthAddressHex(ethAddr0x) {
  try {
    var h = String(ethAddr0x || '').replace(/^0x/i, '');
    if (h.length !== 40) return '';
    var payload = ethers.utils.arrayify('0x41' + h);
    var hash2 = ethers.utils.sha256(ethers.utils.sha256(payload));
    var chk = ethers.utils.arrayify(hash2).slice(0, 4);
    var full = ethers.utils.concat([payload, chk]);
    return wwBase58EncodeBytes(full);
  } catch (_e) {
    return '';
  }
}

/**
 * 生成新钱包
 * @param {number} wordCount - 助记词词数 (12/15/18/21/24)
 * @returns {Promise<{mnemonic:string, eth:object, trx:object, btc:object}>}
 */
async function createWallet(wordCount) {
  wordCount = wordCount || 12;
  if (!ENTROPY_MAP[wordCount]) {
    throw new Error('无效的助记词词数，请使用 12 / 15 / 18 / 21 / 24');
  }
  var bytes = ENTROPY_MAP[wordCount];
  var mnemonic = ethers.utils.entropyToMnemonic(
    ethers.utils.randomBytes(bytes)
  );
  var addresses = deriveAddress(mnemonic);
  return {
    mnemonic: mnemonic,
    wordCount: wordCount,
    eth: addresses.eth,
    trx: addresses.trx,
    btc: addresses.btc,
    createdAt: Date.now()
  };
}

/**
 * 导入钱包（从助记词恢复）
 * @param {string} mnemonic - BIP39 助记词
 * @returns {{mnemonic:string, eth:object, trx:object, btc:object}|null}
 */
function importWallet(mnemonic) {
  try {
    mnemonic = mnemonic.trim().replace(/\s+/g, ' ');
    // 验证助记词有效性
    ethers.utils.HDNode.fromMnemonic(mnemonic);
    var addresses = deriveAddress(mnemonic);
    return {
      mnemonic: mnemonic,
      wordCount: mnemonic.split(' ').length,
      eth: addresses.eth,
      trx: addresses.trx,
      btc: addresses.btc,
      createdAt: Date.now()
    };
  } catch (e) {
    console.error('[importWallet]', e.message);
    return null;
  }
}

/**
 * 从助记词派生多链地址
 * @param {string} mnemonic - BIP39 助记词
 * @returns {{eth:{address,privateKey}, trx:{address,privateKey}, btc:{address,privateKey}}}
 */
function deriveAddress(mnemonic) {
  var ethWallet = ethers.Wallet.fromMnemonic(mnemonic, DERIVE_PATHS.eth);
  var trxWallet = ethers.Wallet.fromMnemonic(mnemonic, DERIVE_PATHS.trx);
  var btcWallet = ethers.Wallet.fromMnemonic(mnemonic, DERIVE_PATHS.btc);

  // TRX：优先 TronWeb；否则本地 Base58Check（勿再用 T+hex 伪地址，否则转账校验失败）
  var trxAddr = '';
  try {
    if (typeof TronWeb !== 'undefined' && TronWeb.address && TronWeb.address.fromHex) {
      trxAddr = TronWeb.address.fromHex('41' + trxWallet.address.slice(2));
    }
  } catch (e) { void e; }
  if (!trxAddr) trxAddr = wwTrxBase58FromEthAddressHex(trxWallet.address);

  var btcAddr = '';
  try {
    if (typeof wwDeriveBtcNativeSegwitAddress === 'function') btcAddr = wwDeriveBtcNativeSegwitAddress(mnemonic);
  } catch (e) { void e; }
  if (!btcAddr) btcAddr = btcWallet.address;

  return {
    eth: { address: ethWallet.address, privateKey: ethWallet.privateKey },
    trx: { address: trxAddr, privateKey: trxWallet.privateKey },
    btc: { address: btcAddr, privateKey: btcWallet.privateKey }
  };
}

/**
 * 查询多链余额
 * @param {{eth:string, trx:string}} addresses - 地址
 * @returns {Promise<{eth:number, trx:number, usdt:number, btc:number, totalUsd:number}>}
 */
async function getBalance(addresses) {
  var result = { eth: 0, trx: 0, usdt: 0, btc: 0, totalUsd: 0 };
  var prices = { eth: 0, trx: 0, btc: 0 };

  try {
    // 并发查询价格和余额
    var trxUrl = TRON_GRID + '/v1/accounts/' + encodeURIComponent(addresses.trx || '');
    var trxFetch = typeof wwFetchRetry === 'function'
      ? wwFetchRetry(trxUrl, { method: 'GET' })
      : fetch(trxUrl);
    var [priceData, trxData] = await Promise.all([
      fetch('https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD')
        .then(function(r) { return r.json(); }).catch(function() { return {}; }),
      trxFetch
        .then(function(r) { if (!r || !r.ok) return {}; return r.json(); }).catch(function() { return {}; })
    ]);

    // 价格
    if (priceData && priceData.USD) prices.eth = priceData.USD;

    // TRX 余额
    if (trxData && trxData.data && trxData.data[0]) {
      var acct = trxData.data[0];
      result.trx = (acct.balance || 0) / 1e6;
      // USDT TRC20
      var trc20 = acct.trc20 || [];
      trc20.forEach(function(t) {
        if (Object.keys(t)[0] === USDT_TRC20) {
          result.usdt = parseInt(Object.values(t)[0]) / 1e6;
        }
      });
    }

    // ETH 余额
    try {
      var provider = typeof wwGetEthProvider === 'function' ? wwGetEthProvider() : new ethers.providers.JsonRpcProvider(ETH_RPC);
      if (!provider) throw new Error('no eth provider');
      var ethBal = await provider.getBalance(addresses.eth);
      result.eth = parseFloat(ethers.utils.formatEther(ethBal));
    } catch (e) { void e; }

    // 总 USD
    result.totalUsd =
      result.usdt +
      result.trx * (prices.trx || 0.25) +
      result.eth * prices.eth +
      result.btc * (prices.btc || 60000);

  } catch (e) {
    console.error('[getBalance]', e.message);
  }
  return result;
}

/**
 * 发送交易
 * @param {string} chain - 'trx'|'eth'|'usdt_trc20'
 * @param {string} to - 目标地址
 * @param {number} amount - 金额
 * @param {string} privateKey - 私钥
 * @returns {Promise<{txHash:string}|{error:string}>}
 */
async function sendTx(chain, to, amount, privateKey) {
  try {
    if (chain === 'trx') {
      return await _sendTRX(to, amount, privateKey);
    } else if (chain === 'eth') {
      return await _sendETH(to, amount, privateKey);
    } else if (chain === 'usdt_trc20') {
      return await _sendUSDT(to, amount, privateKey);
    }
    return { error: '不支持的链: ' + chain };
  } catch (e) {
    return { error: e.message || '转账失败' };
  }
}

// ── 内部转账实现 ──

async function _sendTRX(to, amount, privateKey) {
  await _loadTronWeb();
  var pk = privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey;
  var tw = new TronWeb(typeof wwTronWebOptions === 'function' ? wwTronWebOptions() : { fullHost: TRON_GRID });
  tw.setPrivateKey(pk);
  var sun = Math.floor(amount * 1e6);
  var from = tw.address.fromPrivateKey(pk);
  var tx = await tw.transactionBuilder.sendTrx(to, sun, from);
  var signed = await tw.trx.sign(tx);
  var result = await tw.trx.sendRawTransaction(signed);
  if (result.result) return { txHash: result.txid };
  throw new Error(result.message || 'TRX 广播失败');
}

async function _sendETH(to, amount, privateKey) {
  var provider = typeof wwGetEthProvider === 'function' ? wwGetEthProvider() : new ethers.providers.JsonRpcProvider(ETH_RPC);
  var wallet = new ethers.Wallet(privateKey, provider);
  var tx = await wallet.sendTransaction({
    to: to,
    value: ethers.utils.parseEther(amount.toString()),
    gasLimit: 21000
  });
  return { txHash: tx.hash };
}

async function _sendUSDT(to, amount, privateKey) {
  await _loadTronWeb();
  var pk = privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey;
  var tw = new TronWeb(typeof wwTronWebOptions === 'function' ? wwTronWebOptions() : { fullHost: TRON_GRID });
  tw.setPrivateKey(pk);
  var sun = Math.floor(amount * 1e6);
  var from = tw.address.fromPrivateKey(pk);
  var tx = await tw.transactionBuilder.triggerSmartContract(
    USDT_TRC20, 'transfer(address,uint256)',
    { feeLimit: 20000000 },
    [{ type: 'address', value: to }, { type: 'uint256', value: sun }],
    from
  );
  var signed = await tw.trx.sign(tx.transaction);
  var result = await tw.trx.sendRawTransaction(signed);
  if (result.result) return { txHash: result.txid };
  throw new Error(result.message || 'USDT 广播失败');
}

// ── 工具 ──

var _tronWebLoaded = false;
function _loadTronWeb() {
  return new Promise(function(resolve) {
    if (typeof TronWeb !== 'undefined') { resolve(); return; }
    if (_tronWebLoaded) { resolve(); return; }
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/tronweb@5.3.2/dist/TronWeb.js';
    s.onload = function() { _tronWebLoaded = true; resolve(); };
    document.head.appendChild(s);
  });
}
