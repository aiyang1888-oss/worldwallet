// wallet.core.js — 钱包核心：创建/加密/存储/派生

/**
 * 助记词与链上地址关系（产品规则，实现须一致）：
 * 1) 一套 BIP39 英文助记词 → 唯一一套 TRX/ETH/BTC 派生地址（createWallet / import 同源）。
 * 2) 使用过程中仅修改「万语」展示串、前后缀或收款 UI，不改变已保存助记词与链上地址（见 wallet.addr.js，与 ww_wallet 分存）。
 * 3) 用户重新生成助记词（新熵、或密钥页切换词数得到新助记词）→ 必须对应新的一套地址；旧钱包须显式清除/导入切换。
 * 4) 助记词验证通过并写入 REAL_WALLET 后，本机以该助记词为真源贯穿备份/转账/解锁流程，不应在后台静默替换。
 */

/** 全局钱包状态；与 wallet.runtime.js 共用，勿在 wallet.ui.js 重复声明 */
var REAL_WALLET = null;
/** TRX 公链展示地址；wallet.addr.js 早于 runtime 加载，须在 core 声明并由 loadWallet 同步 */
var CHAIN_ADDR = '--';

/**
 * 用户可见错误文案（不直接拼接未知对象）
 * @param {*} err
 * @param {string} [fallbackMsg]
 */
function wwFmtUserError(err, fallbackMsg) {
  var fb = fallbackMsg != null && String(fallbackMsg).trim() ? String(fallbackMsg).trim() : '操作失败';
  try {
    if (err == null || err === '') return fb;
    if (typeof err === 'string') {
      var ts = err.trim();
      return ts || fb;
    }
    if (typeof err === 'number' && isFinite(err)) return String(err);
    var eo = err;
    var m =
      eo &&
      (eo.message ||
        eo.reason ||
        eo.shortMessage ||
        (eo.error && eo.error.message));
    if (m && String(m).trim()) return String(m).trim();
  } catch (_wrap) { void _wrap; }
  return fb;
}

/**
 * 结构化日志：优先 safeLog（若已加载）；否则 console。
 * @param {string} [level] debug|info|warn|error
 */
function wwLog(level) {
  var args = Array.prototype.slice.call(arguments, 1);
  var tag = '[' + (level || 'log') + ']';
  try {
    if (typeof safeLog === 'function') {
      safeLog.apply(null, [tag].concat(args));
      return;
    }
  } catch (_sl) { void _sl; }
  try {
    var fn = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
    if (typeof console !== 'undefined' && typeof console[fn] === 'function') {
      console[fn].apply(console, args.length ? [tag].concat(args) : [tag]);
    }
  } catch (_cl) { void _cl; }
}

/**
 * 预期可忽略的 catch：默认静默；localStorage.WW_DEBUG=1 时经 wwLog 输出
 */
function wwQuiet(e, hint) {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('WW_DEBUG') === '1') {
      wwLog('debug', hint || 'catch', e);
    }
  } catch (_q) { void _q; }
}

try {
  if (typeof window !== 'undefined') {
    window.wwFmtUserError = wwFmtUserError;
    window.wwLog = wwLog;
    window.wwQuiet = wwQuiet;
  }
} catch (_wwGlob) { void _wwGlob; }

/**
 * 简单 ETH 原生转账：在 estimateGas 上加余量，降低主网波动导致的 gas 不足
 */
function wwBumpEvmNativeGasLimit(est, ethersLib) {
  var E = ethersLib || (typeof ethers !== 'undefined' ? ethers : null);
  if (!E || !E.BigNumber || !est || !est.mul) return est;
  try {
    return est.mul(130).div(100).add(E.BigNumber.from('28000'));
  } catch (_b) {
    try {
      return est.mul(120).div(100);
    } catch (_b2) {
      return est;
    }
  }
}

function loadWalletPublic() {
  try {
    var d = localStorage.getItem('ww_wallet');
    if (d) {
      var parsed = JSON.parse(d);
      // 与 eth/trx 一致使用 btcAddress；兼容旧键名 btcAddr
      var btcPub = parsed.btcAddress || parsed.btcAddr || '';
      // 只加载公开信息，不加载敏感数据
      window.REAL_WALLET = {
        ethAddress: parsed.ethAddress,
        trxAddress: parsed.trxAddress,
        btcAddress: btcPub,
        createdAt: parsed.createdAt,
        backedUp: parsed.backedUp || false,
        hasEncrypted: !!parsed.encrypted
      };
      REAL_WALLET = window.REAL_WALLET;
      CHAIN_ADDR = (REAL_WALLET && REAL_WALLET.trxAddress) ? REAL_WALLET.trxAddress : '--';
    }
  } catch (e) {
    console.error('[loadWalletPublic] error:', e);
  }
}


/** 会话级 AES 密钥（仅内存，用于加密 REAL_WALLET 内敏感字段） */
var _wwSessionSk = null;

async function wwEnsureSessionSk() {
  if (_wwSessionSk) return _wwSessionSk;
  _wwSessionSk = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  return _wwSessionSk;
}

/**
 * 将助记词/私钥加密为 _wwSes，并清除明文引用（降低内存中常驻明文字符串）
 */
async function wwSealWalletSensitive() {
  if (typeof REAL_WALLET === 'undefined' || !REAL_WALLET) return;
  var w = REAL_WALLET;
  var hasPlain =
    !!(w && (w.privateKey || w.trxPrivateKey || w.mnemonic || w.enMnemonic ||
      (w.words && (Array.isArray(w.words) ? w.words.length : w.words))));
  if (!hasPlain) return;
  try {
    await wwEnsureSessionSk();
    var enc = new TextEncoder();
    var payload = JSON.stringify({
      privateKey: w.privateKey || '',
      trxPrivateKey: w.trxPrivateKey || '',
      mnemonic: w.mnemonic || '',
      enMnemonic: w.enMnemonic || '',
      words: w.words || null
    });
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var ct = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      _wwSessionSk,
      enc.encode(payload)
    );
    w._wwSes = {
      v: 1,
      iv: btoa(String.fromCharCode.apply(null, Array.from(iv))),
      d: btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(ct))))
    };
    w.privateKey = null;
    w.trxPrivateKey = null;
    w.mnemonic = null;
    w.enMnemonic = null;
    w.words = null;
  } catch (e) {
    console.error('[wwSealWalletSensitive]', e);
  }
}

async function wwUnsealWalletSensitive() {
  if (typeof REAL_WALLET === 'undefined' || !REAL_WALLET) return;
  var w = REAL_WALLET;
  if (!w._wwSes) return;
  if (w.privateKey || w.trxPrivateKey || w.mnemonic) return;
  try {
    await wwEnsureSessionSk();
    var b = w._wwSes;
    var iv = typeof wwB64StdToUint8Array === 'function' ? wwB64StdToUint8Array(b.iv) : null;
    var data = typeof wwB64StdToUint8Array === 'function' ? wwB64StdToUint8Array(b.d) : null;
    if (!iv || !data) throw new Error('bad session blob');
    var pt = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      _wwSessionSk,
      data
    );
    var obj = JSON.parse(new TextDecoder().decode(pt));
    w.privateKey = obj.privateKey || null;
    w.trxPrivateKey = obj.trxPrivateKey || null;
    w.mnemonic = obj.mnemonic || null;
    w.enMnemonic = obj.enMnemonic || null;
    w.words = obj.words || null;
    try {
      if (typeof wwUpgradeStoredBtcAddressIfLegacy === 'function') wwUpgradeStoredBtcAddressIfLegacy();
    } catch (_btc) { wwQuiet(_btc); }
  } catch (e) {
    console.error('[wwUnsealWalletSensitive]', e);
  }
}

async function wwWithWalletSensitive(fn) {
  await wwUnsealWalletSensitive();
  try {
    return await fn();
  } finally {
    await wwSealWalletSensitive();
  }
}

function wwClearSessionSecretState() {
  _wwSessionSk = null;
  try {
    if (typeof REAL_WALLET !== 'undefined' && REAL_WALLET && REAL_WALLET._wwSes) {
      delete REAL_WALLET._wwSes;
    }
  } catch (e) { wwQuiet(e); }
}


function loadWallet() {
  loadWalletPublic();
  try {
    if (typeof wwUpgradeStoredBtcAddressIfLegacy === 'function') wwUpgradeStoredBtcAddressIfLegacy();
  } catch (_btcUp) { wwQuiet(_btcUp); }
  // 万语地址：先于其他 UI，统一从 localStorage 载入 ADDR_WORDS 并一次性刷新各展示位
  try {
    if (typeof ensureNativeAddrInitialized === 'function') ensureNativeAddrInitialized();
  } catch (_na) { wwQuiet(_na); }
  try {
    if (typeof updateAddr === 'function') updateAddr();
  } catch (_ua) { wwQuiet(_ua); }
  /* ww-addr-pending 须由 wallet.addr.js 的 renderHomeAddrChip 在写入芯片后再移除；此处若无条件移除会出现「看得见但无字的空胶囊」 */
  if (REAL_WALLET && REAL_WALLET.ethAddress) {
    try { sessionStorage.removeItem('ww_ref_pending'); } catch (_r) { wwQuiet(_r); }
  }
  try { if (typeof updateHomeBackupBanner === 'function') updateHomeBackupBanner(); } catch (_hb) { wwQuiet(_hb); }
  try { if (typeof updateWalletSecurityScoreUI === 'function') updateWalletSecurityScoreUI(); } catch (_ws) { wwQuiet(_ws); }
}

/** 仅公开字段；供 UI 展示与调试，不包含助记词/私钥 */
function getRealWalletPublic() {
  if (!REAL_WALLET) return null;
  return {
    ethAddress: REAL_WALLET.ethAddress,
    trxAddress: REAL_WALLET.trxAddress,
    btcAddress: REAL_WALLET.btcAddress || '',
    createdAt: REAL_WALLET.createdAt,
    backedUp: !!REAL_WALLET.backedUp,
    hasEncrypted: !!REAL_WALLET.hasEncrypted
  };
}
try { window.getRealWalletPublic = getRealWalletPublic; } catch (_g) { wwQuiet(_g); }


/**
 * 恢复/导入钱包：与 core/wallet.js 的 importWallet 一致；REAL_WALLET 仅公开地址；有 PIN 则加密保存。
 */


/**
 * 密钥页「助记词显示语言」→ wordlists 键 wlKey（renderKeyGrid：enWords → 索引 i → WT_WORDLISTS[wlKey][i]）：
 * - en → 标准 BIP39 英文（createWallet：ethers.utils.entropyToMnemonic）；
 * - zh → 2048 个中国行政区划顺延地名（词表源可含长地名；首屏展示在 wallet.ui.js 内规范为同索引唯一短前缀，导入仍认原始长词），与英文 BIP39 按索引一对一；
 * - ja/ko/es/fr/de/it/ru/pt → bitcoinjs/bip39 或 BIPs PR 词表（与英文同索引），懒加载自 wordlists/*.json。
 */
var WW_MNEMONIC_BIP39_LANGS = ['ja', 'ko', 'es', 'fr', 'de', 'it', 'ru', 'pt'];

function getMnemonicWordlistLang(uiLang) {
  if (!uiLang || uiLang === 'en') return 'en';
  if (uiLang === 'zh') return 'zh';
  if (WW_MNEMONIC_BIP39_LANGS.indexOf(uiLang) >= 0) return uiLang;
  try {
    if (typeof WT_WORDLISTS !== 'undefined' && WT_WORDLISTS[uiLang] && WT_WORDLISTS[uiLang].length === 2048) {
      return uiLang;
    }
  } catch (e) { wwQuiet(e); }
  return 'en';
}

/**
 * 标准 BIP39 熵 → 英文助记词为真源；wlKey 为展示用词表（与 keyMnemonicLang 解析结果一致）。
 * @param {string} wlKey en/zh/ja/…
 * @param {number} wordCount 12|15|18|21|24
 */
async function generateMnemonic(wlKey, wordCount) {
  if (typeof ethers === 'undefined') throw new Error('ethers not ready');
  var nWords = parseInt(wordCount, 10) || 12;
  if ([12, 15, 18, 21, 24].indexOf(nWords) < 0) nWords = 12;
  var entropyBytes =
    typeof getEntropyByteCountForMnemonicWords === 'function'
      ? getEntropyByteCountForMnemonicWords(nWords)
      : { 12: 16, 15: 20, 18: 24, 21: 28, 24: 32 }[nWords] || 16;
  var key = wlKey || 'en';
  if (key !== 'en' && typeof wwEnsureWordlistLoaded === 'function') {
    await wwEnsureWordlistLoaded(key);
  }
  var enMnemonic = ethers.utils.entropyToMnemonic(ethers.utils.randomBytes(entropyBytes));
  var enWords = enMnemonic.trim().split(/\s+/).filter(Boolean);
  var words =
    !key || key === 'en'
      ? enWords.slice()
      : typeof wwMapEnWordsToLangWords === 'function'
        ? wwMapEnWordsToLangWords(enWords, key)
        : enWords.slice();
  return {
    enMnemonic: enMnemonic,
    words: words,
    wordCount: nWords,
    mnemonicWordlistKey: key === 'en' ? 'en' : key
  };
}
try {
  window.generateMnemonic = generateMnemonic;
} catch (_gm) { wwQuiet(_gm); }

/**
 * 导入：先按标准英文 BIP39 解析；失败则按所选助记词语言词表转为英文再解析（与密钥页语言一致）；仍失败时再试中文词表（兼容旧数据）。
 */
function importWalletFlexible(raw, preferredLang) {
  var norm = String(raw || '').trim().replace(/\s+/g, ' ');
  if (!norm) return null;
  var r = importWallet(norm);
  if (r) return r;
  if (typeof mnemonicFromLang !== 'function' || !WT_WORDLISTS) return null;
  var pl = preferredLang;
  if (pl === undefined || pl === null) {
    try {
      if (typeof keyMnemonicLang === 'string') pl = keyMnemonicLang;
    } catch (_e) { wwQuiet(_e); }
  }
  function tryLang(lg) {
    if (!lg || lg === 'en' || !WT_WORDLISTS[lg]) return null;
    return importWallet(mnemonicFromLang(norm, lg));
  }
  r = tryLang(pl);
  if (r) return r;
  if (pl !== 'zh') {
    r = tryLang('zh');
    if (r) return r;
  }
  return null;
}


