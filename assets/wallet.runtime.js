/*! WorldToken wallet.runtime.js — split from wallet.html; refactor incrementally. */

var _pin = null;

/** 临时：开发调 UI/后续页面时在 USDT（TRC-20）余额上叠加的虚拟数量；上线前务必改为 0 */
var WW_DEV_VIRTUAL_USDT_BAL = 10000;
try { window.WW_DEV_VIRTUAL_USDT_BAL = WW_DEV_VIRTUAL_USDT_BAL; } catch (_wwd) {}
function wwDevVirtualUsdtActive() {
  return typeof WW_DEV_VIRTUAL_USDT_BAL === 'number' && WW_DEV_VIRTUAL_USDT_BAL !== 0;
}

// 强制清除旧 Service Worker 和缓存（延后到 load + 空闲，减轻首屏主线程与脚本解析竞争）
(function _wwDeferSwCacheCleanup() {
  function run() {
    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function (regs) {
          regs.forEach(function (r) { r.unregister(); });
        });
      }
    } catch (e) {}
    try {
      if (typeof caches !== 'undefined' && caches.keys) {
        caches.keys().then(function (keys) {
          keys.forEach(function (k) { caches.delete(k); });
        });
      }
    } catch (e2) {}
  }
  function schedule() {
    if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 4000 });
    else setTimeout(run, 0);
  }
  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule);
})();

function tapHaptic(ms) {
  try { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(ms === undefined ? 12 : ms); } catch (e) {}
}
document.addEventListener('click', function(ev) {
  var el = ev.target.closest('.tab-item,.quick-btn,#homeCopyAddrBtn,#homeTransferBtn,#balRefreshBtn,.btn-primary,.btn-secondary');
  if (!el) return;
  tapHaptic(12);
}, true);

function parseUsdFromBalanceTxt(txt) {
  if (!txt) return 0;
  var s = String(txt).replace(/\s/g, '');
  var m = s.match(/[\d,.]+/);
  if (!m) return 0;
  var n = parseFloat(m[0].replace(/,/g, ''));
  return isFinite(n) ? n : 0;
}
function cancelHomeBalanceAnim() {
  if (window._homeBalanceAnimRaf) {
    cancelAnimationFrame(window._homeBalanceAnimRaf);
    window._homeBalanceAnimRaf = 0;
  }
}
function animateHomeUsdTo(targetUsd, fmtUsdFn) {
  cancelHomeBalanceAnim();
  var el = document.getElementById('totalBalanceDisplay');
  var from = parseUsdFromBalanceTxt(el ? el.textContent : '');
  if (!isFinite(from)) from = 0;
  var tNum = typeof targetUsd === 'number' ? targetUsd : parseFloat(targetUsd);
  if (!isFinite(tNum)) tNum = 0;
  if (Math.abs(tNum - from) < 0.005) {
    if (el) el.textContent = fmtUsdFn(tNum);
    return;
  }
  var dur = 560;
  var t0 = null;
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function tick(now) {
    if (!t0) t0 = now;
    var p = Math.min(1, (now - t0) / dur);
    var v = from + (targetUsd - from) * easeOutCubic(p);
    if (el) el.textContent = fmtUsdFn(p < 1 ? v : targetUsd);
    if (p < 1) window._homeBalanceAnimRaf = requestAnimationFrame(tick);
    else window._homeBalanceAnimRaf = 0;
  }
  window._homeBalanceAnimRaf = requestAnimationFrame(tick);
}

function loadTronWeb(){return new Promise(r=>{if(window.TronWeb){r();return;}const s=document.createElement('script');s.src='assets/lib/TronWeb.js';s.crossOrigin='anonymous';s.referrerPolicy='no-referrer';s.onload=r;document.head.appendChild(s);});}
var _qrLoadPromise=null;
function loadQRCodeLib(){
  if(typeof QRCode!=='undefined'&&QRCode.toCanvas)return Promise.resolve();
  if(_qrLoadPromise)return _qrLoadPromise;
  _qrLoadPromise=new Promise(function(res,rej){
    var s=document.createElement('script');
    s.src='assets/lib/qrcode.min.js';
    s.async=true;
    s.crossOrigin='anonymous';
    s.referrerPolicy='no-referrer';
    s.onload=function(){res();};
    s.onerror=function(){_qrLoadPromise=null;rej(new Error('qrcode load failed'));};
    document.head.appendChild(s);
  });
  return _qrLoadPromise;
}
function countMnemonicWords(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length;
}
function updateImportWordCount() {
  const badge = document.getElementById('importWordCountBadge');
  if (!badge) return;
  var max = 12;
  var n = 0;
  try {
    var grid = document.getElementById('importGrid');
    if (grid) {
      var iw = grid.querySelectorAll('input[id^="iw_"]');
      var aw = grid.querySelectorAll('.import-word');
      if (iw.length > 0) {
        max = iw.length;
        iw.forEach(function (inp) {
          if (String(inp.value || '').trim()) n++;
        });
      } else if (aw.length > 0) {
        max = aw.length;
        aw.forEach(function (inp) {
          if (String(inp.value || '').trim()) n++;
        });
      } else if (typeof importGridWordCount === 'number' && importGridWordCount > 0) {
        max = importGridWordCount;
      }
    } else if (typeof importGridWordCount === 'number' && importGridWordCount > 0) {
      max = importGridWordCount;
    }
  } catch (_e) {}
  badge.textContent = n + '/' + max;
  try {
    if (n >= max && max > 0) {
      badge.style.color = 'var(--green)';
      badge.style.fontWeight = '600';
    } else {
      badge.style.color = 'var(--gold)';
      badge.style.fontWeight = '';
    }
  } catch (_bc) {}
}
function setWalletCreateStep(n) {
  const steps = document.getElementById('walletCreateSteps');
  const text = document.getElementById('walletLoadingText');
  const labels = ['正在生成钱包…', '1/3 生成密钥', '2/3 派生地址', '3/3 完成'];
  if (text) text.textContent = (n >= 1 && n <= 3) ? labels[n] : labels[0];
  if (!steps) return;
  try { steps.querySelectorAll('[data-step]').forEach(function(el, i) { el.classList.toggle('active', (i + 1) === n); }); } catch (e) {}
}
function showWalletLoading() {
  const el = document.getElementById('walletLoadingOverlay');
  if(el) el.classList.add('show');
  
}
function hideWalletLoading() {
  const el = document.getElementById('walletLoadingOverlay');
  if(el) el.classList.remove('show');
  
}

// LANG_INFO / WW_WORDS_EXTRA / SINGLE_CHARS 由先加载的 wallet.ui.js 声明为 var，此处勿再 const，否则与拆分 bundle 同时加载时报错

/** 与系统语言对齐：navigator.language(s) → LANG_INFO 键，未支持则回退 zh */
function detectDeviceLang() {
  function resolveTag(tag) {
    if (!tag || typeof tag !== 'string') return null;
    const raw = tag.trim().replace(/_/g, '-');
    if (!raw) return null;
    if (LANG_INFO[raw]) return raw;
    const lower = raw.toLowerCase();
    for (const k of Object.keys(LANG_INFO)) {
      if (k.toLowerCase() === lower) return k;
    }
    if (lower === 'zh-cn' || lower.startsWith('zh-hans')) return 'zh';
    if (lower === 'zh-tw' || (lower.includes('hant') && lower.includes('tw'))) return 'zh-TW';
    if (lower === 'zh-hk' || lower === 'zh-mo' || (lower.includes('hant') && lower.includes('hk'))) return 'zh-HK';
    if (lower.startsWith('zh')) return 'zh';
    const base = lower.split('-')[0];
    if (LANG_INFO[base]) return base;
    return null;
  }
  try {
    if (typeof navigator !== 'undefined' && navigator.languages && navigator.languages.length) {
      for (let i = 0; i < navigator.languages.length; i++) {
        const r = resolveTag(navigator.languages[i]);
        if (r) return r;
      }
    }
    if (typeof navigator !== 'undefined' && navigator.language) {
      const r = resolveTag(navigator.language);
      if (r) return r;
    }
  } catch (e) {}
  return 'zh';
}

// ── 万语地址：仅声明 ADDR_WORDS；updateRealAddr / initAddrWords / renderAddrWords / openWordEditor / updateAddr / getNativeAddr / copy* 见先加载的 wallet.addr.js。勿在此重复 function，否则会覆盖 addr 实现。──
const ADDR_WORDS = []; // 10 个字槽，每个 {word, lang, custom}


// ── 真实钱包存储 ──────────────────────────────────────────────
// ═══════════════════════════════════════════════════════
// WorldToken 多语言词库引擎 v2.0
// 每语言 2048 词，索引对应 BIP39，支持双向转换
// ═══════════════════════════════════════════════════════
// WT_WORDLISTS loaded from wordlists.js
// EN_WORD_INDEX / WT_LANG_INDEX 已由 wallet.ui.js 初始化，勿重复 const

/**
 * 英文助记词 → 目标语言助记词
 * @param {string} mnemonic - 标准BIP39英文助记词
 * @param {string} lang - 目标语言
 * @returns {string} 目标语言助记词（空格分隔）
 */
function mnemonicToLang(mnemonic, lang) {
  if (!lang || lang === "en" || !WT_WORDLISTS[lang]) return mnemonic;
  const words = mnemonic.trim().split(/\s+/);
  return words.map(w => {
    const idx = EN_WORD_INDEX[w];
    if (idx === undefined) return w; // 未知词保持原样
    return WT_WORDLISTS[lang][idx] || w;
  }).join(" ");
}

/** 英文 BIP39 词数组 → 当前语言密钥表词条（词数与上方词数选择一致，逐词映射索引） */
function enWordsToLangKeyTableWords(enWords, lang) {
  if (!enWords || !enWords.length) return [];
  if (!lang || lang === 'en') return enWords.slice();
  if (!WT_WORDLISTS[lang]) return enWords.slice();
  return enWords.map(function (w) {
    const idx = EN_WORD_INDEX[w];
    if (idx === undefined) return w;
    return WT_WORDLISTS[lang][idx] || w;
  });
}

/**
 * 任意语言助记词 → 英文BIP39助记词
 * @param {string} mnemonic - 任意语言助记词
 * @param {string} lang - 输入语言
 * @returns {string} 标准英文助记词
 */
function mnemonicFromLang(mnemonic, lang) {
  if (!lang || lang === "en" || !WT_WORDLISTS[lang]) return mnemonic;
  const words = mnemonic.trim().split(/\s+/);
  const langIndex = WT_LANG_INDEX[lang] || {};
  return words.map(w => {
    const idx = langIndex[w];
    if (idx === undefined) return w;
    return WT_WORDLISTS.en[idx] || w;
  }).join(" ");
}

/** _safeEl、currentMnemonicLength、importGridWordCount 由先加载的 wallet.ui.js 声明；此处勿重复 let/const，否则整段 runtime 脚本解析失败 */

/** 会话 PIN（仅存内存）；不导出 wwGetSessionPin/wwSetSessionPin 到全局，仅 wwSessionPinBridge */
(function () {
  var _wwSessionPin = '';
  function getPin() { return _wwSessionPin || ''; }
  function setPin(p) {
    _wwSessionPin = p ? String(p) : '';
    _pin = p ? String(p) : null;
    clearTimeout(window._wwSessionPinTimeout);
    window._wwSessionPinTimeout = setTimeout(function () {
      _wwSessionPin = '';
      _pin = null;
      console.log('[SessionPin] 会话 PIN 已自动清除');
    }, 15 * 60 * 1000);
  }
  function clearPin() {
    clearTimeout(window._wwSessionPinTimeout);
    window._wwSessionPinTimeout = null;
    clearTimeout(window._pinClearTimer);
    window._pinClearTimer = null;
    _wwSessionPin = '';
    _pin = null;
  }
  window.wwSessionPinBridge = { get: getPin, set: setPin, clear: clearPin };
})();

/** 删除钱包或清空本机数据：移除 ww_wallet、PIN 哈希/设备盐、TOTP 等，并清空密钥派生与会话缓存 */
function wwPurgeLocalWalletStorage() {
  try { window.wwSessionPinBridge.clear(); } catch (_e) {}
  var keys = [
    'ww_wallet', 'ww_hongbaos', 'ww_pin', 'ww_pin_hash', 'ww_pin_device_salt_v1',
    'ww_pin_set', 'ww_unlock_pin', 'ww_totp_secret', 'ww_totp_enabled',
    'ww_wallet_nickname', 'ww_ref_install_credited'
  ];
  for (var i = 0; i < keys.length; i++) {
    try { localStorage.removeItem(keys[i]); } catch (_e) {}
  }
  try {
    if (window.wwKeyDerivationCache && typeof window.wwKeyDerivationCache.clear === 'function') window.wwKeyDerivationCache.clear();
  } catch (_e) {}
  try {
    if (window.wwSessionKeyCache && typeof window.wwSessionKeyCache.clear === 'function') window.wwSessionKeyCache.clear();
  } catch (_e) {}
  try { window.REAL_WALLET = null; } catch (_e) {}
  try { REAL_WALLET = null; } catch (_e) {}
  try { if (typeof currentMnemonicLength !== 'undefined') currentMnemonicLength = 12; } catch (_e) {}
}

function wwCleanupMemory() {
  try { if (typeof wwClearSessionSecretState === 'function') wwClearSessionSecretState(); } catch (_cs) {}
  if (REAL_WALLET) {
    REAL_WALLET.privateKey = null;
    REAL_WALLET.trxPrivateKey = null;
    REAL_WALLET.mnemonic = null;
    REAL_WALLET.enMnemonic = null;
    REAL_WALLET.words = null;
    try { delete REAL_WALLET._wwSes; } catch (_wx) {}
  }
  window._wwSessionPin = '';
  _pin = null;
  clearTimeout(window._pinClearTimer);
  window._pinClearTimer = null;
  window._wwTotpPendingSecret = null;
  window._wwLastActivityTs = null;
  window._wwLastPortfolioParts = null;
  window._wwLastPortfolioTotal = null;
  window._wwUnlockPreservePage = false;
  window._wwForceIdleLock = false;
  window._wwTxHistoryCache = null;
  clearTimeout(window._wwSessionPinTimeout);
  clearTimeout(window._wwIdleLockTimer);
}

function wwCleanupStorage() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.includes('_temp') || key.includes('_pending'))) {
        try { localStorage.removeItem(key); } catch (e) {}
      }
    }
  } catch (e) {}
}

document.addEventListener('visibilitychange', function() {
  if (document.hidden) {
    try { window.wwSessionPinBridge.clear(); } catch (_v0) {}
    try { if (typeof wwClearSessionSecretState === 'function') wwClearSessionSecretState(); } catch (_v1) {}
    if (REAL_WALLET) {
      REAL_WALLET.privateKey = null;
      REAL_WALLET.trxPrivateKey = null;
      REAL_WALLET.mnemonic = null;
      try { delete REAL_WALLET._wwSes; } catch (_v2) {}
    }
  }
});

window.addEventListener('beforeunload', function() {
  try { window.wwSessionPinBridge.clear(); } catch (_bu) {}
  wwCleanupMemory();
  try { wwCleanupStorage(); } catch (_wcs) {}
  try { sessionStorage.clear(); } catch (e) {}
});

/** 是否已配置 PIN（hash、迁移标志，或尚未迁移的 6 位明文） */
function wwHasPinConfigured() {
  try {
    if (localStorage.getItem('ww_pin_hash')) return true;
    if (localStorage.getItem('ww_pin_set') === '1') return true;
    var p = '';
    if (typeof Store !== 'undefined' && Store.getPin) p = Store.getPin();
    else {
      p = (_pin || '') || localStorage.getItem('ww_unlock_pin') || '';
    }
    return !!(p && /^\d{6}$/.test(String(p)));
  } catch (e) { return false; }
}
(function wwMigratePlainPinToHashOnce() {
  if (typeof savePinSecure !== 'function') return;
  try {
    if (localStorage.getItem('ww_pin_hash')) return;
    var plain = localStorage.getItem('ww_unlock_pin') || (_pin || '');
    if (!plain || !/^\d{6}$/.test(String(plain))) return;
    savePinSecure(plain).then(function() {
      try { window.wwSessionPinBridge.set(plain); } catch (_s0) {}
      try { localStorage.setItem('ww_pin_set', '1'); } catch (e) {}
    }).catch(function(e) { console.warn('[PIN migrate]', e); });
  } catch (e) {}
})();

// ⚠️ 注意：私钥存储于 localStorage，仅供演示，生产环境应加密
// ── 钱包加密存储模块 ───────────────────────────────────────────

/**
 * 从 PIN 派生 AES-GCM 密钥
 * @param {string} pin - 用户 PIN
 * @param {Uint8Array} salt - 16字节盐
 * @returns {Promise<CryptoKey>}
 */
async function deriveKeyFromPin(pin, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * AES-GCM 加密
 * @param {string} plaintext - 明文 JSON 字符串
 * @param {string} pin - 用户 PIN
 * @returns {Promise<{salt:string, iv:string, data:string}>} Base64 编码
 */
async function encryptWithPin(plaintext, pin) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKeyFromPin(pin, salt);
  const enc = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext)
  );
  return {
    salt: btoa(String.fromCharCode(...salt)),
    iv: btoa(String.fromCharCode(...iv)),
    data: btoa(String.fromCharCode(...new Uint8Array(encrypted)))
  };
}

/**
 * AES-GCM 解密
 * @param {{salt:string, iv:string, data:string}} bundle - 加密包
 * @param {string} pin - 用户 PIN
 * @returns {Promise<string>} 解密后的明文
 */
async function decryptWithPin(bundle, pin) {
  var b642 = typeof wwB64StdToUint8Array === 'function' ? wwB64StdToUint8Array : null;
  const salt = b642 ? b642(bundle.salt) : null;
  const iv = b642 ? b642(bundle.iv) : null;
  const data = b642 ? b642(bundle.data) : null;
  if (!salt || !iv || !data) throw new Error('Invalid encrypted payload');
  const key = await deriveKeyFromPin(pin, salt);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv }, key, data
  );
  return new TextDecoder().decode(decrypted);
}

async function encryptTotpSecret(sec, pin) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKeyFromPin(pin, salt);
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(sec)
  );
  const data = {
    v: 1,
    s: btoa(String.fromCharCode(...salt)),
    iv: btoa(String.fromCharCode(...iv)),
    c: btoa(String.fromCharCode(...new Uint8Array(ciphertext)))
  };
  return JSON.stringify(data);
}

async function decryptTotpSecret(encrypted, pin) {
  try {
    const data = JSON.parse(encrypted);
    var b642 = typeof wwB64StdToUint8Array === 'function' ? wwB64StdToUint8Array : null;
    const salt = b642 ? b642(data.s) : null;
    const iv = b642 ? b642(data.iv) : null;
    const ct = b642 ? b642(data.c) : null;
    if (!salt || !iv || !ct) return null;
    const key = await deriveKeyFromPin(pin, salt);
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      ct
    );
    return new TextDecoder().decode(plaintext);
  } catch (e) {
    console.error('[TOTP decrypt failed]', e);
    return null;
  }
}

/**
 * 保存钱包（敏感数据加密）
 * @param {object} w - 完整钱包对象
 * @param {string} pin - 用户 PIN（无 PIN 则不存敏感数据）
 */
async function saveWalletSecure(w, pin) {
  try {
    // 公开信息（始终明文存储）
    var safe = {
      ethAddress: w.ethAddress,
      trxAddress: w.trxAddress,
      btcAddress: w.btcAddress || '',
      createdAt: w.createdAt,
      backedUp: w.backedUp || false
    };
    // 有 PIN → 加密敏感数据
    if (pin) {
      var sensitive = JSON.stringify({
        mnemonic: w.mnemonic,
        enMnemonic: w.enMnemonic || w.mnemonic,
        words: w.words,
        privateKey: w.privateKey,
        trxPrivateKey: w.trxPrivateKey
      });
      safe.encrypted = await encryptWithPin(sensitive, pin);
    }
    localStorage.setItem('ww_wallet', JSON.stringify(safe));
  } catch (e) {
    console.error('[saveWalletSecure] error:', e);
  }
}

/* loadWalletPublic 定义在 wallet.core.js（同步 REAL_WALLET / CHAIN_ADDR）；勿在此重复声明 */

/**
 * 解密敏感数据（需要时调用，用完清除）
 * @param {string} pin - 用户 PIN
 * @returns {Promise<{mnemonic,enMnemonic,privateKey,trxPrivateKey}|null>}
 */
async function decryptSensitive(pin) {
  try {
    var d = localStorage.getItem('ww_wallet');
    if (!d) return null;
    var parsed = JSON.parse(d);
    if (!parsed.encrypted) return null;
    var plaintext = await decryptWithPin(parsed.encrypted, pin);
    return JSON.parse(plaintext);
  } catch (e) {
    console.error('[decryptSensitive] error:', e);
    return null;
  }
}


// ── 旧 saveWallet（保留兼容，内部调用 saveWalletSecure）──
function saveWallet(w) {
  var pin = _pin || '';
  if (pin) {
    saveWalletSecure(w, pin)
      .then(function () {
        if (typeof wwSealWalletSensitive === 'function') return wwSealWalletSensitive();
      })
      .catch(function (e) { _saveWalletPlainPublicOnly(w); });
  } else {
    _saveWalletPlainPublicOnly(w);
    try { if (typeof wwSealWalletSensitive === 'function') void wwSealWalletSensitive(); } catch (_sw) {}
  }
}

/** 只存公开信息（无 PIN 降级方案） */
function _saveWalletPlainPublicOnly(w) {
  try {
    var safe = {
      ethAddress: w.ethAddress,
      trxAddress: w.trxAddress,
      btcAddress: w.btcAddress || '',
      createdAt: w.createdAt,
      backedUp: w.backedUp || false
    };
    localStorage.setItem('ww_wallet', JSON.stringify(safe));
  } catch(e) {}
}

/* loadWallet 定义在 wallet.core.js（含万语地址初始化与移除 html.ww-addr-pending）；勿在此重复声明，否则会覆盖核心实现导致异常 */

/* WW_REF_INVITES_KEY 由 wallet.ui.js 声明 */
function getRefInvitesMap() {
  try { return JSON.parse(localStorage.getItem(WW_REF_INVITES_KEY) || '{}'); } catch (e) { return {}; }
}
function saveRefInvitesMap(m) {
  try { localStorage.setItem(WW_REF_INVITES_KEY, JSON.stringify(m)); } catch (e) {}
}
function normalizeRefCode(s) {
  if (!s || typeof s !== 'string') return '';
  s = s.trim().replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return s.slice(0, 32);
}
function captureReferralFromUrl() {
  try {
    var u = new URL(location.href);
    var r = u.searchParams.get('ref');
    if (r) {
      r = normalizeRefCode(r);
      if (r.length >= 6 && r.length <= 32) {
        sessionStorage.setItem('ww_ref_pending', r);
        u.searchParams.delete('ref');
        history.replaceState({}, '', u.pathname + (u.search || '') + (u.hash || ''));
      }
    }
  } catch (e) {}
}
function getMyReferralCodeForWallet(w) {
  if (!w || !w.ethAddress) return '';
  var addr = String(w.ethAddress).toLowerCase();
  try {
    if (typeof ethers !== 'undefined' && ethers.utils && ethers.utils.keccak256) {
      var h = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('wwref:' + addr));
      return h.slice(2, 12);
    }
  } catch (e) {}
  return addr.replace(/^0x/, '').slice(0, 10);
}
function getMyReferralCode() {
  if (!REAL_WALLET || !REAL_WALLET.ethAddress) return '';
  return getMyReferralCodeForWallet(REAL_WALLET);
}
function getInviteCountForCode(code) {
  var m = getRefInvitesMap();
  var n = m[code];
  return typeof n === 'number' && !isNaN(n) ? n : 0;
}
function applyReferralCredit() {
  try {
    if (localStorage.getItem('ww_ref_install_credited') === '1') return;
    var pending = sessionStorage.getItem('ww_ref_pending');
    if (!pending) return;
    if (!REAL_WALLET || !REAL_WALLET.ethAddress) return;
    var myCode = getMyReferralCodeForWallet(REAL_WALLET);
    if (pending === myCode) return;
    var map = getRefInvitesMap();
    map[pending] = (map[pending] || 0) + 1;
    saveRefInvitesMap(map);
    localStorage.setItem('ww_ref_install_credited', '1');
    sessionStorage.removeItem('ww_ref_pending');
    if (typeof updateReferralSettingsUI === 'function') updateReferralSettingsUI();
  } catch (e) {}
}
function getReferralShareUrl() {
  var code = getMyReferralCode();
  if (!code) return '';
  try {
    var u = new URL(location.href);
    u.searchParams.set('ref', code);
    return u.toString().split('#')[0];
  } catch (e) {
    return 'https://worldtoken.cc/wallet.html?ref=' + encodeURIComponent(code);
  }
}
function updateReferralSettingsUI() {
  var linkEl = document.getElementById('settingsRefLink');
  var countEl = document.getElementById('settingsRefCount');
  if (!REAL_WALLET || !REAL_WALLET.ethAddress) {
    if (linkEl) linkEl.textContent = '创建或导入钱包后生成邀请链接';
    if (countEl) countEl.textContent = '—';
    return;
  }
  var code = getMyReferralCode();
  var link = getReferralShareUrl();
  if (linkEl) linkEl.textContent = link.length > 56 ? link.slice(0, 54) + '…' : link;
  if (countEl) countEl.textContent = String(getInviteCountForCode(code));
}
function copyReferralLink() {
  var u = getReferralShareUrl();
  if (!u) { showToast('请先创建或导入钱包', 'info'); return; }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(u).then(function() { showToast('邀请链接已复制', 'success'); }).catch(function() { showToast('复制失败', 'error'); });
  } else {
    showToast(u, 'info', 4000);
  }
}
function shareReferralLink() {
  var u = getReferralShareUrl();
  if (!u) { showToast('请先创建或导入钱包', 'info'); return; }
  var title = 'WorldToken 钱包邀请';
  var text = '使用我的链接打开 WorldToken 钱包：';
  if (navigator.share) {
    navigator.share({ title: title, text: text, url: u }).catch(function() { copyReferralLink(); });
  } else {
    copyReferralLink();
  }
}


// BIP39_WORDS 由 wallet.ui.js 声明

function generateLocalMnemonic() {
  const words = [];
  for(let i = 0; i < 12; i++) {
    words.push(BIP39_WORDS[Math.floor(Math.random() * BIP39_WORDS.length)]);
  }
  return words.join(' ');
}

function formatWalletCreateError(e) {
  if (!e) return '创建失败：未知错误';
  const raw = String(e.message || e.reason || '');
  if (/^创建失败：/.test(raw)) return raw;
  if (typeof ethers === 'undefined')
    return '创建失败：钱包库（ethers）未加载，请检查网络后刷新页面';
  if (e.name === 'QuotaExceededError' || /quota|存储空间|exceeded/i.test(raw))
    return '创建失败：浏览器存储已满或受限，请清理本站数据后重试';
  if (/ethers is not defined|ethers.*undefined/i.test(raw) || (e.name === 'ReferenceError' && /ethers/i.test(raw)))
    return '创建失败：钱包库（ethers）未加载，请检查网络后刷新页面';
  if (/invalid mnemonic|checksum|invalid entropy|bad seed/i.test(raw))
    return '创建失败：助记词生成异常（' + raw + '）';
  if (/fromMnemonic|HDNode|hardened|path/i.test(raw))
    return '创建失败：密钥派生失败（' + raw + '）';
  if (raw) return '创建失败：' + raw;
  return '创建失败：' + (e.name || String(e));
}
function walletCreateYield() {
  return new Promise(function(resolve) {
    requestAnimationFrame(function() { setTimeout(resolve, 16); });
  });
}
/** BIP39：12/15/18/21/24 词对应 128/160/192/224/256 bit 熵 */
function getEntropyByteCountForMnemonicWords(n) {
  const map = { 12: 16, 15: 20, 18: 24, 21: 28, 24: 32 };
  return map[n] || 16;
}
function getTargetMnemonicWordCount() {
  try {
    const activePage = document.querySelector('.page.active');
    const aid = activePage && activePage.id;
    // 「设置钱包」里创建新钱包：固定 12 词，不沿用密钥页曾选过的 15/18/24（否则会生成错误词数）
    if (aid === 'page-create') return 12;
  } catch (e) {}
  let n = typeof currentMnemonicLength === 'number' ? currentMnemonicLength : 12;
  if (![12, 15, 18, 21, 24].includes(n)) n = 12;
  // 不读 #mnemonicLength DOM：浏览器可能恢复上次的选中项，导致词数与内存/钱包不一致
  return n;
}
/** 密钥页下拉：与 currentMnemonicLength 同步 */
function syncMnemonicLengthChoice(v) {
  const n = parseInt(v, 10) || 12;
  if (![12, 15, 18, 21, 24].includes(n)) return;
  currentMnemonicLength = n;
  try {
    const mk = document.getElementById('mnemonicLength');
    if (mk) mk.value = String(n);
  } catch (e) {}
}
/** 页面加载时初始化密钥页下拉为 12（不读 REAL_WALLET.enMnemonic 词数；词数不写入 localStorage） */
function initMnemonicLengthSelectors() {
  // 永远默认 12 词；不读 REAL_WALLET 词数、不写入 localStorage（对抗刷新后浏览器恢复下拉选中项）
  const n = 12;
  currentMnemonicLength = n;
  try {
    const mk = document.getElementById('mnemonicLength');
    if (mk) {
      mk.value = '12';
      mk.selectedIndex = 0;
    }
  } catch (e) {}
}
/** @param {number} [forcedWordCount] 若传入则按该词数生成（避免与 DOM 不同步） */
async function createRealWallet(forcedWordCount) {
  if (typeof ethers === 'undefined') {
    throw new Error('钱包库（ethers）未就绪，请检查网络连接后刷新页面重试');
  }
  if (typeof setWalletCreateStep === 'function') 
  await walletCreateYield();
  let mnemonic, wallet, trxWallet, btcWallet, trxAddr;
  try {
    const nWords = (typeof forcedWordCount === 'number' && [12, 15, 18, 21, 24].includes(forcedWordCount))
      ? forcedWordCount
      : getTargetMnemonicWordCount();
    const entropyBytes = getEntropyByteCountForMnemonicWords(nWords);
    mnemonic = ethers.utils.entropyToMnemonic(ethers.utils.randomBytes(entropyBytes));
    wallet = ethers.Wallet.fromMnemonic(mnemonic);
  } catch (e) {
    console.error('[WorldToken] 钱包创建失败:', e);
    throw new Error(formatWalletCreateError(e));
  }
  if (typeof setWalletCreateStep === 'function') 
  await walletCreateYield();
  try {
    trxWallet = ethers.Wallet.fromMnemonic(mnemonic, "m/44'/195'/0'/0/0");
    btcWallet = ethers.Wallet.fromMnemonic(mnemonic, "m/44'/0'/0'/0/0");
  } catch (e) {
    console.error('[WorldToken] 钱包创建失败:', e);
    throw new Error(formatWalletCreateError(e));
  }
  trxAddr = '';
  try {
    await loadTronWeb();
    if (typeof TronWeb !== 'undefined') {
      trxAddr = TronWeb.address.fromHex('41' + trxWallet.address.slice(2));
    } else {
      trxAddr = 'T' + trxWallet.address.slice(2, 35);
    }
  } catch (e2) {
    trxAddr = 'T' + trxWallet.address.slice(2, 35);
  }
  if (typeof setWalletCreateStep === 'function') 
  await walletCreateYield();
  var btcSeg = '';
  try {
    if (typeof wwDeriveBtcNativeSegwitAddress === 'function') btcSeg = wwDeriveBtcNativeSegwitAddress(mnemonic);
  } catch (_bs) {}
  const w = {
    mnemonic: mnemonic,
    enMnemonic: mnemonic,
    words: mnemonic.split(' '),
    ethAddress: wallet.address,
    trxAddress: trxAddr,
    btcAddress: btcSeg || btcWallet.address,
    privateKey: wallet.privateKey,
    trxPrivateKey: trxWallet.privateKey,
    createdAt: Date.now()
  };
  window.REAL_WALLET = w;
  saveWallet(w);
  applyReferralCredit();
  return w;
}

async function restoreWallet(mnemonic) {
  if(typeof ethers === 'undefined') return null;
  try {
    const inputWords = mnemonic.trim().split(/\s+/);
    if(![12,15,18,21,24].includes(inputWords.length)) {
      showToast(`❌ 助记词必须是12/15/18/21/24个词，当前${inputWords.length}个`, 'error');
      return null;
    }
    // 自动检测语言并转换为英文BIP39（若输入非英文词）
    let enMnemonicStr = mnemonic.trim();
    let detectedLang = 'en';
    const firstWord = inputWords[0];
    if (firstWord && !/^[a-z]+$/.test(firstWord)) {
      // 非英文，尝试所有语言词库匹配
      for (const lang of Object.keys(WT_LANG_INDEX || {})) {
        if (lang === 'en') continue;
        const idx = (WT_LANG_INDEX[lang] || {})[firstWord];
        if (idx !== undefined) {
          detectedLang = lang;
          enMnemonicStr = mnemonicFromLang(mnemonic.trim(), lang);
          break;
        }
      }
    }
    const words = enMnemonicStr.split(' ');
    const wallet = ethers.Wallet.fromMnemonic(enMnemonicStr);
    const trxWallet = ethers.Wallet.fromMnemonic(enMnemonicStr, "m/44'/195'/0'/0/0");
    // 将 ETH 地址转换为正确的 TRX 地址（Base58Check）
    let trxAddr = '';
    try {
      if(typeof TronWeb !== 'undefined') {
        trxAddr = TronWeb.address.fromHex('41' + trxWallet.address.slice(2));
      } else {
        trxAddr = 'T' + trxWallet.address.slice(2, 36); // fallback
      }
    } catch(e) { trxAddr = 'T' + trxWallet.address.slice(2, 36); }
    // BTC 地址（m/44'/0'/0'/0/0）
    let btcAddr2 = '';
    try {
      if (typeof wwDeriveBtcNativeSegwitAddress === 'function') {
        btcAddr2 = wwDeriveBtcNativeSegwitAddress(enMnemonicStr) || '';
      }
      if (!btcAddr2) {
        const btcWallet = ethers.Wallet.fromMnemonic(enMnemonicStr, "m/44'/0'/0'/0/0");
        btcAddr2 = btcWallet.address;
      }
    } catch(e) {}
    const w = {
      mnemonic: enMnemonicStr,
      enMnemonic: enMnemonicStr,           // 真实英文BIP39助记词
      inputMnemonic: mnemonic.trim(),      // 用户输入的原始词（可能是其他语言）
      inputLang: detectedLang,
      words: words,
      ethAddress: wallet.address,
      trxAddress: trxAddr,
      privateKey: wallet.privateKey,       // ETH private key
      trxPrivateKey: trxWallet.privateKey,  // TRX private key
      btcAddress: btcAddr2,                 // BTC address (simplified)
      createdAt: Date.now()
    };
    window.REAL_WALLET = w;
    saveWallet(w);
    applyReferralCredit();
    return w;
  } catch(e) {
    showToast('❌ 助记词无效，请检查后重试', 'error');
    return null;
  }
}

/** 旧版误存 ETH 格式「BTC 地址」时，在助记词解密后升级为 bc1 P2WPKH */
function wwUpgradeStoredBtcAddressIfLegacy() {
  try {
    var w = typeof REAL_WALLET !== 'undefined' && REAL_WALLET ? REAL_WALLET : null;
    if (!w || !w.btcAddress || String(w.btcAddress).indexOf('0x') !== 0) return;
    var m = w.enMnemonic || w.mnemonic;
    if (!m || typeof wwDeriveBtcNativeSegwitAddress !== 'function') return;
    var nb = wwDeriveBtcNativeSegwitAddress(m);
    if (nb && /^bc1[a-z0-9]{20,}$/i.test(nb)) {
      w.btcAddress = nb;
      if (typeof saveWallet === 'function') saveWallet(w);
    }
  } catch (_e) {}
}

// 页面加载时恢复钱包（只恢复数据，不跳转）— loadWallet 已在 wallet.ui.js 执行，勿重复以免双次初始化
captureReferralFromUrl();
try { initMnemonicLengthSelectors(); } catch (_iml) {}
try {
  const _txList = document.getElementById('txHistoryList');
  if (_txList && typeof txHistoryEmptyHtml === 'function') _txList.innerHTML = txHistoryEmptyHtml();
} catch (_e) {}
// 钱包昵称 localStorage（仅本机）
try { if (localStorage.getItem('ww_wallet_nickname') == null) localStorage.setItem('ww_wallet_nickname', ''); } catch (_wn) {}
function getWalletNickname() { try { return localStorage.getItem('ww_wallet_nickname') || ''; } catch (e) { return ''; } }
function setWalletNickname(s) { try { localStorage.setItem('ww_wallet_nickname', (s || '').trim().slice(0, 32)); } catch (e) {} }
function applyWwTheme() {
  var t = localStorage.getItem('ww_theme') || 'dark';
  if (t !== 'light' && t !== 'dark') t = 'dark';
  document.documentElement.setAttribute('data-theme', t);
  var el = document.getElementById('settingsThemeValue');
  if (el) el.textContent = t === 'light' ? '浅色' : '深色';
}
function toggleWwTheme() {
  var cur = localStorage.getItem('ww_theme') || 'dark';
  var next = cur === 'light' ? 'dark' : 'light';
  try { localStorage.setItem('ww_theme', next); } catch (e) {}
  applyWwTheme();
}
applyWwTheme();
// 页面加载完成（多次固定下拉为 12，晚于部分浏览器的表单/会话恢复）
window.addEventListener('load', () => {
  try { initMnemonicLengthSelectors(); } catch (_iml2) {}
  setTimeout(function () {
    try { initMnemonicLengthSelectors(); } catch (_iml4) {}
  }, 0);
  setTimeout(function () {
    try { initMnemonicLengthSelectors(); } catch (_iml5) {}
  }, 50);
  setTimeout(function () {
    try { initMnemonicLengthSelectors(); } catch (_iml6) {}
  }, 200);
  if (typeof requestPushPermissionOnFirstLaunch === 'function') requestPushPermissionOnFirstLaunch();
});
window.addEventListener('pageshow', function () {
  try { initMnemonicLengthSelectors(); } catch (_iml3) {}
});
// 强刷：清 hash 深链。本地开发（WW_DEV_PRESERVE_ROUTE）时跳过，与 wallet.ui.js 的 hash 首跳一致。
// 若 localStorage 已有链上地址：直接 goTo 首页并显示底栏（勿先 welcome + tabBar:none 再等 session 恢复，否则竞态下底栏长期不可点）。
(function () {
  try {
    if (typeof window !== 'undefined' && window.WW_DEV_PRESERVE_ROUTE) return;
  } catch (_pr0) {}
  try {
    if (typeof history !== 'undefined' && history.replaceState) {
      var _u0 = new URL(location.href);
      _u0.hash = '';
      history.replaceState(null, '', _u0.pathname + _u0.search);
    } else if (location.hash) {
      location.hash = '';
    }
  } catch (_rh0) {}
  var _bootHasAddr = false;
  try {
    var _rawW = localStorage.getItem('ww_wallet');
    if (_rawW) {
      var _ow = JSON.parse(_rawW);
      _bootHasAddr = !!(_ow && (_ow.ethAddress || _ow.trxAddress || _ow.btcAddress));
    }
  } catch (_bw) {}
  if (_bootHasAddr && typeof goTo === 'function') {
    try {
      if (typeof hideWalletLoading === 'function') hideWalletLoading();
    } catch (_hw0) {}
    try {
      goTo('page-home', { instant: true, forceHome: true });
    } catch (_gt0) {}
    return;
  }
  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active');
    p.style.display = '';
  });
  const welcomePage = document.getElementById('page-welcome');
  if (welcomePage) {
    welcomePage.classList.add('active');
  }
  try {
    var _tbBoot = document.getElementById('tabBar');
    if (_tbBoot) _tbBoot.style.display = 'none';
  } catch (_tbb) {}
})();

/* SAMPLE_KEYS 由 wallet.ui.js 声明 */
// 英文用户用公链地址，其他用母语诗句地址
/* ADDR_SAMPLES 由 wallet.ui.js 声明 */
CHAIN_ADDR = (REAL_WALLET && REAL_WALLET.trxAddress) ? REAL_WALLET.trxAddress : '--';
// 如果有真实钱包，使用真实 TRX 地址（与 wallet.core.js 共用 var，勿用 const 重复声明）
function getChainAddr() {
  return (REAL_WALLET && REAL_WALLET.trxAddress) ? REAL_WALLET.trxAddress : CHAIN_ADDR;
};
// ETH/BTC 地址动态读取（不用 const 硬编码）
function getEthAddr() { return (REAL_WALLET && REAL_WALLET.ethAddress) ? REAL_WALLET.ethAddress : '--'; }
function getBtcAddr() { return (REAL_WALLET && REAL_WALLET.btcAddress) ? REAL_WALLET.btcAddress : '--'; }
// ETH_ADDR_LEGACY / currentLang / MAIN_PAGES / TAB_MAP / WW_PAGE_SEO / applySeoForPage / wwIsOnline / applyOfflineState 由 wallet.ui.js 先声明，此处勿 const/let 重复

function wwBase32Encode(buf) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0, val = 0, out = '';
  for (let i = 0; i < buf.length; i++) {
    val = (val << 8) | buf[i];
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += alphabet[(val >> bits) & 31];
    }
  }
  if (bits > 0) out += alphabet[(val << (5 - bits)) & 31];
  return out;
}
function wwBase32Decode(s) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  s = String(s || '').replace(/\s/g, '').toUpperCase().replace(/=+$/, '');
  let bits = 0, val = 0, out = [];
  for (let i = 0; i < s.length; i++) {
    const idx = alphabet.indexOf(s[i]);
    if (idx < 0) continue;
    val = (val << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((val >> bits) & 255);
    }
  }
  return new Uint8Array(out);
}
function wwCounterBytes(n) {
  const b = new Uint8Array(8);
  let x = BigInt(n);
  for (let i = 7; i >= 0; i--) {
    b[i] = Number(x & 255n);
    x >>= 8n;
  }
  return b;
}
async function wwHmacSha1(keyBytes, msgBytes) {
  const k = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, msgBytes);
  return new Uint8Array(sig);
}
async function wwVerifyTotpCode(secretB32, input) {
  if (!/^\d{6}$/.test(input || '')) return false;
  const raw = wwBase32Decode(secretB32);
  if (!raw.length) return false;
  const step = 30;
  const t = Math.floor(Date.now() / 1000 / step);
  for (let d = -1; d <= 1; d++) {
    const msg = wwCounterBytes(t + d);
    const h = await wwHmacSha1(raw, msg);
    const o = h[h.length - 1] & 0x0f;
    const bin = ((h[o] & 0x7f) << 24) | ((h[o + 1] & 0xff) << 16) | ((h[o + 2] & 0xff) << 8) | (h[o + 3] & 0xff);
    const code = String(bin % 1000000).padStart(6, '0');
    if (code === input) return true;
  }
  return false;
}
function wwTotpEnabled() {
  return localStorage.getItem('ww_totp_enabled') === '1' && !!localStorage.getItem('ww_totp_secret');
}
function wwGenerateTotpSecretB32() {
  const u = new Uint8Array(20);
  crypto.getRandomValues(u);
  return wwBase32Encode(u);
}

function offerTotpAfterPinSave() {
  if (wwTotpEnabled()) return;
  setTimeout(function() {
    try {
      if (!confirm('是否启用 Google Authenticator 两步验证？\n启用后解锁钱包时需输入 PIN 与动态码。')) return;
      startTotpSetup();
    } catch (e) {}
  }, 120);
}
function openTotpSettingsRow() {
  function run() {
    if (wwTotpEnabled()) {
      if (!confirm('确定要关闭两步验证吗？')) return;
      localStorage.removeItem('ww_totp_secret');
      localStorage.removeItem('ww_totp_enabled');
      showToast('两步验证已关闭', 'success');
      updateSettingsPage();
      return;
    }
    startTotpSetup();
  }
  if (wwHasPinConfigured()) {
    run();
    return;
  }
  if (typeof wwEnsurePinThen === 'function') {
    wwEnsurePinThen(run);
    return;
  }
  showToast('请先设置 6 位 PIN', 'warning');
}
function startTotpSetup() {
  if (window._wwInFirstRun) return;
  function openTotpUi() {
    const secretB32 = wwGenerateTotpSecretB32();
    window._wwTotpPendingSecret = secretB32;
    const issuer = 'WorldToken';
    let acc = (typeof getNativeAddr === 'function' ? getNativeAddr() : '') || 'wallet';
    acc = String(acc).slice(0, 48);
    const label = encodeURIComponent(issuer + ':' + acc);
    const otpauth = 'otpauth://totp/' + label + '?secret=' + secretB32 + '&issuer=' + encodeURIComponent(issuer);
    const st = document.getElementById('totpSetupSecretText');
    if (st) st.textContent = secretB32;
    const inp = document.getElementById('totpSetupVerifyInput');
    if (inp) inp.value = '';
    const ov = document.getElementById('totpSetupOverlay');
    if (ov) ov.classList.add('show');
    const canvas = document.getElementById('totpSetupQr');
    if (canvas && typeof loadQRCodeLib === 'function') {
      loadQRCodeLib().then(function() {
        if (typeof QRCode !== 'undefined' && QRCode.toCanvas) {
          return QRCode.toCanvas(canvas, otpauth, { width: 200, margin: 2, color: { dark: '#000000', light: '#ffffff' } });
        }
      }).catch(function() { showToast('二维码加载失败，可手动输入密钥', 'warning'); });
    }
  }
  if (wwHasPinConfigured()) {
    openTotpUi();
    return;
  }
  if (typeof wwEnsurePinThen === 'function') {
    wwEnsurePinThen(openTotpUi);
    return;
  }
  showToast('请先设置 6 位 PIN', 'warning');
}
function closeTotpSetup() {
  const ov = document.getElementById('totpSetupOverlay');
  if (ov) ov.classList.remove('show');
  window._wwTotpPendingSecret = null;
}
async function confirmTotpSetup() {
  const sec = window._wwTotpPendingSecret;
  const inputEl = document.getElementById('totpSetupVerifyInput');
  const input = inputEl ? inputEl.value.trim() : '';
  if (!/^\d{6}$/.test(input)) { showToast('请输入 6 位验证码', 'error'); return; }
  if (!sec) { showToast('会话已过期，请重试', 'error'); return; }
  const ok = await wwVerifyTotpCode(sec, input);
  if (!ok) { showToast('验证码不正确', 'error'); return; }
  const pin = window.wwSessionPinBridge.get();
  if (!pin) { showToast('请先通过 PIN 解锁钱包', 'error'); return; }
  try {
    localStorage.setItem('ww_totp_secret', await encryptTotpSecret(sec, pin));
  } catch (e) {
    console.error('[TOTP encrypt]', e);
    showToast('保存失败', 'error');
    return;
  }
  localStorage.setItem('ww_totp_enabled', '1');
  window._wwTotpPendingSecret = null;
  closeTotpSetup();
  showToast('两步验证已启用', 'success');
  if (typeof updateSettingsPage === 'function') updateSettingsPage();
}
function showTotpUnlockOverlay() {
  const ov = document.getElementById('totpUnlockOverlay');
  const inp = document.getElementById('totpUnlockInput');
  const err = document.getElementById('totpUnlockError');
  if (inp) { inp.value = ''; try { inp.focus(); } catch (e) {} }
  if (err) err.style.display = 'none';
  if (ov) ov.classList.add('show');
}
async function submitTotpUnlock() {
  const inp = document.getElementById('totpUnlockInput');
  const err = document.getElementById('totpUnlockError');
  const got = inp ? inp.value.trim() : '';
  if (!/^\d{6}$/.test(got)) {
    if (err) err.textContent = '请输入 6 位数字';
    if (err) err.style.display = 'block';
    return;
  }
  const encryptedSec = localStorage.getItem('ww_totp_secret');
  if (!encryptedSec) {
    if (err) err.textContent = 'TOTP 配置已丢失';
    if (err) err.style.display = 'block';
    return;
  }
  const pin = _pin || window.wwSessionPinBridge.get();
  if (!pin) {
    if (err) err.textContent = '请先通过 PIN 解锁钱包';
    if (err) err.style.display = 'block';
    return;
  }
  var sec = null;
  try {
    var parsed = JSON.parse(encryptedSec);
    if (parsed && parsed.v === 1 && parsed.s && parsed.iv && parsed.c) {
      sec = await decryptTotpSecret(encryptedSec, pin);
      if (!sec) {
        if (err) err.textContent = 'TOTP 解密失败';
        if (err) err.style.display = 'block';
        return;
      }
    } else {
      sec = encryptedSec;
    }
  } catch (_e) {
    sec = encryptedSec;
  }
  const ok = await wwVerifyTotpCode(sec, got);
  if (!ok) {
    if (err) err.textContent = '验证码不正确';
    if (err) err.style.display = 'block';
    if (inp) inp.value = '';
    const pan = document.getElementById('totpUnlockPanel');
    if (pan) {
      pan.classList.remove('wt-shake-wrong');
      void pan.offsetWidth;
      pan.classList.add('wt-shake-wrong');
    }
    return;
  }
  _pin = pin;
  clearTimeout(window._pinClearTimer);
  window._pinClearTimer = setTimeout(function () {
    _pin = null;
  }, 30 * 60 * 1000);
  const ov = document.getElementById('totpUnlockOverlay');
  if (ov) ov.classList.remove('show');
  if (err) err.style.display = 'none';
  try {
    localStorage.setItem('ww_pin_set', '1');
  } catch (_ps) {}
  try {
    if (typeof updateSettingsPage === 'function') updateSettingsPage();
  } catch (_usp) {}
  await _resumeWalletAfterUnlock();
}
function closeTotpUnlock() {
  if(window._wwForceIdleLock) {
    if(typeof showToast==='function') showToast('请输入两步验证码以解锁', 'warning', 2200);
    return;
  }
  const ov = document.getElementById('totpUnlockOverlay');
  if (ov) ov.classList.remove('show');
  const pov = document.getElementById('pinUnlockOverlay');
  const pinInp = document.getElementById('pinUnlockInput');
  if (pinInp) pinInp.value = '';
  if (pov) pov.classList.add('show');
  try { if (typeof wwRefreshAntiPhishOnPinUnlock === 'function') wwRefreshAntiPhishOnPinUnlock(); } catch (_ap2) {}
}

/** 是否应在主 Tab 五栏展示钱包能力：先读内存，再回退 ww_wallet，避免「跳过验证」后进首页竞态导致底栏 display:none、无法点 Tab */
function wwWalletReadyForMainTabs() {
  try {
    if (typeof wwWalletHasAnyChainAddressIncludingTemp === 'function' && wwWalletHasAnyChainAddressIncludingTemp()) {
      return true;
    }
  } catch (_e) {}
  try {
    var raw = localStorage.getItem('ww_wallet');
    if (!raw) return false;
    var o = JSON.parse(raw);
    return !!(o && (o.ethAddress || o.trxAddress || o.btcAddress));
  } catch (_e2) {}
  return false;
}
try {
  window.wwWalletReadyForMainTabs = wwWalletReadyForMainTabs;
} catch (_wwt) {}

function goTo(pageId, opts) {
  opts = opts || {};
  /* 进首页前收起全屏加载层，避免 z-index:200 遮罩挡住底部按钮（表现为「点了没反应」） */
  if (pageId === 'page-home' && typeof hideWalletLoading === 'function') {
    try {
      hideWalletLoading();
    } catch (_hwl) {}
  }
  var _wwMainPages =
    typeof MAIN_PAGES !== 'undefined' && MAIN_PAGES && typeof MAIN_PAGES.includes === 'function'
      ? MAIN_PAGES
      : ['page-home', 'page-swap', 'page-addr', 'page-settings', 'page-hongbao'];
  if (opts.instant) {
    try {
      document.documentElement.classList.add('ww-instant-route');
    } catch (_wi) {}
  }
  /* 密钥页「暂时忽略验证」等：必须能进首页；若强行改 welcome，欢迎页又可能被 ww-hide-welcome-until-ready 隐藏，表现为点击无反应 */
  if (
    pageId === 'page-home' &&
    !opts.forceHome &&
    typeof wwWalletHasAnyChainAddressIncludingTemp === 'function'
  ) {
    if (!wwWalletHasAnyChainAddressIncludingTemp()) pageId = 'page-welcome';
  }
  if (pageId === 'page-password-restore' && typeof wwWalletHasAnyChainAddress === 'function') {
    var _pwStoreRt = null;
    try {
      _pwStoreRt = JSON.parse(localStorage.getItem('ww_wallet') || '{}');
    } catch (_e) {
      _pwStoreRt = {};
    }
    if (!wwWalletHasAnyChainAddress(_pwStoreRt)) pageId = 'page-welcome';
    else if (typeof loadWallet === 'function') {
      try {
        loadWallet();
      } catch (_lw) {}
    }
  }
  try { sessionStorage.setItem('ww_last_page', pageId); } catch(_) {}
  try {
    var curEl = document.querySelector('.page.active');
    var curId = curEl && curEl.id;
    if (curId && pageId === 'page-import' && curId !== 'page-import') {
      window._importBackTarget = curId;
    }
  } catch (_ib) {}
  applySeoForPage(pageId);
  document.querySelectorAll('.page').forEach(p=>{p.classList.remove('active');p.style.display='';});
  const activePage=document.getElementById(pageId);
  if(!activePage){
    console.warn('[WorldToken] 页面不存在:',pageId);
    try {
      document.documentElement.classList.remove('ww-boot-route');
      document.documentElement.classList.remove('ww-instant-route');
      if (document.documentElement.getAttribute('data-ww-boot-page')) {
        document.documentElement.removeAttribute('data-ww-boot-page');
        var _bstE = document.querySelector('style[data-ww-boot-route="1"]');
        if (_bstE && _bstE.parentNode) _bstE.parentNode.removeChild(_bstE);
      }
    } catch (_ePg) {}
    return;
  }
  activePage.classList.add('active');
  activePage.style.display='';
  var _tbGo = document.getElementById('tabBar');
  if (_tbGo) {
    if (_wwMainPages.includes(pageId)) {
      _tbGo.style.display = wwWalletReadyForMainTabs() ? 'flex' : 'none';
    } else {
      _tbGo.style.display = 'none';
    }
  }
  if(pageId==='page-key') {
    var _skipKey = opts.preserveKeyPage || opts.skipKeyRegen;
    if (_skipKey) {
      if (typeof syncKeyPageLangSelect === 'function') syncKeyPageLangSelect();
      if (typeof wwUnsealWalletSensitive === 'function') {
        void wwUnsealWalletSensitive().then(function () {
          if (typeof renderKeyGrid === 'function') renderKeyGrid();
        });
      } else if (typeof renderKeyGrid === 'function') renderKeyGrid();
    } else {
      // 从设置「备份助记词」进入：展示已持久化钱包，清除创建流程遗留的 TEMP（避免遮挡真实助记词）
      var _backupFromSettings = false;
      try {
        if (window._keyBackPage === 'page-settings' && typeof REAL_WALLET !== 'undefined' && REAL_WALLET) {
          var _hm = !!(REAL_WALLET.enMnemonic || REAL_WALLET.mnemonic);
          var _ha = typeof wwWalletHasAnyChainAddress === 'function' && wwWalletHasAnyChainAddress(REAL_WALLET);
          if (_hm && _ha) {
            _backupFromSettings = true;
            window.TEMP_WALLET = null;
            try {
              window._wwTempWalletByWordCount = {};
            } catch (_czR) {}
            if (typeof syncKeyPageLangSelect === 'function') syncKeyPageLangSelect();
            if (typeof wwUnsealWalletSensitive === 'function') {
              void wwUnsealWalletSensitive().then(function () {
                if (typeof renderKeyGrid === 'function') renderKeyGrid();
                if (typeof updateMnemonicStrengthIndicator === 'function') updateMnemonicStrengthIndicator();
              });
            } else {
              if (typeof renderKeyGrid === 'function') renderKeyGrid();
              if (typeof updateMnemonicStrengthIndicator === 'function') updateMnemonicStrengthIndicator();
            }
            try { window._keyBackPage = null; } catch (_kb0) {}
          }
        }
      } catch (_bk) {}
      if (!_backupFromSettings) {
        var _tw0 = window.TEMP_WALLET;
        var _nWords = 0;
        if (_tw0 && _tw0.mnemonic) {
          _nWords = _tw0.mnemonic.trim().split(/\s+/).filter(Boolean).length;
        }
        // 创建流程内重复进入密钥页：复用已有 TEMP；词数切换由 changeMnemonicLength + _wwTempWalletByWordCount 按词数缓存恢复
        if (_tw0 && _tw0.mnemonic && [12, 15, 18, 21, 24].indexOf(_nWords) >= 0) {
          currentMnemonicLength = _nWords;
          var _selR = document.getElementById('mnemonicLength');
          if (_selR) {
            _selR.value = String(_nWords);
            var _ixR = [12, 15, 18, 21, 24].indexOf(_nWords);
            if (_ixR >= 0) _selR.selectedIndex = _ixR;
          }
          if (typeof syncKeyPageLangSelect === 'function') syncKeyPageLangSelect();
          if (typeof wwPutTempWalletInWordCountCache === 'function') wwPutTempWalletInWordCountCache(_tw0);
          if (typeof renderKeyGrid === 'function') renderKeyGrid();
          if (typeof updateMnemonicStrengthIndicator === 'function') updateMnemonicStrengthIndicator();
        } else {
          currentMnemonicLength = 12;
          var _selK = document.getElementById('mnemonicLength');
          if (_selK) { _selK.value = '12'; _selK.selectedIndex = 0; }
          if (typeof syncKeyPageLangSelect === 'function') syncKeyPageLangSelect();
          showWalletLoading();
          Promise.resolve(createWallet(12))
            .then(function (w) {
              window.TEMP_WALLET = w;
              if (typeof wwPutTempWalletInWordCountCache === 'function') wwPutTempWalletInWordCountCache(w);
              hideWalletLoading();
              if (typeof syncKeyPageLangSelect === 'function') syncKeyPageLangSelect();
              if (typeof renderKeyGrid === 'function') renderKeyGrid();
            })
            .catch(function (e) {
              hideWalletLoading();
              if (typeof showToast === 'function')
                showToast(typeof formatWalletCreateError === 'function' ? formatWalletCreateError(e) : (e && e.message) || '生成失败', 'error');
            });
        }
      }
    }
  }
  if(pageId==='page-key-verify') {} // 验证页由 startVerify 初始化
if(pageId==='page-import') { try { window._wwInFirstRun = true; } catch (_frImp) {} try { importGridWordCount = 12; var _iml=document.getElementById('importMnemonicLength'); if(_iml){ _iml.value='12'; _iml.selectedIndex=0; } if(typeof syncKeyPageLangSelect==='function') syncKeyPageLangSelect(); } catch(_impSync){} initImportGrid(); document.getElementById('importError').style.display='none'; updateImportWordCount(); }
  if(pageId==='page-recovery-test') { try { const rt=document.getElementById('recoveryTestInput'); if(rt) rt.value=''; } catch(_rt) {} }
  if(pageId==='page-social-recovery') { try { if(typeof wwSocialRecoveryRender==='function') setTimeout(wwSocialRecoveryRender, 40); } catch(_sr) {} }
  if(pageId==='page-spending-limits') { try { if(typeof wwSpendLimitPopulate==='function') setTimeout(wwSpendLimitPopulate, 40); } catch(_sl) {} }
  if(pageId==='page-whale-alerts') { try { if(typeof wwWhalePopulate==='function') setTimeout(wwWhalePopulate, 40); } catch(_wh) {} }
  if(pageId==='page-bridge') { try { setTimeout(function(){ if(typeof wwBridgeSyncTo==='function') wwBridgeSyncTo(); }, 0); } catch(_br) {} }
  if(pageId==='page-vesting') { try { if(typeof wwVestingRender==='function') setTimeout(wwVestingRender, 40); } catch(_ve) {} }
  if(pageId==='page-dex-connect') { try { if(typeof wwDexConnectPopulate==='function') setTimeout(wwDexConnectPopulate, 40); } catch(_dx) {} }
  if(pageId==='page-hardware-wallet') { try { if(typeof wwHardwareWalletPopulate==='function') setTimeout(wwHardwareWalletPopulate, 40); } catch(_hw) {} }
  if(pageId==='page-tax-report') { try { if(typeof wwTaxReportPopulate==='function') setTimeout(wwTaxReportPopulate, 40); } catch(_tr) {} }
  if(pageId==='page-copy-trading') { try { if(typeof wwCopyTradingPopulate==='function') setTimeout(wwCopyTradingPopulate, 40); } catch(_cp) {} }
  if(pageId==='page-portfolio-insurance') { try { if(typeof wwPortfolioInsurancePopulate==='function') setTimeout(wwPortfolioInsurancePopulate, 40); } catch(_pi) {} }
  if(pageId==='page-yield-optimizer') { try { if(typeof wwYieldOptimizerPopulate==='function') setTimeout(wwYieldOptimizerPopulate, 40); } catch(_yo) {} }
  if(pageId==='page-token-unlock-calendar') { try { if(typeof wwTokenUnlockCalendarPopulate==='function') setTimeout(wwTokenUnlockCalendarPopulate, 40); } catch(_uc) {} }
  if(pageId==='page-identity') { try { if(typeof wwIdentityPopulate==='function') setTimeout(wwIdentityPopulate, 40); } catch(_id) {} }
  if(pageId==='page-analytics') { try { if(typeof wwAnalyticsPopulate==='function') setTimeout(wwAnalyticsPopulate, 50); } catch(_an) {} }
  if(pageId==='page-recurring') { try { if(typeof wwRecurringPopulate==='function') setTimeout(wwRecurringPopulate, 40); } catch(_re) {} }
  if(pageId==='page-token-whitelist') { try { if(typeof wwWhitelistPopulate==='function') setTimeout(wwWhitelistPopulate, 40); } catch(_wl) {} }
  if(pageId==='page-inheritance') { try { if(typeof wwInheritancePopulate==='function') setTimeout(wwInheritancePopulate, 40); } catch(_ih) {} }
  if(pageId==='page-dao') { try { if(typeof wwDaoRender==='function') setTimeout(wwDaoRender, 40); } catch(_dao) {} }
  if(pageId==='page-reputation') { try { if(typeof wwReputationPopulate==='function') setTimeout(wwReputationPopulate, 40); } catch(_rep) {} }
  if(pageId==='page-lending') { try { if(typeof wwLendingPopulate==='function') setTimeout(wwLendingPopulate, 40); } catch(_ld) {} }
  if(pageId==='page-perp-futures') { try { if(typeof wwPerpPopulate==='function') setTimeout(wwPerpPopulate, 40); } catch(_pf) {} }
  if(pageId==='page-options') { try { if(typeof wwOptionsPopulate==='function') setTimeout(wwOptionsPopulate, 40); } catch(_op) {} }
  if(pageId==='page-yield-aggregator') { try { if(typeof wwYieldAggPopulate==='function') setTimeout(wwYieldAggPopulate, 40); } catch(_ya) {} }
  if(pageId==='page-liquidation-alerts') { try { if(typeof wwLiquidationPopulate==='function') setTimeout(wwLiquidationPopulate, 40); } catch(_lq) {} }
  if(pageId==='page-launchpad') { try { if(typeof wwLaunchpadPopulate==='function') setTimeout(wwLaunchpadPopulate, 40); } catch(_lp) {} }
  if(pageId==='page-social-leaderboard') { try { if(typeof wwSocialLeaderboardPopulate==='function') setTimeout(wwSocialLeaderboardPopulate, 40); } catch(_sl) {} }
  if(pageId==='page-auto-rebalance') { try { if(typeof wwAutoRebalancePopulate==='function') setTimeout(wwAutoRebalancePopulate, 50); } catch(_ar) {} }
  if(pageId==='page-sentiment') { try { if(typeof wwSentimentPopulate==='function') setTimeout(wwSentimentPopulate, 50); } catch(_sn) {} }
  if(pageId==='page-onchain-messaging') { try { if(typeof wwOnchainMessagingPopulate==='function') setTimeout(wwOnchainMessagingPopulate, 40); } catch(_om) {} }
  if(pageId==='page-backup-qr') { try { setTimeout(function(){ var c=document.getElementById('wwBackupQrCanvas'); if(c){ var x=c.getContext('2d'); if(x){ x.fillStyle='#f0f0f0'; x.fillRect(0,0,c.width,c.height); x.fillStyle='#999'; x.font='13px sans-serif'; x.textAlign='center'; x.fillText('点击下方生成', c.width/2, c.height/2); } } }, 0); } catch(_bq) {} }
  if(pageId==='page-gasless') { try { if(typeof wwGaslessPopulate==='function') setTimeout(wwGaslessPopulate, 40); } catch(_gs) {} }
  if(pageId==='page-charts') { try { if(typeof renderWwChartsPlaceholder==='function') setTimeout(renderWwChartsPlaceholder, 60); } catch(_cw) {} }
  if(pageId==='page-settings') {
    updateSettingsPage();
    try { if(typeof wwAutoRebalanceSave==='function') wwAutoRebalanceSave(); } catch(_ar0) {}
    try { if(typeof wwGaslessPopulate==='function') wwGaslessPopulate(); } catch(_gsp) {}
    try { if(typeof wwGasManagerRender==='function') setTimeout(wwGasManagerRender, 30); } catch(_wg) {}
  }
  if(pageId==='page-swap') {
    if (
      typeof wwWalletHasAnyChainAddressIncludingTemp === 'function' &&
      wwWalletHasAnyChainAddressIncludingTemp() &&
      typeof loadBalances === 'function'
    ) {
      void loadBalances();
    }
    if(typeof renderSwapUI==='function'){renderSwapUI();calcSwap();} setTimeout(loadSwapPrices, 200);
  }
  if(pageId==='page-hongbao') {
    try {
      if (typeof wwRunGiftExpirySettlement === 'function') wwRunGiftExpirySettlement();
    } catch (_gex) {}
    if (typeof updateGiftUI === 'function') updateGiftUI();
  }
  if (_wwMainPages.includes(pageId)) updateAddr();
  if(pageId==='page-addr') {
    setTimeout(updateQRCode, 100);
    // 更新链地址显示（含未验证 TEMP 预览）
    var wvAddrRt = typeof wwGetChainViewWallet === 'function' ? wwGetChainViewWallet() : null;
    if (wvAddrRt && typeof wwWalletHasAnyChainAddress === 'function' && wwWalletHasAnyChainAddress(wvAddrRt)) {
      const trx = wvAddrRt.trxAddress || '--';
      const eth = wvAddrRt.ethAddress || '--';
      const btc = wvAddrRt.btcAddress || '--';
      const el1 = document.getElementById('addrTrxChain');
      if (el1) {
        if (typeof wwSetLineElementAddrCopyable === 'function') wwSetLineElementAddrCopyable(el1, trx);
        else el1.textContent = trx;
      }
      const el2 = document.getElementById('addrEthChain');
      if (el2) {
        if (typeof wwSetLineElementAddrCopyable === 'function') wwSetLineElementAddrCopyable(el2, eth);
        else el2.textContent = eth;
      }
      const el3 = document.getElementById('addrBtcChain');
      if (el3) {
        if (typeof wwSetLineElementAddrCopyable === 'function') wwSetLineElementAddrCopyable(el3, btc);
        else el3.textContent = btc;
      }
      const el4 = document.getElementById('qrChainAddr');
      if (el4) {
        if (typeof wwSetLineElementAddrCopyable === 'function') wwSetLineElementAddrCopyable(el4, trx);
        else el4.textContent = trx;
      }
      // Bug34: 更新 chain-hash span
      const ct = _safeEl('chainTrx');
      if (ct) {
        if (typeof wwSetLineElementAddrCopyable === 'function') wwSetLineElementAddrCopyable(ct, trx);
        else ct.textContent = trx;
      }
      const ce = _safeEl('chainEth');
      if (ce) {
        if (typeof wwSetLineElementAddrCopyable === 'function') wwSetLineElementAddrCopyable(ce, eth);
        else ce.textContent = eth;
      }
      const cb = _safeEl('chainBtc');
      if (cb) {
        if (typeof wwSetLineElementAddrCopyable === 'function') wwSetLineElementAddrCopyable(cb, btc);
        else cb.textContent = btc;
      }
    }
  }
  if(pageId==='page-hb-records') {
    try {
      if (typeof wwRunGiftExpirySettlement === 'function') wwRunGiftExpirySettlement();
    } catch (_gexR) {}
    loadHbRecords();
  }
  if(pageId==='page-home') {
    try {
      if (typeof wwRunGiftExpirySettlement === 'function') wwRunGiftExpirySettlement();
    } catch (_gexH) {}
    try {
      if (typeof wwInitHomeAssetCardsFromCoins === 'function') wwInitHomeAssetCardsFromCoins();
    } catch (_cards) {}
    try {
      if (REAL_WALLET && typeof wwTryRestoreCachedHomeUi === 'function') wwTryRestoreCachedHomeUi();
    } catch (_snapH) {}
    try {
      if (REAL_WALLET && typeof wwTryRestoreCachedTxHistory === 'function') wwTryRestoreCachedTxHistory();
    } catch (_snapT) {}
    var _wvHomeRt =
      typeof wwGetChainViewWallet === 'function' ? wwGetChainViewWallet() : typeof REAL_WALLET !== 'undefined' ? REAL_WALLET : null;
    if (typeof wwWalletReadyForMainTabs === 'function' && wwWalletReadyForMainTabs()) {
      var _tb = document.getElementById('tabBar');
      if (_tb) _tb.style.display = 'flex';
    }
    if(typeof updateHomeChainStrip==='function') updateHomeChainStrip();
    if(typeof updateHomeBackupBanner==='function') updateHomeBackupBanner();
    if (_wvHomeRt && _wvHomeRt.trxAddress && typeof loadTrxResource === 'function') setTimeout(loadTrxResource, 400);
    if(typeof refreshHomePriceTicker==='function') setTimeout(refreshHomePriceTicker, 200);
    if (
      _wvHomeRt &&
      typeof wwWalletHasAnyChainAddress === 'function' &&
      wwWalletHasAnyChainAddress(_wvHomeRt) &&
      typeof updateQRCode === 'function'
    ) {
      setTimeout(updateQRCode, 250);
    }
  }
  if(pageId==='page-transfer') {
    if(typeof initTransferFeeSpeedUI==='function') initTransferFeeSpeedUI();
    calcTransferFee();
    renderTransferContactsList();
    try { if(typeof wwMevToggleInit==='function') wwMevToggleInit(); } catch(_wm) {}
    if (REAL_WALLET && typeof wwWalletHasAnyChainAddress === 'function' && wwWalletHasAnyChainAddress(REAL_WALLET) && typeof loadBalances === 'function') {
      void loadBalances().finally(function () {
        try { calcTransferFee(); } catch (_ctf) {}
      });
    }
  }
  if(pageId==='page-dapp') {
    setTimeout(function() {
      try {
        var inp = document.getElementById('dappUrlInput');
        if(inp) inp.focus();
      } catch(e) {}
    }, 200);
  }
  if (
    pageId === 'page-home' &&
    typeof wwWalletHasAnyChainAddressIncludingTemp === 'function' &&
    wwWalletHasAnyChainAddressIncludingTemp()
  ) {
    try {
      if (typeof loadTxHistory === 'function') void loadTxHistory();
    } catch (_ltx) {}
    try {
      if (typeof loadBalances === 'function') void loadBalances();
    } catch (_lb) {}
  }
  if (pageId === 'page-password-restore') {
    var _priRt = document.getElementById('pinRestorePageInput');
    var _preRt = document.getElementById('pageRestorePinError');
    if (_preRt) {
      _preRt.style.display = 'none';
      _preRt.textContent = '';
    }
    if (_priRt) _priRt.value = '';
    setTimeout(function () {
      try {
        if (_priRt) _priRt.focus();
      } catch (_f) {}
    }, 100);
  }
  try { if (typeof wwUpdateScrollTopBtn === 'function') wwUpdateScrollTopBtn(); } catch (e) {}
  try { wwSyncBottomNavForPage(pageId); } catch (_sn) {}
  try {
    var _h = '#' + pageId;
    if (location.hash !== _h) {
      if (typeof history !== 'undefined' && history.replaceState) {
        var _u = new URL(location.href);
        _u.hash = pageId;
        history.replaceState(null, '', _u.pathname + _u.search + _u.hash);
      } else {
        location.hash = _h;
      }
    }
  } catch (e) {}
  try {
    document.documentElement.classList.remove('ww-boot-route');
    document.documentElement.classList.remove('ww-instant-route');
    if (document.documentElement.getAttribute('data-ww-boot-page')) {
      document.documentElement.removeAttribute('data-ww-boot-page');
      var _wwBootStEnd = document.querySelector('style[data-ww-boot-route="1"]');
      if (_wwBootStEnd && _wwBootStEnd.parentNode) _wwBootStEnd.parentNode.removeChild(_wwBootStEnd);
    }
  } catch (_wwBootClrEnd) {}
  if (pageId === 'page-home') {
    try {
      setTimeout(function () {
        try {
          if (typeof wwEnsureHomeUiAfterRuntime === 'function') wwEnsureHomeUiAfterRuntime();
        } catch (_wh) {}
      }, 0);
    } catch (_ph) {}
  }
}

/** 密钥页「暂时忽略验证」：与验证通过同源（wwNavigateHomeAfterCreateFlow），仅 mnemonicVerified=false（保留未备份横幅）。 */
function wwSkipVerifyToHome() {
  try {
    if (typeof hideWalletLoading === 'function') hideWalletLoading();
  } catch (_h) {}
  try {
    if (typeof wwPromoteTempWalletForSkipVerify === 'function') wwPromoteTempWalletForSkipVerify();
    else if (typeof window.wwPromoteTempWalletForSkipVerify === 'function') window.wwPromoteTempWalletForSkipVerify();
  } catch (_p) {}
  try {
    if (typeof loadWallet === 'function') loadWallet();
  } catch (_lw) {}
  try {
    if (typeof wwNavigateHomeAfterCreateFlow === 'function') wwNavigateHomeAfterCreateFlow({ mnemonicVerified: false, pageId: 'page-home' });
    else if (typeof window.wwNavigateHomeAfterCreateFlow === 'function') {
      window.wwNavigateHomeAfterCreateFlow({ mnemonicVerified: false, pageId: 'page-home' });
    } else if (typeof goTo === 'function') goTo('page-home', { forceHome: true, instant: true });
  } catch (_n) {}
}
try {
  window.wwSkipVerifyToHome = wwSkipVerifyToHome;
} catch (_wwS) {}

/** 底栏 Tab 高亮与当前主页面一致（hash 直达、wwApplyHashRoute、goTo 导航时同步，勿仅依赖 goTab 点击） */
function wwSyncBottomNavForPage(pageId) {
  var map = { 'page-home': 'tab-home', 'page-addr': 'tab-addr', 'page-swap': 'tab-swap', 'page-hongbao': 'tab-hongbao', 'page-settings': 'tab-settings' };
  var tabId = map[pageId];
  var bar = document.getElementById('tabBar');
  if (!bar) return;
  bar.querySelectorAll('.tab-item').forEach(function (t) { t.classList.remove('active'); });
  if (!tabId) return;
  var ti = document.getElementById(tabId);
  if (ti) ti.classList.add('active');
}


async function resolveENS(name) {
  if (!name.endsWith('.eth')) return name;
  try {
    var provider =
      typeof wwGetEthProvider === 'function'
        ? wwGetEthProvider()
        : new ethers.providers.JsonRpcProvider(
            typeof ETH_RPC !== 'undefined' ? ETH_RPC : 'https://rpc.ankr.com/eth'
          );
    if (!provider) return name;
    const addr = await provider.resolveName(name);
    return addr || name;
  } catch(e) { return name; }
}

function goTab(tabId) {
  var targetPage = TAB_MAP[tabId] || 'page-home';
  var cur = document.querySelector('.page.active');
  if (cur && cur.id === targetPage) {
    document.querySelectorAll('.tab-item').forEach(function (t) { t.classList.remove('active'); });
    var ti = document.getElementById(tabId);
    if (ti) ti.classList.add('active');
    return;
  }
  document.querySelectorAll('.tab-item').forEach(t=>t.classList.remove('active'));
  document.getElementById(tabId)?.classList.add('active');
  goTo(targetPage);
}
/** 转账成功页「返回首页」：进入资产 Tab 并滚动到「我的资产」区域 */
function wwGoToAssetsHome() {
  goTab('tab-home');
  setTimeout(function () {
    try {
      var p = document.getElementById('page-home');
      var sec = p && p.querySelector('.assets-section');
      if (!p || !sec) return;
      var top = Math.max(0, sec.offsetTop - 16);
      try {
        p.scrollTo({ top: top, behavior: 'smooth' });
      } catch (_e) {
        p.scrollTop = top;
      }
    } catch (_e2) {}
  }, 80);
}
/** 兑换页「记录」：回首页并滚动到「最近交易」（#wwHomeTxSection） */
function wwGoHomeScrollToTxSection() {
  try {
    if (typeof goTo === 'function') goTo('page-home');
  } catch (_e) {}
  setTimeout(function () {
    try {
      var p = document.getElementById('page-home');
      var sec = document.getElementById('wwHomeTxSection') || (p && p.querySelector('.home-tx-section'));
      if (!p || !sec) return;
      var top = Math.max(0, sec.offsetTop - 12);
      try {
        p.scrollTo({ top: top, behavior: 'smooth' });
      } catch (_e2) {
        p.scrollTop = top;
      }
    } catch (_e3) {}
  }, 100);
}
function wwUpdateScrollTopBtn() {
  var btn = document.getElementById('wwScrollTopBtn');
  if (!btn) return;
  var p = document.querySelector('.page.active');
  btn.classList.toggle('ww-show', !!(p && p.scrollTop > 220));
}
function initBalancePrivacyToggle() {
  var btn = document.getElementById('balanceHideToggle');
  if (!btn) return;
  function apply() {
    var on = localStorage.getItem('ww_balance_privacy') === '1';
    document.documentElement.classList.toggle('ww-balance-hidden', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.textContent = on ? '\uD83D\uDE48' : '\uD83D\uDC41';
    btn.setAttribute('title', on ? '显示余额' : '隐藏余额');
  }
  apply();
  btn.addEventListener('click', function () {
    localStorage.setItem('ww_balance_privacy', localStorage.getItem('ww_balance_privacy') === '1' ? '0' : '1');
    apply();
  });
}
function initScrollTopBtn() {
  var btn = document.getElementById('wwScrollTopBtn');
  if (!btn) return;
  function bind() {
    document.querySelectorAll('.page').forEach(function (p) {
      p.addEventListener('scroll', function () { wwUpdateScrollTopBtn(); }, { passive: true });
    });
  }
  bind();
  btn.addEventListener('click', function () {
    var p = document.querySelector('.page.active');
    if (p) {
      try { p.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { p.scrollTop = 0; }
    }
  });
  window.addEventListener('resize', wwUpdateScrollTopBtn, { passive: true });
  setTimeout(wwUpdateScrollTopBtn, 0);
}
function initTabSwipeGesture() {
  var root = document.querySelector('.pages');
  if (!root) return;
  var order = ['tab-home', 'tab-addr', 'tab-swap', 'tab-hongbao', 'tab-settings'];
  var pageToTab = { 'page-home': 'tab-home', 'page-addr': 'tab-addr', 'page-swap': 'tab-swap', 'page-hongbao': 'tab-hongbao', 'page-settings': 'tab-settings' };
  var sx = 0, sy = 0, startEl = null;
  root.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) return;
    var t = e.touches[0];
    sx = t.clientX; sy = t.clientY; startEl = e.target;
  }, { passive: true });
  root.addEventListener('touchend', function (e) {
    var el = startEl;
    startEl = null;
    if (el && el.closest && el.closest('input,textarea,select,button,a,[contenteditable="true"]')) return;
    var t = e.changedTouches[0];
    var dx = t.clientX - sx, dy = t.clientY - sy;
    sx = sy = 0;
    if (Math.abs(dx) < 64 || Math.abs(dx) < Math.abs(dy) * 1.35) return;
    var active = document.querySelector('.page.active');
    if (!active) return;
    var tabId = pageToTab[active.id];
    if (!tabId) return;
    var i = order.indexOf(tabId);
    if (i < 0) return;
    if (dx < 0 && i < order.length - 1) goTab(order[i + 1]);
    else if (dx > 0 && i > 0) goTab(order[i - 1]);
  }, { passive: true });
}


function selectLang(btn) {
  document.querySelectorAll('#welcomeLangGrid .lang-row, #welcomeLangGrid .lang-btn').forEach(b=>{
    b.classList.remove('active');
    const check = b.querySelector('.lang-check');
    if(check) check.style.opacity='0';
  });
  btn.classList.add('active');
  const check = btn.querySelector('.lang-check');
  if(check) check.style.opacity='1';
  currentLang = btn.dataset.lang;
}

// renderKeyGrid 以 wallet.ui.js 为准（TEMP_WALLET / REAL_WALLET / keyMnemonicLang）；勿在此重复定义以免覆盖并错误 goTo('page-create')

function shortChainAddr(addr) {
  if (!addr || addr === '--') return '—';
  const t = String(addr).trim();
  if (t.length <= 12) return t;
  return t.slice(0, 5) + '…' + t.slice(-4);
}
function updateHomeChainStrip() {
  const strip = document.getElementById('homeChainStrip');
  const trxEl = document.getElementById('homeShortTrx');
  const ethEl = document.getElementById('homeShortEth');
  const btcEl = document.getElementById('homeShortBtc');
  const btcWrap = document.getElementById('homeMiniBtcWrap');
  if (!strip || !trxEl || !ethEl) return;
  var wvStrip = typeof wwGetChainViewWallet === 'function' ? wwGetChainViewWallet() : null;
  if (!wvStrip || !wwWalletHasAnyChainAddress(wvStrip)) {
    trxEl.textContent = '—';
    ethEl.textContent = '—';
    if (btcEl) btcEl.textContent = '—';
    if (btcWrap) btcWrap.style.display = 'flex';
    strip.classList.add('home-chain-strip--dim');
    return;
  }
  const trx = wvStrip.trxAddress || '';
  const eth = wvStrip.ethAddress || '';
  const btc = wvStrip.btcAddress || '';
  if (typeof wwCopyableShortChainHtml === 'function') {
    trxEl.innerHTML = wwCopyableShortChainHtml(trx || '--');
    ethEl.innerHTML = wwCopyableShortChainHtml(eth || '--');
    if (btc && btc.length > 2 && btc !== '--') {
      btcEl.innerHTML = wwCopyableShortChainHtml(btc);
    } else {
      btcEl.textContent = '—';
    }
  } else {
    trxEl.textContent = shortChainAddr(trx || '--');
    ethEl.textContent = shortChainAddr(eth || '--');
    if (btc && btc.length > 2 && btc !== '--') {
      btcEl.textContent = shortChainAddr(btc);
    } else {
      btcEl.textContent = '—';
    }
  }
  if (btcWrap) btcWrap.style.display = 'flex';
  strip.classList.remove('home-chain-strip--dim');
}

function updateHomeBackupBanner() {
  var b = document.getElementById('homeBackupBanner');
  if (!b) return;
  /* 未确认备份 ≠ 未派生：任一条链上地址存在即视为已派生，仅提示离线备份 */
  var show =
    REAL_WALLET &&
    typeof wwWalletHasAnyChainAddress === 'function' &&
    wwWalletHasAnyChainAddress(REAL_WALLET) &&
    !REAL_WALLET.backedUp;
  b.style.display = show ? 'block' : 'none';
}

function getMnemonicStrengthDisplay() {
  var n = 12;
  // 必须与 renderKeyGrid（wallet.ui.js）同源：TEMP_WALLET 优先，否则 REAL_WALLET；勿仅用 REAL，否则密钥页展示临时 12 词时强度仍按已保存 18 词显示
  var tw = typeof window.TEMP_WALLET !== 'undefined' ? window.TEMP_WALLET : null;
  var rw = typeof REAL_WALLET !== 'undefined' ? REAL_WALLET : null;
  var enMnemonic =
    (tw && (tw.mnemonic || tw.enMnemonic)) ||
    (rw && (rw.enMnemonic || rw.mnemonic));
  if (enMnemonic) {
    var wc = String(enMnemonic).trim().split(/\s+/).filter(Boolean).length;
    if ([12, 15, 18, 21, 24].includes(wc)) n = wc;
  } else if ([12, 15, 18, 21, 24].includes(currentMnemonicLength)) {
    n = currentMnemonicLength;
  }
  if (![12,15,18,21,24].includes(n)) n = 12;
  var bitsMap = {12:128,15:160,18:192,21:224,24:256};
  var bits = bitsMap[n] || 128;
  var levels = {12:'标准',15:'良好',18:'强',21:'很强',24:'极高'};
  var level = levels[n] || '标准';
  return { bits: bits, level: level, n: n };
}

function updateMnemonicStrengthIndicator() {
  var elBits = document.getElementById('mnemonicStrengthBits');
  var elLevel = document.getElementById('mnemonicStrengthLevel');
  if (!elBits || !elLevel) return;
  var d = getMnemonicStrengthDisplay();
  elBits.textContent = String(d.bits);
  elLevel.textContent = d.level;
}

function setTransferQuickAmount(amt) {
  var inp = document.getElementById('transferAmount');
  if (!inp) return;
  inp.value = String(amt);
  if (typeof calcTransferFee === 'function') calcTransferFee();
}

function copySingle(text, el) {
  navigator.clipboard?.writeText(text).catch(()=>{});
  const orig=el.textContent; el.textContent='✅';
  setTimeout(()=>el.textContent=orig,1500);
}

function showQR() { document.getElementById('qrOverlay').classList.add('show'); }

/* currentQRChain 由 wallet.ui.js 声明为 var */
/* QR_CHAIN_DATA 由 wallet.ui.js 声明 */
function switchQRChain(chain) {
  currentQRChain = chain;
  const btns = ['native','trx','eth','btc'];
  btns.forEach(b => {
    const el = document.getElementById('qrBtn'+b.charAt(0).toUpperCase()+b.slice(1));
    if(!el) return;
    if(b===chain) {
      el.style.borderColor='rgba(200,168,75,0.4)';
      el.style.color='var(--gold)';
      el.style.background='linear-gradient(135deg,rgba(200,168,75,0.15),rgba(200,168,75,0.05))';
    } else {
      el.style.borderColor='var(--border)';
      el.style.color='var(--text-muted)';
      el.style.background='var(--bg3)';
    }
  });
  updateQRDisplay();
}

function updateQRDisplay() {
  const isEn = currentLang==='en';
  const p1 = document.getElementById('qrPart1');
  const p2 = document.getElementById('qrPart2');
  if(!p1) return;
  var vwQr = typeof wwGetChainViewWallet === 'function' ? wwGetChainViewWallet() : null;
  const sel = document.getElementById('qrChainSelect');
  const chain = (sel && sel.value) || 'trx';
  const isEth = chain === 'eth';
  var pubRaw = '--';
  if (isEth) {
    pubRaw = (vwQr && vwQr.ethAddress) ? vwQr.ethAddress : '--';
  } else {
    pubRaw = (vwQr && vwQr.trxAddress) ? vwQr.trxAddress : (typeof CHAIN_ADDR !== 'undefined' ? CHAIN_ADDR : '--');
  }
  const pubEsc = String(pubRaw).replace(/</g, '&lt;');
  const badge = isEth ? 'ETH' : 'TRX';
  const col = isEth ? '#aaaaff' : '#ff9a9a';
  if(isEn) {
    p1.innerHTML = '<span style="color:var(--text-muted);font-size:11px;word-break:break-all">'+pubEsc+'</span>';
    if(p2) p2.style.display = 'none';
  } else {
    const prefix = (document.getElementById('addrPrefix')?.textContent || '').replace(/\D/g,'').substring(0,8);
    const suffix = (document.getElementById('addrSuffix')?.textContent || '').replace(/\D/g,'').substring(0,8);
    let html = '<span style="color:var(--text-muted);font-family:monospace;font-size:11px">'+prefix+'</span>';
    if(ADDR_WORDS.length) {
      ADDR_WORDS.forEach(w => {
        html += w.custom
          ? '<span style="color:#f0d070;font-size:13px;font-weight:700">'+w.word+'</span>'
          : '<span style="color:#8888bb;font-size:12px">'+w.word+'</span>';
      });
    }
    html += '<span style="color:var(--text-muted);font-family:monospace;font-size:11px">'+suffix+'</span>';
    p1.innerHTML = html;
    p1.style.cssText = 'text-align:center;display:block;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
    if(p2) {
      p2.innerHTML = '<div style="text-align:center;margin-top:8px"><span style="font-size:10px;color:var(--text-muted);letter-spacing:0.5px">'+badge+' · 公链地址</span></div><div style="text-align:center;margin-top:4px"><span style="color:'+col+';font-size:11px;font-family:monospace;word-break:break-all;line-height:1.45">'+pubEsc+'</span></div>';
      p2.style.display = 'block';
    }
  }
}

function toggleQRChain() {
  const chains = ['native','trx','eth','btc'];
  const idx = chains.indexOf(currentQRChain);
  switchQRChain(chains[(idx+1)%chains.length]);
}
function hideQR() { document.getElementById('qrOverlay').classList.remove('show'); }


// KEYWORDS_ZH 已迁移到 KW_ZH
// KEYWORDS_EN 已迁移到 KW_EN
// Must not reference KW_ZH here — const KW_ZH is declared later (TDZ).
/* currentKeyword 由 wallet.ui.js 声明为 var */

function getKeywords() {
  return (typeof LANG_KW!=='undefined' ? LANG_KW[currentLang] : null) || KW_ZH || [];
}

function refreshKeyword() {
  const kws = getKeywords();
  const idx = Math.floor(Math.random() * kws.length);
  currentKeyword = kws[idx];
  // 更新关键词显示（多个可能的 DOM id）
  ['hbKeyword','kwKeyword','kwShareKeyword'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.textContent=currentKeyword;
  });
}

function setAmount(v) {
  document.getElementById('hbAmount').value = v;
  updateHbPreview();
}

function claimHongbao() {
  submitClaim(); // 调用真实领取
}

function copyKeyword() {
  navigator.clipboard?.writeText(currentKeyword).catch(()=>{});
  const btn = event?.target?.closest('div');
  if(btn) { const old = btn.textContent; btn.textContent = '✅ 已复制'; setTimeout(()=>btn.textContent=old, 1500); }
}




function toggleBatchSendPanel() {
  const p = document.getElementById('batchSendPanel');
  const box = document.getElementById('transferAddrBox');
  const t = document.getElementById('batchSendToggle');
  if(!p || !box) return;
  const opening = p.style.display === 'none' || !p.style.display;
  if(opening) {
    p.style.display = 'block';
    box.style.display = 'none';
    if(t) t.textContent = '✏️ 单笔转账';
  } else {
    p.style.display = 'none';
    box.style.display = '';
    if(t) t.textContent = '📋 批量发送';
  }
}

async function runBatchTransfer() {
  const ta = document.getElementById('batchTransferLines');
  const lines = (ta && ta.value ? ta.value : '').split(/\n/).map(function(l) { return l.trim(); }).filter(Boolean);
  const amt = parseFloat(document.getElementById('transferAmount').value);
  if(!lines.length) { showToast('❌ 请至少输入一个地址', 'error'); return; }
  if(!amt || amt <= 0) { showToast('❌ 请输入有效金额', 'error'); return; }
  if(!REAL_WALLET) { showToast('⚠️ 请先创建或导入钱包', 'warning'); return; }
  const bal = Number(transferCoin.bal) || 0;
  const n = lines.length;
  if(amt * n > bal + 1e-10) { showToast('❌ 总金额超过可用余额（共'+n+'笔）', 'error'); if(typeof shakeTransferAmountTooHigh==='function') shakeTransferAmountTooHigh(); return; }
  if((typeof wwIsOnline === 'function') ? !wwIsOnline() : (typeof navigator !== 'undefined' && navigator.onLine === false)) {
    showToast('📡 当前无网络，请联网后再发送', 'warning');
    return;
  }
  if(!confirm('将向 '+n+' 个地址各发送 '+amt+' '+transferCoin.name+'，确认？')) return;
  let okCount = 0;
  for(let i = 0; i < lines.length; i++) {
    document.getElementById('transferAddr').value = lines[i];
    document.getElementById('transferAmount').value = String(amt);
    const ok = await broadcastRealTransfer();
    if(ok) { okCount++; if(typeof saveRecentTransferAddr==='function') saveRecentTransferAddr(lines[i]); }
    else { showToast('第 '+(i+1)+' 笔发送失败，已停止', 'error'); break; }
    await new Promise(function(r) { setTimeout(r, 450); });
  }
  showToast('完成：成功 '+okCount+' / '+n, okCount === n ? 'success' : 'warning');
  if(typeof loadBalances==='function') loadBalances();
  if(okCount > 0) goTo('page-home');
}

/** 返回 null 表示加载中或未知，不得当作 0 用于「隐藏零余额」 */
function parseAssetDisplayBalance(balId) {
  const el = document.getElementById(balId);
  if(!el) return null;
  const t = (el.textContent || '').replace(/,/g,'').trim();
  if(t === '--' || t === '...' || !t) return null;
  const n = parseFloat(t);
  return isNaN(n) ? null : n;
}

/** usdt → Usdt，与 loadBalances 中 balUsdt / valUsdt 等 id 一致 */
function wwCapCoinId(raw) {
  if (raw == null || raw === '') return '';
  var s = String(raw);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** 将 COINS 渲染进 #wwHomeAssetCardsMount；须在快照恢复与 loadBalances 之前调用 */
function wwInitHomeAssetCardsFromCoins() {
  var mount = document.getElementById('wwHomeAssetCardsMount');
  if (!mount || typeof COINS === 'undefined' || !COINS.length) return;
  if (mount.querySelector && mount.querySelector('.asset-card')) return;
  var parts = [];
  COINS.forEach(function (c) {
    if (!c || !c.id) return;
    var cap = wwCapCoinId(c.id);
    var nm = String(c.name || cap).replace(/</g, '');
    var chain = String(c.chain || '').replace(/</g, '');
    var bg = c.logoUrl ? 'rgba(255,255,255,0.06)' : (c.bg || 'rgba(128,128,128,0.12)');
    var cid = String(c.id).replace(/"/g, '');
    var chgExtra = c.id === 'usdt' ? ' down' : '';
    var iconInner = typeof wwCoinIconInnerHtml === 'function' ? wwCoinIconInnerHtml(c, 40) : '';
    parts.push(
      '<div class="asset-item asset-card" id="assetRow' + cap + '" data-coin="' + cid + '" data-ww-fn="selectTransferCoin">' +
        '<div class="asset-icon ww-coin-icon-ring" style="background:' + bg + '">' + iconInner + '</div>' +
        '<div class="asset-info"><div class="asset-name">' + nm + '</div><div class="asset-chain">' + chain + '</div></div>' +
        '<div class="asset-right">' +
          '<div class="asset-amount" id="bal' + cap + '">0.0000</div>' +
          '<div class="asset-value" id="val' + cap + '">$0.00</div>' +
          '<div class="asset-change' + chgExtra + '" id="chg' + cap + '">--</div>' +
        '</div>' +
      '</div>'
    );
  });
  mount.innerHTML = parts.join('');
}

function applyHideZeroTokens() {
  let storedHide = false;
  try { storedHide = localStorage.getItem('ww_hide_zero_tokens') === '1'; } catch (e) {}
  const cb = document.getElementById('hideZeroTokens');
  if (cb) cb.checked = storedHide;
  // 默认展示全部币种；仅当勾选「隐藏零余额」时隐藏数值为 0 的资产行（与 #hideZeroTokens 一致）
  const hide = cb ? !!cb.checked : false;
  /* 首帧 goTo(page-home) 早于 runtime 时尚未执行 loadBalances，占位为 0；此时隐藏会导致「我的资产」整段空白 */
  var hydrated = typeof window !== 'undefined' && window._wwHomeBalancesHydrated;
  const hideZeros = hide && hydrated;
  const rows =
    typeof wwHomeAssetRowsMeta === 'function'
      ? wwHomeAssetRowsMeta()
      : [
          { id: 'assetRowUsdt', balId: 'balUsdt' },
          { id: 'assetRowTrx', balId: 'balTrx' },
          { id: 'assetRowEth', balId: 'balEth' },
          { id: 'assetRowBtc', balId: 'balBtc' },
        ];
  rows.forEach(function(row) {
    const el = document.getElementById(row.id);
    if(!el) return;
    const v = parseAssetDisplayBalance(row.balId);
    if(v === null) { el.style.display = ''; return; }
    el.style.display = (hideZeros && v <= 1e-12) ? 'none' : '';
  });
}

function onHideZeroTokensChange() {
  const cb = document.getElementById('hideZeroTokens');
  try { localStorage.setItem('ww_hide_zero_tokens', cb && cb.checked ? '1' : '0'); } catch(e) {}
  applyHideZeroTokens();
}

/* getMnemonicWordsForDisplay：以 wallet.ui.js 为准（keyMnemonicLang + getMnemonicWordlistLang，勿用 currentLang 覆盖） */

async function copyMnemonicAsCardImage(btn) {
  if (typeof showToast === 'function') showToast('为保障安全，已禁止导出或复制助记词图片，请用纸笔抄写', 'warning');
}

// ── 真实转账实现 ──────────────────────────────────────────────────
function wwFmtNum(n) {
  if(n === undefined || n === null || isNaN(n)) return '0';
  var x = Math.floor(Number(n));
  return x.toLocaleString('en-US');
}
async function loadTrxResource() {
  var card = document.getElementById('trxResourceCard');
  var enEl = document.getElementById('trxEnergyText');
  var bwEl = document.getElementById('trxBandwidthText');
  var _vwTrx =
    typeof wwGetChainViewWallet === 'function' ? wwGetChainViewWallet() : typeof REAL_WALLET !== 'undefined' ? REAL_WALLET : null;
  if (!card || !_vwTrx || !_vwTrx.trxAddress) {
    if (card) card.style.display = 'none';
    return;
  }
  try {
    var _trxRoot = typeof wwTronGridBase === 'function' ? wwTronGridBase() : String(TRON_GRID || '').replace(/\/$/, '') || 'https://api.trongrid.io';
    var _hdr = typeof wwMergeHeaders === 'function'
      ? wwMergeHeaders({ 'Content-Type': 'application/json' }, typeof wwTronHeaders === 'function' ? wwTronHeaders() : {})
      : { 'Content-Type': 'application/json' };
    var r = await (typeof wwFetchRetry === 'function' ? wwFetchRetry : fetch)(_trxRoot + '/wallet/getaccountresource', {
      method: 'POST',
      headers: _hdr,
      body: JSON.stringify({ address: _vwTrx.trxAddress, visible: true })
    });
    var d = await r.json();
    if(!d || (d.EnergyLimit === undefined && d.NetLimit === undefined && d.freeNetLimit === undefined)) {
      card.style.display = 'none';
      return;
    }
    card.style.display = 'block';
    var eLim = Number(d.EnergyLimit) || 0, eUsed = Number(d.EnergyUsed) || 0;
    var nLim = Number(d.NetLimit) || 0, nUsed = Number(d.NetUsed) || 0;
    var freeLim = Number(d.freeNetLimit) || 600;
    var freeUsed = Number(d.freeNetUsed) || 0;
    var eRem = Math.max(0, eLim - eUsed);
    var stakeBwRem = Math.max(0, nLim - nUsed);
    var freeBwRem = Math.max(0, freeLim - freeUsed);
    var bwAvail = stakeBwRem + freeBwRem;
    if(enEl) enEl.textContent = '剩余 ' + wwFmtNum(eRem) + ' / 上限 ' + wwFmtNum(eLim);
    if(bwEl) bwEl.textContent = '可用约 ' + wwFmtNum(bwAvail) + '（免费 ' + wwFmtNum(freeBwRem) + ' + 质押 ' + wwFmtNum(stakeBwRem) + '）';
  } catch(e) {
    console.log('loadTrxResource', e);
    if(card) card.style.display = 'none';
  }
}
function wwLoadDappUrl() {
  var inp = document.getElementById('dappUrlInput');
  var f = document.getElementById('dappFrame');
  if(!f) return;
  var u = inp && inp.value ? inp.value.trim() : '';
  if(!u) { if(typeof showToast==='function') showToast('请输入网址', 'warning'); return; }
  if(!/^https?:\/\//i.test(u)) u = 'https://' + u;
  try {
    f.src = u;
  } catch(e1) {
    if(typeof showToast==='function') showToast('无法打开链接', 'error');
  }
}
function wwDappReload() {
  var f = document.getElementById('dappFrame');
  if(f && f.src) { try { f.contentWindow.location.reload(); } catch(e) { f.src = f.src; } }
}
function wwGetIdleLockMinutes() {
  try {
    var v = localStorage.getItem('ww_lock_idle_min');
    if(v === '1' || v === '5' || v === '15') return parseInt(v, 10);
  } catch(e) {}
  return 0;
}
function wwApplyIdleLockLabel() {
  var el = document.getElementById('settingsIdleLockValue');
  if(!el) return;
  var m = wwGetIdleLockMinutes();
  if(m === 1) el.textContent = '1 分钟';
  else if(m === 5) el.textContent = '5 分钟';
  else if(m === 15) el.textContent = '15 分钟';
  else el.textContent = '关闭';
}
function wwCycleIdleLockMinutes() {
  var cur = wwGetIdleLockMinutes();
  var next = cur === 0 ? 1 : (cur === 1 ? 5 : (cur === 5 ? 15 : 0));
  try {
    if(next === 0) localStorage.removeItem('ww_lock_idle_min');
    else localStorage.setItem('ww_lock_idle_min', String(next));
  } catch(e) {}
  wwApplyIdleLockLabel();
  wwResetActivityClock();
  if(typeof showToast==='function') showToast(next === 0 ? '已关闭闲置锁定' : ('闲置 ' + next + ' 分钟后锁定'), 'info', 2200);
}
function wwResetActivityClock() {
  window._wwLastActivityTs = Date.now();
}
function wwTickIdleLock() {
  var mins = wwGetIdleLockMinutes();
  if(!mins) return;
  if(!wwHasPinConfigured()) return;
  if(!REAL_WALLET) return;
  var pov = document.getElementById('pinUnlockOverlay');
  var tov = document.getElementById('totpUnlockOverlay');
  if(pov && pov.classList.contains('show')) return;
  if(tov && tov.classList.contains('show')) return;
  var last = window._wwLastActivityTs || Date.now();
  if(Date.now() - last < mins * 60 * 1000) return;
  window._wwUnlockPreservePage = true;
  window._wwForceIdleLock = true;
  var inp = document.getElementById('pinUnlockInput');
  var err = document.getElementById('pinUnlockError');
  if(pov && inp) {
    inp.value = '';
    if(err) err.style.display = 'none';
    pov.classList.add('show');
    try { if (typeof wwRefreshAntiPhishOnPinUnlock === 'function') wwRefreshAntiPhishOnPinUnlock(); } catch (_ap3) {}
    setTimeout(function() { try { inp.focus(); } catch(e) {} }, 200);
  }
  wwCleanupMemory();
  try { wwCleanupStorage(); } catch (_wcs2) {}
  window._wwUnlockPreservePage = true;
  window._wwForceIdleLock = true;
}

/* TRON_GRID / USDT_TRC20 / ETH_RPC 由 wallet.ui.js 声明 */

function shakeTransferAmountTooHigh() {
  try {
    var el = document.getElementById('transferAmount');
    if (!el) return;
    var i = 0;
    var id = setInterval(function () {
      el.style.transform = (i++ % 2) ? 'translateX(4px)' : 'translateX(-4px)';
      if (i > 6) {
        clearInterval(id);
        el.style.transform = '';
      }
    }, 45);
  } catch (_e) {}
}

/**
 * 链上广播转账（唯一实现；wallet.ui.js 已移除同名函数以避免双份维护）。
 * 顺序：空地址 → 链别格式与万语解析 → 禁止自转 → 白名单（万语解析后可按 T 地址命中）→ 金额与余额 → 广播 → 成功后清理内存私钥。
 */
async function broadcastRealTransfer() {
  if(!REAL_WALLET) { showToast('⚠️ 请先创建或导入钱包', 'warning'); return false; }
  const addr = document.getElementById('transferAddr').value.trim();
  const amt = parseFloat(document.getElementById('transferAmount').value);
  const coin = transferCoin.id;
  var tronRecipient = addr;

  if (!addr) {
    showToast('❌ 请输入收款地址', 'error');
    return false;
  }
  if (coin === 'trx' || coin === 'usdt') {
    if (typeof wwResolveWanYuToTronChainAddress === 'function') {
      tronRecipient = await wwResolveWanYuToTronChainAddress(addr);
    }
    if (!tronRecipient || !/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(tronRecipient)) {
      showToast(typeof WW_MSG_ADDR_WRONG !== 'undefined' ? WW_MSG_ADDR_WRONG : '地址有误，请核对地址', 'error');
      return false;
    }
    if (typeof loadTronWeb === 'function') await loadTronWeb();
    if (typeof TronWeb !== 'undefined' && TronWeb.isAddress && !TronWeb.isAddress(tronRecipient)) {
      showToast(typeof WW_MSG_ADDR_WRONG !== 'undefined' ? WW_MSG_ADDR_WRONG : '地址有误，请核对地址', 'error');
      return false;
    }
  } else if (coin === 'eth') {
    if (!addr.match(/^0x[a-fA-F0-9]{40}$/)) {
      showToast(typeof WW_MSG_ADDR_WRONG !== 'undefined' ? WW_MSG_ADDR_WRONG : '地址有误，请核对地址', 'error');
      return false;
    }
  }
  if (coin === 'eth' && REAL_WALLET.ethAddress && /^0x[a-fA-F0-9]{40}$/.test(addr) && addr.toLowerCase() === String(REAL_WALLET.ethAddress).toLowerCase()) {
    showToast(typeof WW_MSG_TRANSFER_SELF !== 'undefined' ? WW_MSG_TRANSFER_SELF : '不能给自己转账', 'error');
    return false;
  }
  if ((coin === 'usdt' || coin === 'trx') && REAL_WALLET.trxAddress && tronRecipient === REAL_WALLET.trxAddress) {
    showToast(typeof WW_MSG_TRANSFER_SELF !== 'undefined' ? WW_MSG_TRANSFER_SELF : '不能给自己转账', 'error');
    return false;
  }
  if (typeof wwTransferWhitelistCheck === 'function' && !wwTransferWhitelistCheck(addr) && !(tronRecipient !== addr && wwTransferWhitelistCheck(tronRecipient))) {
    showToast('❌ 收款地址未通过「转账白名单」校验。请在 设置 → 转账白名单 中添加该地址或关闭白名单。', 'error');
    return false;
  }
  if (!isFinite(amt) || amt <= 0) {
    showToast('❌ 请输入有效转账金额', 'error');
    return false;
  }
  if (amt > 10000) { showToast('单笔超10000限额', 'error'); return false; }
  var balAvail = 0;
  if (typeof COINS !== 'undefined' && COINS.length) {
    var cFound = COINS.filter(function (c) { return c.id === coin; })[0];
    if (cFound) balAvail = Number(cFound.bal) || 0;
  }
  if (!balAvail && typeof transferCoin !== 'undefined' && transferCoin) balAvail = Number(transferCoin.bal) || 0;
  if (balAvail < amt) {
    showToast('❌ 余额不足', 'error');
    return false;
  }

  const txkey = Date.now() + Math.random();
  window._wwPendingTxs = window._wwPendingTxs || {};
  window._wwPendingTxs[txkey] = { coin: coin, addr: addr, amt: amt, time: Date.now() };
  try {
    let txHash = '';

    if (coin === 'usdt') {
      txHash = await sendUSDT_TRC20(tronRecipient, amt);
    } else if (coin === 'trx') {
      txHash = await sendTRX(tronRecipient, amt);
    } else if (coin === 'eth') {
      txHash = await sendETH(addr, amt);
    } else {
      showToast('⚠️ 暂不支持 ' + transferCoin.name + ' 转账', 'warning');
      return false;
    }

    if (txHash) {
      try {
        if (REAL_WALLET) {
          try { delete REAL_WALLET.privateKey; } catch (_k1) {}
          try { delete REAL_WALLET.trxPrivateKey; } catch (_k2) {}
          window.REAL_WALLET = REAL_WALLET;
        }
      } catch (_clr) {}
      try { if (typeof wwRecordSpendAfterBroadcast === 'function') wwRecordSpendAfterBroadcast(amt); } catch (_rs) {}
      try {
        if (typeof wwAppendLocalTxLog === 'function' && (coin === 'usdt' || coin === 'trx')) {
          wwAppendLocalTxLog({
            hash: txHash,
            coin: coin === 'usdt' ? 'USDT' : 'TRX',
            amount: '-' + String(amt),
            addr: tronRecipient || addr,
            ts: Date.now()
          });
        }
      } catch (_loc) {}
      _safeEl('successTxHash') && ((_safeEl('successTxHash') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* successTxHash fallback */.textContent = txHash);
      _safeEl('successTxLink') && (_safeEl('successTxLink').href =
        coin === 'eth' ? 'https://etherscan.io/tx/' + txHash : 'https://tronscan.org/#/transaction/' + txHash);
      return true;
    }
  } catch (e) {
    console.error('转账失败:', e);
    showToast('❌ 转账失败: ' + (e.message || e), 'error');
  } finally {
    try { delete window._wwPendingTxs[txkey]; } catch (_pt) {}
  }
  return false;
}

async function sendUSDT_TRC20(toAddr, amount) {
  var run = async function () {
  if (typeof REAL_WALLET === 'undefined' || !REAL_WALLET) throw new Error('钱包未就绪');
  var pkTron = REAL_WALLET.trxPrivateKey || REAL_WALLET.privateKey;
  if (!pkTron || String(pkTron).length < 8) throw new Error('请先解锁钱包后再转账');
  await loadTronWeb();
  const tw = new TronWeb(typeof wwTronWebOptions === 'function' ? wwTronWebOptions() : { fullHost: TRON_GRID });
  tw.setPrivateKey(pkTron);
  if(!Number.isFinite(amount) || amount <= 0 || amount > 1e8) { throw new Error('金额范围错误'); }
  const amtSun = Math.floor(amount * 1e6);
  if(amtSun <= 0 || amtSun > 1e14) { throw new Error('精度错误'); }
  const tx = await tw.transactionBuilder.triggerSmartContract(
    USDT_TRC20,
    'transfer(address,uint256)',
    { feeLimit: (typeof getTronFeeLimitUsdt==='function' ? getTronFeeLimitUsdt() : 20000000) },
    [
      { type: 'address', value: toAddr },
      { type: 'uint256', value: amtSun }
    ],
    REAL_WALLET.trxAddress // Base58格式，TronWeb自动处理
  );
  const signed = await tw.trx.sign(tx.transaction);
  const result = await tw.trx.sendRawTransaction(signed);
  if(result.result) return result.txid;
  throw new Error(result.message || 'USDT 广播失败');
  };
  if (typeof wwWithWalletSensitive === 'function') return wwWithWalletSensitive(run);
  return run();
}

async function sendTRX(toAddr, amount) {
  var run = async function () {
  if (typeof REAL_WALLET === 'undefined' || !REAL_WALLET) throw new Error('钱包未就绪');
  var pkTron = REAL_WALLET.trxPrivateKey || REAL_WALLET.privateKey;
  if (!pkTron || String(pkTron).length < 8) throw new Error('请先解锁钱包后再转账');
  await loadTronWeb();
  const tw = new TronWeb(typeof wwTronWebOptions === 'function' ? wwTronWebOptions() : { fullHost: TRON_GRID });
  tw.setPrivateKey(pkTron);
  if(typeof TronWeb !== 'undefined' && typeof TronWeb.isAddress === 'function') {
    if(!TronWeb.isAddress(toAddr)) { throw new Error('TRON地址格式错误'); }
  } else if(!toAddr.match(/^T[a-zA-Z0-9]{33}$/)) {
    throw new Error('TRON地址格式错误');
  }
  const amtSun = Math.floor(amount * 1e6);
  if(!toAddr.match(/^T[a-zA-Z0-9]{33}$/)) { throw new Error('TRON地址格式错误'); }
  const tx = await tw.transactionBuilder.sendTrx(toAddr, amtSun, REAL_WALLET.trxAddress, { feeLimit: (typeof getTronFeeLimitTrx==='function' ? getTronFeeLimitTrx() : 25000000) });
  const signed = await tw.trx.sign(tx);
  const result = await tw.trx.sendRawTransaction(signed);
  if(result.result) return result.txid;
  throw new Error(result.message || 'TRX 广播失败');
  };
  if (typeof wwWithWalletSensitive === 'function') return wwWithWalletSensitive(run);
  return run();
}

async function sendETH(toAddr, amount) {
  var run = async function () {
  if (typeof REAL_WALLET === 'undefined' || !REAL_WALLET) throw new Error('钱包未就绪');
  var pkEth = REAL_WALLET.privateKey;
  if (!pkEth) throw new Error('请先解锁钱包后再转账');
  var provider =
    typeof wwGetEthProvider === 'function'
      ? wwGetEthProvider()
      : new ethers.providers.JsonRpcProvider(typeof ETH_RPC !== 'undefined' ? ETH_RPC : 'https://rpc.ankr.com/eth');
  if (!provider) throw new Error('以太坊网络未就绪');
  if(!ethers.utils.isAddress(toAddr)){throw new Error('以太坊地址无效');}
  toAddr = ethers.utils.getAddress(toAddr);
  var wallet;
  try {
    wallet = new ethers.Wallet(pkEth, provider);
  } catch (_wErr) {
    throw new Error('请先解锁钱包后再转账');
  }
  const sp = (typeof getTransferFeeSpeed === 'function') ? getTransferFeeSpeed() : 'normal';
  const mult = sp === 'slow' ? 0.88 : sp === 'fast' ? 1.24 : 1;
  const fd = await provider.getFeeData();
  const txReq = {
    to: toAddr,
    value: ethers.utils.parseEther(amount.toString()),
    gasLimit: ethers.BigNumber.from('21000')
  };
  const est = await provider.estimateGas(txReq).catch(function () { return ethers.BigNumber.from('21000'); });
  txReq.gasLimit = est.mul(120).div(100);
  const m = Math.round(mult * 100);
  if(fd.maxFeePerGas && fd.maxPriorityFeePerGas) {
    txReq.maxFeePerGas = fd.maxFeePerGas.mul(m).div(100);
    txReq.maxPriorityFeePerGas = fd.maxPriorityFeePerGas.mul(m).div(100);
  } else if(fd.gasPrice) {
    txReq.gasPrice = fd.gasPrice.mul(m).div(100);
  }
  const tx = await wallet.sendTransaction(txReq);
  await tx.wait(1);
  return tx.hash;
  };
  if (typeof wwWithWalletSensitive === 'function') return wwWithWalletSensitive(run);
  return run();
}

// ══ 转账系统 ══
/* transferCoin 由 wallet.ui.js 声明为 var */

/* WW_RECENT_ADDR_KEY / WW_CONTACTS_KEY 由 wallet.ui.js 声明 */
function getRecentTransferAddrs() {
  try {
    const raw = localStorage.getItem(WW_RECENT_ADDR_KEY);
    const a = raw ? JSON.parse(raw) : [];
    return Array.isArray(a) ? a.filter(x => typeof x === 'string' && x.trim()) : [];
  } catch(e) { return []; }
}
function saveRecentTransferAddr(addr) {
  const t = (addr || '').trim();
  if(!t) return;
  let list = getRecentTransferAddrs().filter(x => x !== t);
  list.unshift(t);
  if(list.length > 24) list = list.slice(0, 24);
  try { localStorage.setItem(WW_RECENT_ADDR_KEY, JSON.stringify(list)); } catch(e) {}
}

function getTransferContacts() {
  try {
    const raw = localStorage.getItem(WW_CONTACTS_KEY);
    const a = raw ? JSON.parse(raw) : [];
    return Array.isArray(a) ? a.filter(x => x && typeof x.addr === 'string' && x.addr.trim() && typeof x.nick === 'string') : [];
  } catch(e) { return []; }
}
function setTransferContacts(list) {
  try { localStorage.setItem(WW_CONTACTS_KEY, JSON.stringify(list.slice(0, 48))); } catch(e) {}
}
function saveTransferContact(addr, nick) {
  const a = (addr || '').trim();
  const n = ((nick || '').trim() || '未命名').slice(0, 32);
  if(!a) return;
  let list = getTransferContacts().filter(c => c.addr.trim().toLowerCase() !== a.toLowerCase());
  list.unshift({ addr: a, nick: n });
  setTransferContacts(list);
  renderTransferContactsList();
  showToast('已保存联系人', 'success');
}
function removeTransferContact(addr) {
  const t = (addr || '').trim().toLowerCase();
  if(!t) return;
  setTransferContacts(getTransferContacts().filter(c => c.addr.trim().toLowerCase() !== t));
  renderTransferContactsList();
}
function toggleContactAddForm() {
  const f = document.getElementById('transferContactAddForm');
  if(!f) return;
  const open = f.style.display === 'none' || !f.style.display || f.style.display === '';
  f.style.display = open ? 'block' : 'none';
  if(open) {
    const inp = document.getElementById('contactNickInput');
    if(inp) { inp.value = ''; try { inp.focus(); } catch(e) {} }
  }
}
function saveContactFromForm() {
  const ta = document.getElementById('transferAddr');
  const addr = ta ? ta.value.trim() : '';
  const inp = document.getElementById('contactNickInput');
  const nick = inp ? inp.value.trim() : '';
  if(!addr) { showToast('请先填写收款地址', 'error'); return; }
  saveTransferContact(addr, nick);
  const f = document.getElementById('transferContactAddForm');
  if(f) f.style.display = 'none';
}
function renderTransferContactsList() {
  const box = document.getElementById('transferContactsList');
  if(!box) return;
  const list = getTransferContacts();
  if(!list.length) {
    box.innerHTML = '<div class="transfer-contact-empty">暂无联系人，点「添加」保存常用地址</div>';
    return;
  }
  box.innerHTML = '';
  list.forEach(c => {
    const row = document.createElement('div');
    row.className = 'transfer-contact-row';
    row.onclick = function(e) {
      if(e.target && e.target.classList && e.target.classList.contains('transfer-contact-del')) return;
      pickTransferAddrFromBookRaw(c.addr);
    };
    const nick = document.createElement('div');
    nick.className = 'transfer-contact-nick';
    nick.textContent = c.nick;
    const ad = document.createElement('div');
    ad.className = 'transfer-contact-addr';
    const ca = c.addr;
    ad.textContent = ca.length > 22 ? ca.slice(0, 10) + '…' + ca.slice(-8) : ca;
    ad.title = ca;
    const del = document.createElement('span');
    del.className = 'transfer-contact-del';
    del.textContent = '删除';
    del.onclick = function(e) { e.stopPropagation(); removeTransferContact(c.addr); };
    row.appendChild(nick);
    row.appendChild(ad);
    row.appendChild(del);
    box.appendChild(row);
  });
}
function addrBookShort(addr) {
  const s = (addr || '').trim();
  if(s.length <= 16) return s;
  return s.slice(0, 8) + '…' + s.slice(-6);
}
function getTransferFeeSpeed() {
  try {
    const s = localStorage.getItem('ww_transfer_fee_speed');
    if(s === 'slow' || s === 'normal' || s === 'fast') return s;
  } catch(e) {}
  return 'normal';
}
function setTransferFeeSpeed(speed) {
  if(speed !== 'slow' && speed !== 'normal' && speed !== 'fast') speed = 'normal';
  try { localStorage.setItem('ww_transfer_fee_speed', speed); } catch(e) {}
  document.querySelectorAll('.ww-speed-btn').forEach(function(b) {
    const on = b.getAttribute('data-speed') === speed;
    b.classList.toggle('ww-speed-btn--active', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  if(typeof calcTransferFee === 'function') calcTransferFee();
}
function initTransferFeeSpeedUI() {
  setTransferFeeSpeed(getTransferFeeSpeed());
}
function getTronFeeLimitUsdt() {
  const sp = getTransferFeeSpeed();
  if(sp === 'slow') return 15000000;
  if(sp === 'fast') return 50000000;
  return 20000000;
}
function getTronFeeLimitTrx() {
  const sp = getTransferFeeSpeed();
  if(sp === 'slow') return 10000000;
  if(sp === 'fast') return 45000000;
  return 25000000;
}
function transferSpeedHint(coinId, sp) {
  const m = {
    usdt: { slow: '经济 · 约 1–3 分钟', normal: '标准 · 约 30 秒', fast: '快速 · 约 15–45 秒' },
    trx: { slow: '经济 · 约 1–2 分钟', normal: '标准 · 约 1 分钟', fast: '快速 · 约 20–40 秒' },
    eth: { slow: '经济 · 约 5–15 分钟', normal: '标准 · 约 2–5 分钟', fast: '快速 · 约 30–90 秒' },
    btc: { slow: '经济', normal: '标准', fast: '快速' }
  };
  return ((m[coinId] || m.usdt)[sp]) || m.usdt.normal;
}
/* _wwTickerInterval 由 wallet.ui.js 声明为 var */
async function refreshHomePriceTicker() {
  try {
    const r = await (typeof wwFetchCoinGecko === 'function'
      ? wwFetchCoinGecko('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd')
      : fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd'));
    const d = await r.json();
    const fmt = function(x) {
      if(x === undefined || x === null || !isFinite(x)) return '—';
      return x < 10 ? x.toFixed(4) : x.toLocaleString('en', { maximumFractionDigits: 2 });
    };
    const ust = fmt(d.tether && d.tether.usd);
    try {
      window._wwLastCgUsd = {
        usdt: d.tether && d.tether.usd
      };
    } catch (_cg) {}
    const html = 'USDT <strong>$' + ust + '</strong>';
    const a = document.getElementById('wwTickerTextA');
    const b = document.getElementById('wwTickerTextB');
    if(a) a.innerHTML = html;
    if(b) b.innerHTML = html;
    if(!_wwTickerInterval) {
      _wwTickerInterval = setInterval(function() { refreshHomePriceTicker(); }, 90000);
    }
    try { if (typeof wwCheckPriceAlertsAfterTicker === 'function') wwCheckPriceAlertsAfterTicker(d); } catch (_pa) {}
  } catch(e) {}
}

function wwRequestPriceAlertPermission() {
  try {
    if (typeof Notification === 'undefined') {
      if (typeof showToast === 'function') showToast('当前环境不支持通知', 'info');
      return;
    }
    Notification.requestPermission().then(function (p) {
      var msg = p === 'granted' ? '已授予通知权限' : ('权限：' + p);
      if (typeof showToast === 'function') showToast(msg, 'info');
    });
  } catch (e) {}
}

function wwSavePriceAlertsFromUI() {
  var keys = ['btc', 'eth', 'trx', 'usdt'];
  var o = { enabled: !!(document.getElementById('wwAlertEnable') && document.getElementById('wwAlertEnable').checked) };
  keys.forEach(function (k) {
    var K = k.charAt(0).toUpperCase() + k.slice(1);
    var a = parseFloat((document.getElementById('wwAlert' + K + 'Above') || {}).value || '');
    var b = parseFloat((document.getElementById('wwAlert' + K + 'Below') || {}).value || '');
    o[k] = { above: isFinite(a) && a > 0 ? a : 0, below: isFinite(b) && b > 0 ? b : 0 };
  });
  try { localStorage.setItem('ww_price_alerts_v1', JSON.stringify(o)); } catch (e) {}
  if (typeof showToast === 'function') showToast('已保存价格提醒', 'success');
}

function wwPopulatePriceAlertForm() {
  var o = {};
  try { o = JSON.parse(localStorage.getItem('ww_price_alerts_v1') || '{}'); } catch (e) { o = {}; }
  var en = document.getElementById('wwAlertEnable');
  if (en) en.checked = !!o.enabled;
  ['btc', 'eth', 'trx', 'usdt'].forEach(function (k) {
    var K = k.charAt(0).toUpperCase() + k.slice(1);
    var c = o[k] || {};
    var a = document.getElementById('wwAlert' + K + 'Above');
    var b = document.getElementById('wwAlert' + K + 'Below');
    if (a) a.value = c.above && c.above > 0 ? String(c.above) : '';
    if (b) b.value = c.below && c.below > 0 ? String(c.below) : '';
  });
}

function wwCheckPriceAlertsAfterTicker(d) {
  try {
    var cfg = JSON.parse(localStorage.getItem('ww_price_alerts_v1') || '{}');
    if (!cfg || !cfg.enabled) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    var map = [
      { key: 'btc', name: 'BTC', get: function (z) { return z.bitcoin && z.bitcoin.usd; } },
      { key: 'eth', name: 'ETH', get: function (z) { return z.ethereum && z.ethereum.usd; } },
      { key: 'trx', name: 'TRX', get: function (z) { return z.tron && z.tron.usd; } },
      { key: 'usdt', name: 'USDT', get: function (z) { return z.tether && z.tether.usd; } }
    ];
    var prev = window._wwAlertPricePrev || {};
    map.forEach(function (m) {
      var p = m.get(d);
      if (p == null || !isFinite(p)) return;
      var c = cfg[m.key] || {};
      var pr = prev[m.key];
      if (pr != null && isFinite(pr)) {
        if (c.above > 0 && pr < c.above && p >= c.above) {
          new Notification('WorldToken 价格提醒', { body: m.name + ' 已涨至 $' + Number(p).toFixed(4), tag: 'ww-pa-' + m.key + '-hi' });
        }
        if (c.below > 0 && pr > c.below && p <= c.below) {
          new Notification('WorldToken 价格提醒', { body: m.name + ' 已跌至 $' + Number(p).toFixed(4), tag: 'ww-pa-' + m.key + '-lo' });
        }
      }
      prev[m.key] = p;
    });
    window._wwAlertPricePrev = prev;
  } catch (e) {}
}

function updateYieldFarmTracker(parts, total) {
  var el = document.getElementById('wwYieldFarmBody');
  if (!el) return;
  if (!total || total <= 1e-9) {
    el.innerHTML = '<div style="color:var(--text-muted);font-size:11px">暂无持仓估值，无法估算质押收益。</div>';
    return;
  }
  var apy = { USDT: 4.2, TRX: 4.8, ETH: 3.6, BTC: 2.9 };
  var estYr = 0;
  var rows = [];
  parts.forEach(function (p) {
    if (p.v <= 0) return;
    var a = apy[p.l] != null ? apy[p.l] : 3.5;
    estYr += p.v * (a / 100);
    var dailyUsd = p.v * (a / 100) / 365;
    var pct = total > 0 ? (100 * p.v / total).toFixed(1) : '0';
    rows.push(
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 10px;background:var(--bg3);border-radius:10px;border:1px solid var(--border)"><span>'
        + p.l
        + ' <span style="color:var(--text-muted);font-size:10px">参考 APY '
        + a.toFixed(1)
        + '%</span></span><span style="text-align:right;font-size:11px;color:var(--text)">日收益 ~$'
        + dailyUsd.toFixed(4)
        + '<br/><span style="font-size:10px;color:var(--text-muted)">占比 '
        + pct
        + '%</span></span></div>'
    );
  });
  rows.unshift(
    '<div style="font-size:11px;color:var(--green,#26a17b);margin-bottom:4px">组合参考年化（示意） ≈ $'
      + estYr.toFixed(2)
      + ' · 估算日收益 ≈ $'
      + (estYr / 365).toFixed(4)
      + '</div>'
  );
  el.innerHTML = rows.join('');
}

function wwNormalizeAddrForWhitelist(a) {
  a = String(a || '').trim();
  if (/^0x[0-9a-fA-F]{40}$/.test(a)) return a.toLowerCase();
  return a;
}

function wwTransferWhitelistCheck(rawAddr) {
  try {
    var o = JSON.parse(localStorage.getItem('ww_transfer_whitelist_v1') || '{}');
    if (!o || !o.enabled) return true;
    var list = (Array.isArray(o.addresses) ? o.addresses : []).map(wwNormalizeAddrForWhitelist);
    var n = wwNormalizeAddrForWhitelist(rawAddr);
    return list.indexOf(n) >= 0;
  } catch (e) { return true; }
}

function wwWhitelistPopulate() {
  var en = document.getElementById('wwWhitelistEnabled');
  var ta = document.getElementById('wwWhitelistTextarea');
  try {
    var o = JSON.parse(localStorage.getItem('ww_transfer_whitelist_v1') || '{}');
    if (en) en.checked = !!o.enabled;
    if (ta) ta.value = (Array.isArray(o.addresses) ? o.addresses : []).join('\n');
  } catch (e2) {
    if (en) en.checked = false;
    if (ta) ta.value = '';
  }
}

function wwWhitelistSave() {
  var en = document.getElementById('wwWhitelistEnabled');
  var ta = document.getElementById('wwWhitelistTextarea');
  var lines = (ta && ta.value ? ta.value : '').split(/\n/).map(function (l) { return l.trim(); }).filter(Boolean);
  var o = { enabled: !!(en && en.checked), addresses: lines.slice(0, 200) };
  try { localStorage.setItem('ww_transfer_whitelist_v1', JSON.stringify(o)); } catch (e) {}
  if (typeof showToast === 'function') showToast('白名单已保存', 'success', 1800);
}

function wwRecurringLoad() {
  try {
    var j = JSON.parse(localStorage.getItem('ww_recurring_v1') || '[]');
    return Array.isArray(j) ? j : [];
  } catch (e) { return []; }
}

function wwRecurringSave(list) {
  try { localStorage.setItem('ww_recurring_v1', JSON.stringify(list.slice(0, 50))); } catch (e) {}
}

function wwRecurringRenderList() {
  var host = document.getElementById('wwRecurringList');
  if (!host) return;
  var list = wwRecurringLoad();
  if (!list.length) {
    host.innerHTML = '<div style="text-align:center;padding:14px;color:var(--text-muted);font-size:12px">暂无计划。添加后将在此显示下次提醒时间。</div>';
    return;
  }
    host.innerHTML = list.map(function (it, idx) {
    var next = it.nextAt ? new Date(it.nextAt).toLocaleString() : '—';
    return '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:12px 14px;font-size:12px">' +
      '<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><div style="word-break:break-all;color:var(--text)"><b>' + (it.amt || '?') + '</b> → ' + (it.addr || '').replace(/</g, '') + '</div>' +
      '<span style="color:var(--red);cursor:pointer;flex-shrink:0" onclick="wwRecurringRemove(' + idx + ')">删除</span></div>' +
      '<div style="margin-top:6px;color:var(--text-muted);font-size:11px">间隔 ' + (it.days || '?') + ' 天 · 下次提醒 ' + next + ' · ' + (it.enabled ? '已启用' : '已暂停') + '</div></div>';
  }).join('');
}

function wwRecurringPopulate() {
  wwRecurringRenderList();
}

function wwRecurringAdd() {
  var a = document.getElementById('wwRecurringAddr');
  var m = document.getElementById('wwRecurringAmt');
  var d = document.getElementById('wwRecurringDays');
  var en = document.getElementById('wwRecurringEnabled');
  var addr = a ? String(a.value || '').trim() : '';
  var amt = m ? String(m.value || '').trim() : '';
  var days = parseInt(d && d.value ? d.value : '7', 10);
  if (!addr) { if (typeof showToast === 'function') showToast('请填写收款地址', 'error'); return; }
  if (!days || days < 1) days = 7;
  var list = wwRecurringLoad();
  var nextAt = Date.now() + days * 86400000;
  list.push({ id: String(Date.now()), addr: addr, amt: amt || '—', days: days, enabled: !!(en && en.checked), nextAt: nextAt });
  wwRecurringSave(list);
  wwRecurringRenderList();
  if (a) a.value = '';
  if (m) m.value = '';
  if (typeof showToast === 'function') showToast('已加入计划列表', 'success', 2000);
}

function wwRecurringRemove(idx) {
  var list = wwRecurringLoad();
  list.splice(idx, 1);
  wwRecurringSave(list);
  wwRecurringRenderList();
}

function wwRecurringTick() {
  var list = wwRecurringLoad();
  var now = Date.now();
  var ch = false;
  list.forEach(function (it) {
    if (!it || !it.enabled || !it.nextAt) return;
    if (now < it.nextAt) return;
    var days = Math.max(1, parseInt(it.days, 10) || 7);
    it.nextAt = now + days * 86400000;
    ch = true;
    var title = 'WorldToken · 定期转账提醒';
    var body = '计划：向 ' + String(it.addr || '').slice(0, 18) + '… 发送约 ' + (it.amt || '?') + '（请手动在转账页操作）';
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(title, { body: body, tag: 'ww-recurring-' + (it.id || '') });
      } else if (typeof showToast === 'function') {
        showToast('📅 ' + body, 'warning', 6000);
      }
    } catch (e) {}
  });
  if (ch) wwRecurringSave(list);
}

function wwInheritancePopulate() {
  try {
    var o = JSON.parse(localStorage.getItem('ww_inheritance_v1') || '{}');
    var b = document.getElementById('wwInheritanceBeneficiary');
    var n = document.getElementById('wwInheritanceNote');
    if (b) b.value = o.beneficiary || '';
    if (n) n.value = o.note || '';
  } catch (e) {}
}

function wwInheritanceSave() {
  var b = document.getElementById('wwInheritanceBeneficiary');
  var n = document.getElementById('wwInheritanceNote');
  var o = {
    beneficiary: b ? String(b.value || '').trim().slice(0, 256) : '',
    note: n ? String(n.value || '').trim().slice(0, 2000) : ''
  };
  try { localStorage.setItem('ww_inheritance_v1', JSON.stringify(o)); } catch (e2) {}
  if (typeof showToast === 'function') showToast('继承备忘已保存（本机）', 'success', 2200);
}

var WW_DAO_PROPOSALS = [
  { id: 'p1', title: '是否将默认滑点提示调整为 0.5%？', summary: '减少新手因滑点过小导致的失败交易（示意）。' },
  { id: 'p2', title: '是否在设置中默认开启隐私模式？', summary: '首屏隐藏余额，需长按或 PIN 查看（示意）。' },
  { id: 'p3', title: '是否增加 TRX Gas 不足时的弹窗提醒？', summary: '当 TRX 余额低于阈值时强提醒（示意）。' }
];

function wwDaoGetVotes() {
  try {
    var j = JSON.parse(localStorage.getItem('ww_dao_votes_v1') || '{}');
    return typeof j === 'object' && j ? j : {};
  } catch (e) { return {}; }
}

function wwDaoSetVote(pid, choice) {
  var v = wwDaoGetVotes();
  v[pid] = choice;
  try { localStorage.setItem('ww_dao_votes_v1', JSON.stringify(v)); } catch (e2) {}
  wwDaoRender();
  try { if(typeof wwReputationPopulate==='function') wwReputationPopulate(); } catch (_r) {}
  try { if(typeof updateReputationSettingsRow==='function') updateReputationSettingsRow(); } catch (_s) {}
  if (typeof showToast === 'function') showToast('投票已保存（本机）', 'success', 1800);
}

function wwDaoRender() {
  var box = document.getElementById('wwDaoProposalList');
  if (!box) return;
  var votes = wwDaoGetVotes();
  box.innerHTML = WW_DAO_PROPOSALS.map(function (pr) {
    var cur = votes[pr.id] || '';
    function btn(ch, label) {
      var on = cur === ch ? 'background:rgba(200,168,75,0.25);border-color:var(--gold);color:var(--gold)' : 'background:var(--bg3);border-color:var(--border);color:var(--text)';
      return '<button type="button" class="btn-secondary" style="flex:1;min-width:72px;padding:8px 6px;font-size:11px;' + on + '" onclick="wwDaoSetVote(\'' + pr.id + '\',\'' + ch + '\')">' + label + '</button>';
    }
    return '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:14px">' +
      '<div style="font-weight:700;font-size:14px;color:var(--text);margin-bottom:6px">' + pr.title + '</div>' +
      '<div style="font-size:12px;color:var(--text-muted);line-height:1.55;margin-bottom:12px">' + pr.summary + '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' + btn('yes', '赞成') + btn('no', '反对') + btn('abstain', '弃权') + '</div></div>';
  }).join('');
}

function computeWalletReputationScore() {
  var txs = (typeof window._wwTxHistoryCache !== 'undefined' && window._wwTxHistoryCache) ? window._wwTxHistoryCache : [];
  var nTx = Array.isArray(txs) ? Math.min(txs.length, 200) : 0;
  var sec = (typeof getWalletSecurityBreakdown === 'function') ? getWalletSecurityBreakdown() : { score: 0 };
  var secScore = Math.min(100, Math.max(0, sec.score | 0));
  var votes = wwDaoGetVotes();
  var voteCount = 0;
  try {
    Object.keys(votes).forEach(function (k) { if (votes[k]) voteCount++; });
  } catch (e) {}
  var activityPts = Math.min(35, Math.floor(nTx * 1.2));
  var securityPts = Math.round(secScore * 0.45);
  var daoPts = Math.min(25, voteCount * 8);
  var raw = activityPts + securityPts + daoPts;
  var total = Math.min(100, Math.max(0, raw));
  return { total: total, activityPts: activityPts, securityPts: securityPts, daoPts: daoPts, nTx: nTx, secScore: secScore, voteCount: voteCount };
}

function wwReputationPopulate() {
  var r = computeWalletReputationScore();
  var big = document.getElementById('wwReputationScoreBig');
  var bar = document.getElementById('wwReputationBar');
  var ex = document.getElementById('wwReputationExplain');
  if (big) big.textContent = String(r.total);
  if (bar) bar.style.width = r.total + '%';
  if (ex) {
    ex.textContent = '活跃度 +' + r.activityPts + ' / 安全 +' + r.securityPts + ' / 治理 +' + r.daoPts + '（交易 ' + r.nTx + ' 条，安全分 ' + r.secScore + '，已投 ' + r.voteCount + ' 票）。此为本地参考分。';
  }
  try { updateReputationSettingsRow(); } catch (e) {}
}

function updateReputationSettingsRow() {
  var r = computeWalletReputationScore();
  var el = document.getElementById('wwReputationSettingsValue');
  if (el) el.textContent = r.total + ' 分';
}

function updateCrossChainSwapCompare() {
  var amtIn = parseFloat((_safeEl('swapAmountIn') || {}).value) || 0;
  var pFrom = (swapFrom && swapFrom.price) ? swapFrom.price : 1;
  var pTo = (swapTo && swapTo.price) ? swapTo.price : 1;
  var feeTron = amtIn * 0.003;
  var feeEth = amtIn * 0.0028;
  var slipEth = 0.9985;
  var _hc = typeof WW_SWAP_REF_CONSERVATIVE_FACTOR === 'number' ? WW_SWAP_REF_CONSERVATIVE_FACTOR : 0.99;
  var outTron = (pTo > 0) ? ((amtIn - feeTron) * pFrom / pTo) * _hc : 0;
  var outEth = (pTo > 0) ? ((amtIn - feeEth) * pFrom / pTo) * slipEth * _hc : 0;
  var ft = swapTo ? swapTo.name : '';
  var outTrxFmt = swapTo && swapTo.id === 'trx';
  function _wwFmtSwapCompare(x) {
    if (outTrxFmt) return x.toFixed(2);
    return x > 1 ? x.toFixed(4) : x.toFixed(8);
  }
  var elT = document.getElementById('wwSwapCompareTron');
  var elE = document.getElementById('wwSwapCompareEth');
  var bT = document.getElementById('wwSwapCompareBadgeTron');
  var bE = document.getElementById('wwSwapCompareBadgeEth');
  var best = document.getElementById('wwSwapCompareBest');
  if (elT) elT.textContent = amtIn > 0 ? _wwFmtSwapCompare(outTron) + ' ' + ft : '—';
  if (elE) elE.textContent = amtIn > 0 ? _wwFmtSwapCompare(outEth) + ' ' + ft : '—';
  var better = '相近';
  if (amtIn > 0 && outTron > outEth * 1.0001) { better = 'TRON 路径参考更优（预估多 ' + _wwFmtSwapCompare(outTron - outEth) + ' ' + ft + '）'; if (bT) { bT.textContent = '较优'; bT.style.background = 'rgba(38,161,123,0.2)'; bT.style.color = '#26a17b'; } if (bE) { bE.textContent = '参考'; bE.style.background = 'var(--bg3)'; bE.style.color = 'var(--text-muted)'; } }
  else if (amtIn > 0 && outEth > outTron * 1.0001) { better = '以太坊路径参考更优（预估多 ' + _wwFmtSwapCompare(outEth - outTron) + ' ' + ft + '）'; if (bE) { bE.textContent = '较优'; bE.style.background = 'rgba(98,126,234,0.2)'; bE.style.color = '#627eea'; } if (bT) { bT.textContent = '参考'; bT.style.background = 'var(--bg3)'; bT.style.color = 'var(--text-muted)'; } }
  else {
    if (bT) { bT.textContent = '参考'; bT.style.background = 'var(--bg3)'; bT.style.color = 'var(--text-muted)'; }
    if (bE) { bE.textContent = '参考'; bE.style.background = 'var(--bg3)'; bE.style.color = 'var(--text-muted)'; }
  }
  if (best) best.textContent = amtIn > 0 ? better : '';
}

var WW_LENDING_MARKETS = [
  { asset: 'USDT', chain: 'TRON', supplyApy: '3.8%', borrowApr: '5.2%', color: '#26a17b' },
  { asset: 'USDC', chain: 'Ethereum', supplyApy: '4.1%', borrowApr: '5.9%', color: '#2775ca' },
  { asset: 'ETH', chain: 'Ethereum', supplyApy: '2.4%', borrowApr: '3.6%', color: '#627eea' },
  { asset: 'TRX', chain: 'TRON', supplyApy: '1.9%', borrowApr: '4.0%', color: '#ff0013' }
];

function wwLendingMarketToast(el) {
  var name = el && el.getAttribute ? el.getAttribute('data-asset') : '';
  if (typeof showToast === 'function') showToast(String(name || '') + ' 市场为示意数据', 'info', 1800);
}

function wwLendingPopulate() {
  var box = document.getElementById('wwLendingMarkets');
  if (!box) return;
  box.innerHTML = WW_LENDING_MARKETS.map(function (m) {
    return '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:14px;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px">' +
      '<div><div style="font-weight:700;font-size:15px;color:var(--text)">' + m.asset + ' <span style="font-size:11px;color:var(--text-muted);font-weight:500">' + m.chain + '</span></div>' +
      '<div style="font-size:11px;color:var(--text-muted);margin-top:4px">供应 APY / 借款 APR</div></div>' +
      '<div style="text-align:right"><div style="font-size:16px;font-weight:700;color:' + m.color + '">' + m.supplyApy + ' <span style="color:var(--text-muted);font-weight:500">/</span> ' + m.borrowApr + '</div>' +
      '<button type="button" class="btn-secondary" data-asset="' + m.asset + '" style="margin-top:8px;padding:6px 12px;font-size:11px" onclick="wwLendingMarketToast(this)">详情</button></div></div>';
  }).join('');
}

function wwPerpGetPositions() {
  try {
    var j = JSON.parse(localStorage.getItem('ww_perp_demo_v1') || '[]');
    return Array.isArray(j) ? j : [];
  } catch (e) { return []; }
}

function wwPerpSetPositions(arr) {
  try { localStorage.setItem('ww_perp_demo_v1', JSON.stringify(arr)); } catch (e2) {}
}

function wwPerpAddDemo() {
  var side = Math.random() > 0.5 ? '多' : '空';
  var sym = ['BTC','ETH','TRX'][Math.floor(Math.random() * 3)];
  var entry = sym === 'BTC' ? 62000 + Math.random() * 2000 : sym === 'ETH' ? 3200 + Math.random() * 200 : 0.12 + Math.random() * 0.02;
  var lev = [5, 10, 20][Math.floor(Math.random() * 3)];
  var p = wwPerpGetPositions();
  p.push({ id: 'p' + Date.now(), symbol: sym, side: side, entry: entry, size: (0.01 + Math.random() * 0.2).toFixed(4), leverage: lev, uPnl: (Math.random() * 200 - 80).toFixed(2) });
  wwPerpSetPositions(p);
  wwPerpPopulate();
  if (typeof showToast === 'function') showToast('已添加示例持仓', 'success', 1600);
}

function wwPerpPopulate() {
  var list = wwPerpGetPositions();
  var host = document.getElementById('wwPerpPositions');
  var pnlEl = document.getElementById('wwPerpUnrealizedPnl');
  var cntEl = document.getElementById('wwPerpOpenCount');
  var sum = 0;
  list.forEach(function (x) { sum += parseFloat(x.uPnl) || 0; });
  if (pnlEl) {
    pnlEl.textContent = list.length ? (sum >= 0 ? '+' : '') + sum.toFixed(2) + ' USDT' : '—';
    pnlEl.style.color = sum >= 0 ? '#26a17b' : '#e5484d';
  }
  if (cntEl) cntEl.textContent = String(list.length);
  var srow = document.getElementById('wwPerpSettingsSummary');
  if (srow) srow.textContent = list.length ? (list.length + ' 笔 · PnL ' + (sum >= 0 ? '+' : '') + sum.toFixed(0)) : '无持仓';
  if (!host) return;
  if (!list.length) {
    host.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:13px">暂无持仓，可点击添加示例数据</div>';
    return;
  }
  host.innerHTML = list.map(function (p) {
    var col = parseFloat(p.uPnl) >= 0 ? '#26a17b' : '#e5484d';
    return '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:12px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><span style="font-weight:700;font-size:15px">' + p.symbol + '-PERP</span>' +
      '<span style="font-size:12px;padding:3px 8px;border-radius:8px;background:var(--bg3)">' + p.side + ' · ' + p.leverage + 'x</span></div>' +
      '<div style="font-size:12px;color:var(--text-muted);line-height:1.7">开仓价 <b style="color:var(--text)">' + (p.entry > 20 ? p.entry.toFixed(2) : p.entry.toFixed(5)) + '</b> · 数量 ' + p.size +
      '<br/>未实现 <b style="color:' + col + '">' + (parseFloat(p.uPnl) >= 0 ? '+' : '') + p.uPnl + '</b> USDT</div></div>';
  }).join('');
}

function wwOptionsSpotPrice(u) {
  var map = { ETH: 3200, BTC: 64000, TRX: 0.13 };
  return map[u] || 1;
}

function wwOptionsPopulate() {
  var uEl = document.getElementById('wwOptUnderlying');
  var sEl = document.getElementById('wwOptSide');
  var kEl = document.getElementById('wwOptStrike');
  var dEl = document.getElementById('wwOptDays');
  var qEl = document.getElementById('wwOptQty');
  var prem = document.getElementById('wwOptPremiumEst');
  var ex = document.getElementById('wwOptExplain');
  var u = uEl ? String(uEl.value || 'ETH') : 'ETH';
  var side = sEl ? String(sEl.value || 'call') : 'call';
  var S = wwOptionsSpotPrice(u);
  var K = parseFloat(kEl && kEl.value) || S;
  var days = Math.max(1, parseInt(dEl && dEl.value, 10) || 30);
  var qty = Math.max(0.001, parseFloat(qEl && qEl.value) || 1);
  var t = days / 365;
  var vol = 0.65;
  var intrinsic = side === 'call' ? Math.max(0, S - K) : Math.max(0, K - S);
  var timeVal = S * vol * Math.sqrt(t) * 0.4;
  var unit = intrinsic + timeVal;
  var total = unit * qty;
  if (prem) prem.textContent = (total < 0.01 ? total.toFixed(6) : total.toFixed(2)) + ' USDT';
  if (ex) ex.textContent = '现货参考 ' + (u === 'TRX' ? S.toFixed(5) : S.toLocaleString(undefined, { maximumFractionDigits: 2 })) + ' USD · 简化波动率模型，非 Deribit / 链上期权报价。';
}

var WW_YIELD_AGG_PROTOCOLS = ['Aave V3', 'Compound V3', 'Venus'];

function wwYieldAggJitter(base) {
  var b = parseFloat(base) || 3;
  return (b + (Math.random() - 0.5) * 0.6).toFixed(2);
}

function wwYieldAggPopulate() {
  var box = document.getElementById('wwYieldAggTable');
  if (!box) return;
  var assets = [
    { sym: 'USDT', base: 4.2 },
    { sym: 'USDC', base: 4.0 },
    { sym: 'ETH', base: 2.8 },
    { sym: 'TRX', base: 1.5 }
  ];
  var rows = [];
  assets.forEach(function (a) {
    var cells = WW_YIELD_AGG_PROTOCOLS.map(function (name) {
      return '<td style="padding:8px 6px;text-align:right;font-weight:600;color:var(--gold)">' + wwYieldAggJitter(a.base) + '%</td>';
    }).join('');
    rows.push('<tr><td style="padding:8px 6px;font-weight:600;color:var(--text)">' + a.sym + '</td>' + cells + '</tr>');
  });
  box.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:12px;background:var(--bg2);border:1px solid var(--border);border-radius:12px;overflow:hidden"><thead><tr><th style="text-align:left;padding:10px 8px;color:var(--text-muted)">资产</th><th style="text-align:right;padding:10px 6px;color:var(--text-muted)">Aave</th><th style="text-align:right;padding:10px 6px;color:var(--text-muted)">Compound</th><th style="text-align:right;padding:10px 6px;color:var(--text-muted)">Venus</th></tr></thead><tbody>' + rows.join('') + '</tbody></table><p style="font-size:11px;color:var(--text-muted);margin-top:10px;line-height:1.5">供应 APY 为本地随机抖动示例，真实利率以各协议前端为准。</p>';
}

function wwYieldAggRefreshDemo() {
  wwYieldAggPopulate();
  if (typeof showToast === 'function') showToast('已刷新示例 APY', 'info', 1600);
}

function wwLiquidationGetThreshold() {
  var v = parseFloat((document.getElementById('wwLiqThreshold') || {}).value);
  if (!isFinite(v) || v <= 0) return 130;
  return v;
}

function wwLiquidationSaveThreshold() {
  try {
    localStorage.setItem('ww_liq_threshold', String(wwLiquidationGetThreshold()));
    var n = document.getElementById('wwLiqNotify');
    localStorage.setItem('ww_liq_notify', n && n.checked ? '1' : '0');
  } catch (e) {}
  wwLiquidationPopulate();
}

function wwLiquidationLoad() {
  try {
    var t = localStorage.getItem('ww_liq_threshold');
    var el = document.getElementById('wwLiqThreshold');
    if (el && t) el.value = t;
    var n = document.getElementById('wwLiqNotify');
    if (n) n.checked = localStorage.getItem('ww_liq_notify') === '1';
  } catch (e2) {}
}

function wwLiquidationDemoPositions() {
  return [
    { id: '1', asset: 'ETH', collateralUsd: 5000, debtUsd: 2800, ratio: 178 },
    { id: '2', asset: 'TRX', collateralUsd: 1200, debtUsd: 950, ratio: 126 }
  ];
}

function wwLiquidationScanDemo() {
  wwLiquidationPopulate();
  if (typeof showToast === 'function') showToast('已根据示例仓位检查抵押率', 'success', 2000);
}

function wwLiquidationMaybeNotify(ratio, threshold) {
  if (ratio >= threshold) return;
  try {
    if (localStorage.getItem('ww_liq_notify') !== '1') return;
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      new Notification('WorldToken · 清算预警', { body: '抵押率 ' + ratio.toFixed(1) + '% 低于阈值 ' + threshold + '%（示意）' });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  } catch (e) {}
}

function wwLiquidationPopulate() {
  wwLiquidationLoad();
  var th = wwLiquidationGetThreshold();
  var hint = document.getElementById('wwLiqSettingsHint');
  if (hint) hint.textContent = '阈值 ' + th + '%';
  var list = document.getElementById('wwLiquidationList');
  if (!list) return;
  var pos = wwLiquidationDemoPositions();
  var html = pos.map(function (p) {
    var danger = p.ratio < th;
    if (danger) wwLiquidationMaybeNotify(p.ratio, th);
    var bg = danger ? 'rgba(229,72,77,0.12)' : 'var(--bg2)';
    var bor = danger ? '1px solid rgba(229,72,77,0.45)' : '1px solid var(--border)';
    return '<div style="background:' + bg + ';border:' + bor + ';border-radius:14px;padding:12px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">' +
      '<div><div style="font-weight:700;color:var(--text)">' + p.asset + ' 抵押</div><div style="font-size:11px;color:var(--text-muted);margin-top:4px">债务约 $' + p.debtUsd + '</div></div>' +
      '<div style="text-align:right"><div style="font-size:11px;color:var(--text-muted)">抵押率</div><div style="font-size:18px;font-weight:800;color:' + (danger ? '#e5484d' : '#26a17b') + '">' + p.ratio + '%</div></div></div>';
  }).join('');
  list.innerHTML = html || '<div style="color:var(--text-muted);font-size:13px">暂无演示仓位</div>';
}

var WW_LAUNCHPAD_PROJECTS = [
  { name: 'DemoLayer', chain: 'ETH', date: '2026-04-18', allocation: '500 USDT', status: '即将开始' },
  { name: 'TronBoost', chain: 'TRON', date: '2026-04-22', allocation: '2,000 TRX', status: '白名单' },
  { name: 'MetaVault', chain: 'BSC', date: '2026-05-01', allocation: 'TBD', status: '筹备中' }
];

function wwLaunchpadIntentDemo() {
  if (typeof showToast === 'function') showToast('演示：未连接链上申购', 'info', 2000);
}

function wwLaunchpadPopulate() {
  var box = document.getElementById('wwLaunchpadList');
  if (!box) return;
  box.innerHTML = WW_LAUNCHPAD_PROJECTS.map(function (p) {
    return '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:14px">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap">' +
      '<div><div style="font-weight:700;font-size:15px;color:var(--text)">' + p.name + '</div><div style="font-size:11px;color:var(--text-muted);margin-top:4px">' + p.chain + ' · ' + p.date + '</div></div>' +
      '<span style="font-size:11px;padding:4px 8px;border-radius:8px;background:rgba(200,168,75,0.15);color:var(--gold)">' + p.status + '</span></div>' +
      '<div style="margin-top:10px;font-size:12px;color:var(--text-muted)">意向额度：<b style="color:var(--text)">' + p.allocation + '</b></div>' +
      '<button type="button" class="btn-primary" style="width:100%;margin-top:12px;padding:10px;font-size:13px" onclick="wwLaunchpadIntentDemo()">登记意向（示意）</button></div>';
  }).join('');
}

var WW_SOCIAL_LEADERBOARD_DEMO = [
  { addr: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', label: 'AlphaVault', roi: 42.3, win: 68 },
  { addr: 'TXYZopYRdj2D9XRtbG411XZZ3kMfsVk8Q6', label: 'TronWhale', roi: 28.1, win: 55 },
  { addr: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', label: 'vitalik.eth', roi: 19.4, win: 52 }
];

function wwSocialLeaderboardCopyAt(i) {
  var r = WW_SOCIAL_LEADERBOARD_DEMO[i];
  if (!r) return;
  wwSocialLeaderboardCopy(r.addr);
}

function wwSocialLeaderboardFillTransferAt(i) {
  var r = WW_SOCIAL_LEADERBOARD_DEMO[i];
  if (!r) return;
  wwSocialLeaderboardFillTransfer(r.addr);
}

function wwSocialLeaderboardCopy(addr) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(addr);
    else {
      var ta = document.createElement('textarea');
      ta.value = addr;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    if (typeof showToast === 'function') showToast('已复制地址', 'success', 1600);
  } catch (e) {}
}

function wwSocialLeaderboardFillTransfer(addr) {
  try {
    localStorage.setItem('ww_prefill_transfer_to', addr);
    goTo('page-transfer');
    setTimeout(function () {
      var el = document.getElementById('transferTo') || document.querySelector('[id*="transfer"][id*="To"]');
      if (el) { el.value = addr; el.dispatchEvent(new Event('input', { bubbles: true })); }
    }, 120);
  } catch (e2) {
    goTo('page-transfer');
  }
}

function wwSocialLeaderboardPopulate() {
  var box = document.getElementById('wwSocialLeaderboardList');
  if (!box) return;
  box.innerHTML = WW_SOCIAL_LEADERBOARD_DEMO.map(function (r, i) {
    var short = r.addr.length > 18 ? r.addr.slice(0, 10) + '…' + r.addr.slice(-8) : r.addr;
    var escLb = function (s) {
      var d = document.createElement('div');
      d.textContent = String(s == null ? '' : s);
      return d.innerHTML;
    };
    var escA =
      typeof wwEscAttr === 'function'
        ? wwEscAttr
        : function (s) {
            return String(s == null ? '' : s)
              .replace(/&/g, '&amp;')
              .replace(/"/g, '&quot;')
              .replace(/</g, '&lt;');
          };
    return '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:14px">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap">' +
      '<div><div style="font-size:12px;color:var(--text-muted)">#' + (i + 1) + ' · ' + r.label + '</div>' +
      '<div style="font-weight:700;margin-top:4px;color:var(--text)"><span data-ww-copy="' +
      escA(r.addr) +
      '" title="点击复制完整地址" style="cursor:pointer;text-decoration:underline dotted">' +
      escLb(short) +
      '</span></div></div>' +
      '<div style="text-align:right"><div style="font-size:11px;color:var(--text-muted)">模拟 ROI</div>' +
      '<div style="font-size:18px;font-weight:800;color:#26a17b">+' + r.roi.toFixed(1) + '%</div>' +
      '<div style="font-size:11px;color:var(--text-muted)">胜率 ' + r.win + '%</div></div></div>' +
      '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">' +
      '<button type="button" class="btn-secondary" style="flex:1;min-width:120px;padding:10px;font-size:12px" onclick="wwSocialLeaderboardCopyAt(' + i + ')">复制地址</button>' +
      '<button type="button" class="btn-primary" style="flex:1;min-width:120px;padding:10px;font-size:12px" onclick="wwSocialLeaderboardFillTransferAt(' + i + ')">填入转账</button></div></div>';
  }).join('');
}

function wwAutoRebalanceSave() {
  try {
    var en = document.getElementById('wwAutoRebalEnable');
    var th = document.getElementById('wwAutoRebalThreshold');
    localStorage.setItem('ww_autorebal_enable', en && en.checked ? '1' : '0');
    if (th) localStorage.setItem('ww_autorebal_threshold', String(parseInt(th.value, 10) || 8));
  } catch (e) {}
  var hint = document.getElementById('wwAutoRebalSettingsHint');
  if (hint) {
    try {
      hint.textContent = localStorage.getItem('ww_autorebal_enable') === '1' ? '已启用' : '关闭';
    } catch (e2) { hint.textContent = '—'; }
  }
}

function wwAutoRebalanceLoad() {
  try {
    var en = document.getElementById('wwAutoRebalEnable');
    var th = document.getElementById('wwAutoRebalThreshold');
    if (en) en.checked = localStorage.getItem('ww_autorebal_enable') === '1';
    if (th) {
      var t = parseInt(localStorage.getItem('ww_autorebal_threshold') || '8', 10);
      if (isFinite(t) && t > 0) th.value = String(t);
    }
  } catch (e) {}
}

function wwAutoRebalancePortfolioParts() {
  var u = parseFloat((document.getElementById('valUsdt') || {}).textContent.replace(/[^0-9.\-]/g, '')) || 0;
  var total = u;
  if (total <= 0) return { total: 0, parts: [{ k: 'USDT', p: 0 }] };
  return {
    total: total,
    parts: [
      { k: 'USDT', p: 100 }
    ]
  };
}

function wwAutoRebalancePopulate() {
  wwAutoRebalanceLoad();
  var body = document.getElementById('wwAutoRebalanceBody');
  if (!body) return;
  var th = parseInt((document.getElementById('wwAutoRebalThreshold') || {}).value || '8', 10);
  if (!isFinite(th) || th < 1) th = 8;
  var target = { USDT: 100 };
  var data = wwAutoRebalancePortfolioParts();
  if (!data.total) {
    body.innerHTML = '<div style="color:var(--text-muted);font-size:13px">暂无估值数据，请返回首页刷新余额后再试。</div>';
    return;
  }
  var rows = data.parts.map(function (x) {
    var tgt = target[x.k] || 25;
    var drift = x.p - tgt;
    var hit = Math.abs(drift) >= th;
    return { k: x.k, p: x.p, tgt: tgt, drift: drift, hit: hit };
  });
  var any = rows.some(function (r) { return r.hit; });
  body.innerHTML = rows.map(function (r) {
    var col = r.hit ? '#e5484d' : 'var(--text-muted)';
    return '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:12px">' +
      '<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">' +
      '<span style="font-weight:700;color:var(--text)">' + r.k + '</span>' +
      '<span style="font-size:12px;color:var(--text-muted)">当前 ' + r.p.toFixed(1) + '% · 目标 ' + r.tgt + '%</span></div>' +
      '<div style="margin-top:6px;font-size:13px;color:' + col + '">偏离 ' + (r.drift >= 0 ? '+' : '') + r.drift.toFixed(1) + ' 百分点' + (r.hit ? '（超过阈值）' : '') + '</div></div>';
  }).join('') + (any && localStorage.getItem('ww_autorebal_enable') === '1'
    ? '<div style="background:rgba(200,168,75,0.1);border:1px solid rgba(200,168,75,0.35);border-radius:12px;padding:12px;font-size:12px;color:var(--text)">建议：通过转账或兑换向<b>权重不足</b>的资产倾斜；本应用不代您执行交易。</div>'
    : '<div style="font-size:12px;color:var(--text-muted)">提示：可在设置中开启「偏离提醒」。</div>');
}

function wwSentimentHash(s) {
  var h = 0;
  for (var i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i) | 0;
  return Math.abs(h);
}

function wwSentimentPopulate() {
  var box = document.getElementById('wwSentimentList');
  if (!box) return;
  var coins = ['USDT'];
  var els = ['chgUsdt'];
  var out = [];
  for (var i = 0; i < coins.length; i++) {
    var ch = (document.getElementById(els[i]) || {}).textContent || '';
    var m = ch.match(/[\-+]?[0-9]+(?:\.[0-9]+)?/);
    var px = m ? parseFloat(m[0]) : 0;
    var h = wwSentimentHash(coins[i] + String(px));
    var score = Math.max(-100, Math.min(100, Math.round(px * 12 + (h % 17) - 8)));
    var lab = score >= 20 ? '偏多' : (score <= -20 ? '偏空' : '中性');
    var bg = score >= 20 ? 'rgba(38,161,123,0.12)' : (score <= -20 ? 'rgba(229,72,77,0.12)' : 'var(--bg2)');
    out.push('<div style="background:' + bg + ';border:1px solid var(--border);border-radius:14px;padding:14px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">' +
      '<div style="font-weight:800;font-size:16px;color:var(--text)">' + coins[i] + '</div>' +
      '<span style="font-size:12px;padding:4px 10px;border-radius:999px;background:var(--bg3);color:var(--text-muted)">' + lab + '</span></div>' +
      '<div style="margin-top:10px;display:flex;align-items:center;gap:10px">' +
      '<div style="flex:1;height:8px;border-radius:8px;background:var(--bg3);overflow:hidden">' +
      '<div style="height:100%;width:' + (50 + score / 2) + '%;background:linear-gradient(90deg,#e5484d,#c8a84b,#26a17b);border-radius:8px"></div></div>' +
      '<div style="font-size:18px;font-weight:800;color:var(--gold);min-width:52px;text-align:right">' + score + '</div></div>' +
      '<div style="font-size:11px;color:var(--text-muted);margin-top:8px">与首页涨跌幅示意联动 · 非新闻 NLP</div></div>');
  }
  box.innerHTML = out.join('');
}

function wwOnchainMessagingPopulate() {
  var el = document.getElementById('wwOnchainMsgPreview');
  if (el) el.textContent = '';
}

async function wwOnchainMsgEncrypt() {
  var msg = (document.getElementById('wwOnchainMsgInput') || {}).value || '';
  var pass = (document.getElementById('wwOnchainMsgPass') || {}).value || '';
  if (!String(msg).trim()) { if (typeof showToast === 'function') showToast('请输入消息内容', 'warning'); return; }
  if (!pass || String(pass).length < 4) { if (typeof showToast === 'function') showToast('请输入至少 4 位加密密码', 'warning'); return; }
  var enc = new TextEncoder();
  var b64u8 = function(u8) { var s = ''; for (var i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return btoa(s); };
  try {
    var salt = crypto.getRandomValues(new Uint8Array(16));
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveBits', 'deriveKey']);
    var key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: 80000, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
    var plain = JSON.stringify({ v: 1, kind: 'ww_onchain_msg', t: Date.now(), text: String(msg) });
    var ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, enc.encode(plain));
    var outObj = { v: 1, kind: 'ww_onchain_msg', salt: '', iv: '', data: '' };
    if (typeof wwB64Bytes === 'function') {
      outObj.salt = wwB64Bytes(salt);
      outObj.iv = wwB64Bytes(iv);
      outObj.data = wwB64Bytes(new Uint8Array(ct));
    } else {
      outObj.salt = b64u8(salt);
      outObj.iv = b64u8(iv);
      outObj.data = b64u8(new Uint8Array(ct));
    }
    var txt = JSON.stringify(outObj);
    var prev = document.getElementById('wwOnchainMsgPreview');
    if (prev) prev.textContent = txt.slice(0, 480) + (txt.length > 480 ? '…' : '');
    try { localStorage.setItem('ww_onchain_msg_prefill', txt); } catch (e) {}
    if (typeof showToast === 'function') showToast('已加密，可复制或前往转账页粘贴到备注', 'success');
  } catch (e) {
    if (typeof showToast === 'function') showToast('加密失败', 'error');
  }
}

function wwOnchainMsgCopy() {
  try {
    var b64 = localStorage.getItem('ww_onchain_msg_prefill') || '';
    if (!b64) { if (typeof showToast === 'function') showToast('请先生成加密载荷', 'warning'); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(b64);
    else { var ta = document.createElement('textarea'); ta.value = b64; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); }
    if (typeof showToast === 'function') showToast('已复制密文', 'success');
  } catch (e) {}
}

function wwOnchainMsgGoTransfer() {
  try { goTo('page-transfer'); } catch (e) {}
}

async function wwBackupQrGenerate() {
  var p = (document.getElementById('wwBackupQrPass') || {}).value || '';
  if (!p || String(p).length < 4) { if (typeof showToast === 'function') showToast('请输入至少 4 位导出密码', 'warning'); return; }
  if (!REAL_WALLET || !REAL_WALLET.ethAddress) { if (typeof showToast === 'function') showToast('请先创建或导入钱包', 'warning'); return; }
  var enc = new TextEncoder();
  try {
    var payload = JSON.stringify({
      v: 1,
      t: Date.now(),
      kind: 'ww_qr_backup',
      eth: REAL_WALLET.ethAddress,
      trx: REAL_WALLET.trxAddress || '',
      btc: REAL_WALLET.btcAddress || '',
      backed: !!REAL_WALLET.backedUp
    });
    var salt = crypto.getRandomValues(new Uint8Array(16));
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var keyMaterial = await crypto.subtle.importKey('raw', enc.encode(p), 'PBKDF2', false, ['deriveBits', 'deriveKey']);
    var key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: 120000, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
    var ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, enc.encode(payload));
    var outObj = { v: 1, kind: 'ww_qr_backup', salt: '', iv: '', data: '' };
    if (typeof wwB64Bytes === 'function') {
      outObj.salt = wwB64Bytes(salt);
      outObj.iv = wwB64Bytes(iv);
      outObj.data = wwB64Bytes(new Uint8Array(ct));
    } else {
      var b64u8 = function(u8) { var s = ''; for (var i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return btoa(s); };
      outObj.salt = b64u8(salt);
      outObj.iv = b64u8(iv);
      outObj.data = b64u8(new Uint8Array(ct));
    }
    var txt = JSON.stringify(outObj);
    var canvas = document.getElementById('wwBackupQrCanvas');
    await loadQRCodeLib();
    if (canvas && typeof QRCode !== 'undefined' && QRCode.toCanvas) {
      await QRCode.toCanvas(canvas, txt, { width: 200, margin: 1, color: { dark: '#0a0a12ff', light: '#ffffffff' } });
      if (typeof showToast === 'function') showToast('已生成加密备份二维码（请妥善保管）', 'success');
    } else if (typeof showToast === 'function') showToast('二维码库加载失败', 'error');
  } catch (e) {
    if (typeof showToast === 'function') showToast('生成失败', 'error');
  }
}

function wwGaslessPopulate() {
  var cb = document.getElementById('wwGaslessEnable');
  var rel = document.getElementById('wwGaslessRelay');
  var hint = document.getElementById('wwGaslessSettingsHint');
  try {
    if (cb) cb.checked = localStorage.getItem('ww_gasless_meta') === '1';
    if (rel) rel.value = localStorage.getItem('ww_gasless_relay') || '';
  } catch (e) {}
  if (hint) {
    try { hint.textContent = localStorage.getItem('ww_gasless_meta') === '1' ? '已开启示意' : '关闭'; } catch (e2) { hint.textContent = '—'; }
  }
}

function wwGaslessSave() {
  var cb = document.getElementById('wwGaslessEnable');
  var rel = document.getElementById('wwGaslessRelay');
  var hint = document.getElementById('wwGaslessSettingsHint');
  try {
    localStorage.setItem('ww_gasless_meta', cb && cb.checked ? '1' : '0');
    if (rel) localStorage.setItem('ww_gasless_relay', String(rel.value || '').trim().slice(0, 200));
  } catch (e) {}
  if (hint) {
    try { hint.textContent = localStorage.getItem('ww_gasless_meta') === '1' ? '已开启示意' : '关闭'; } catch (e2) {}
  }
  if (typeof showToast === 'function') showToast('已保存免 Gas 偏好（示意）', 'success');
}

function wwRecoveryTestClear() {
  try {
    var t = document.getElementById('recoveryTestInput');
    if (t) t.value = '';
  } catch (e) {}
}

function wwRecoveryTestSubmit() {
  if (!REAL_WALLET || !REAL_WALLET.ethAddress) {
    if (typeof showToast === 'function') showToast('请先创建或导入钱包', 'error');
    return;
  }
  var raw = (document.getElementById('recoveryTestInput') || {}).value || '';
  if (!String(raw).trim()) {
    if (typeof showToast === 'function') showToast('请输入助记词', 'error');
    return;
  }
  var wlKey =
    typeof wwResolveMnemonicWordlistKey === 'function'
      ? wwResolveMnemonicWordlistKey()
      : typeof getMnemonicWordlistLang === 'function' && typeof keyMnemonicLang !== 'undefined'
        ? getMnemonicWordlistLang(keyMnemonicLang)
        : 'zh';
  var enStr = raw.trim();
  try {
    if (wlKey === 'en') {
      /* 已是 BIP39 英文 */
    } else if (typeof importWallet === 'function') {
      var _impTry = importWallet(enStr);
      if (_impTry && _impTry.mnemonic) enStr = _impTry.mnemonic;
      else if (typeof mnemonicFromLang === 'function') enStr = mnemonicFromLang(enStr, wlKey);
    } else if (typeof mnemonicFromLang === 'function') {
      enStr = mnemonicFromLang(enStr, wlKey);
    }
  } catch (e1) {}
  var words = enStr.trim().split(/\s+/);
  if (![12, 15, 18, 21, 24].includes(words.length)) {
    if (typeof showToast === 'function') showToast('词数应为 12/15/18/21/24', 'error');
    return;
  }
  try {
    var w = ethers.Wallet.fromMnemonic(enStr.trim());
    var match = REAL_WALLET.ethAddress && w.address && w.address.toLowerCase() === String(REAL_WALLET.ethAddress).toLowerCase();
    if (match) {
      if (typeof showToast === 'function') showToast('验证通过：助记词与当前钱包一致', 'success');
    } else {
      if (typeof showToast === 'function') showToast('与当前钱包不一致或助记词无效', 'error');
    }
  } catch (e2) {
    if (typeof showToast === 'function') showToast('助记词无效或无法解析', 'error');
  }
}

function drawPortfolioPieChart(usdtUsd, trxUsd, ethUsd, btcUsd) {
  const card = document.getElementById('wwPortfolioPieCard');
  const c = document.getElementById('portfolioPieCanvas');
  const leg = document.getElementById('portfolioPieLegend');
  if(!card || !c || !leg) return;
  void trxUsd; void ethUsd; void btcUsd;
  const parts = [
    { v: Number(usdtUsd) || 0, c: '#26a17b', l: 'USDT' },
  ];
  const total = parts.reduce(function(a, p) { return a + p.v; }, 0);
  try { window._wwLastPortfolioParts = parts; window._wwLastPortfolioTotal = total; } catch (_wp) {}
  if(total <= 1e-9) { card.style.display = 'none'; try { if(typeof updateRebalanceSuggestion==='function') updateRebalanceSuggestion([], 0); } catch(_r) {} try { if(typeof updateYieldFarmTracker==='function') updateYieldFarmTracker([], 0); } catch(_y0) {} return; }
  card.style.display = 'block';
  const ctx = c.getContext('2d');
  const w = c.width, h = c.height, cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 6;
  ctx.clearRect(0, 0, w, h);
  let ang = -Math.PI / 2;
  parts.forEach(function(p) {
    if(p.v <= 0) return;
    const slice = (p.v / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, ang, ang + slice);
    ctx.closePath();
    ctx.fillStyle = p.c;
    ctx.fill();
    ang += slice;
  });
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.52, 0, Math.PI * 2);
  ctx.fillStyle = '#0f0f18';
  ctx.fill();
  let htm = '';
  parts.forEach(function(p) {
    const pct = total > 0 ? (100 * p.v / total).toFixed(1) : '0';
    htm += '<div><span><span class="ww-pie-dot" style="background:' + p.c + '"></span>' + p.l + '</span><span>' + pct + '%</span></div>';
  });
  leg.innerHTML = htm;
  try { if (typeof updateRebalanceSuggestion === 'function') updateRebalanceSuggestion(parts, total); } catch (_rb) {}
  try { if (typeof updateYieldFarmTracker === 'function') updateYieldFarmTracker(parts, total); } catch (_yf) {}
}
function getNetworkFeeEstimateLines(coinId) {
  const sp = typeof getTransferFeeSpeed === 'function' ? getTransferFeeSpeed() : 'normal';
  const usdtMap = {
    slow: { line: '≈ 6–8 TRX · 能量上限（经济档）', sub: '确认较慢，费用较低' },
    normal: { line: '≈ 8.5 TRX · 合约能量', sub: '约 30 秒内确认' },
    fast: { line: '≈ 12–18 TRX · 能量上限（快速档）', sub: '优先确认' }
  };
  const trxMap = {
    slow: { line: '≈ 0.8 TRX · 带宽（经济档）', sub: '约 1–2 分钟' },
    normal: { line: '≈ 1.0 TRX · 带宽消耗（示意）', sub: '约 1 分钟内确认' },
    fast: { line: '≈ 1.2 TRX · 带宽（快速档）', sub: '约 20–40 秒' }
  };
  const ethG = { slow: '~26–30 Gwei', normal: '~35 Gwei', fast: '~42–50 Gwei' };
  const ethT = { slow: '约 5–15 分钟', normal: '约 2–5 分钟', fast: '约 30–90 秒' };
  const ethMap = {
    slow: { line: '≈ 0.0010 ETH · Gas ' + ethG.slow + '（示意）', sub: ethT.slow },
    normal: { line: '≈ 0.0012 ETH · Gas ' + ethG.normal + '（示意）', sub: ethT.normal },
    fast: { line: '≈ 0.0015 ETH · Gas ' + ethG.fast + '（示意）', sub: ethT.fast }
  };
  const btcMap = {
    slow: { line: '≈ 低费率档 sat/vB（示意）', sub: '约 40–90 分钟' },
    normal: { line: '≈ 1.2k sat/vB · 费率档（示意）', sub: '约 20–60 分钟' },
    fast: { line: '≈ 高费率档 sat/vB（示意）', sub: '约 10–30 分钟' }
  };
  if(coinId === 'trx') return trxMap[sp] || trxMap.normal;
  if(coinId === 'eth') return ethMap[sp] || ethMap.normal;
  if(coinId === 'btc') return btcMap[sp] || btcMap.normal;
  return usdtMap[sp] || usdtMap.normal;
}

function hideTransferAddrBook() {
  const box = document.getElementById('transferAddrBook');
  if(box) box.style.display = 'none';
}
function pickTransferAddrFromBookRaw(addr) {
  const ta = document.getElementById('transferAddr');
  if(ta) ta.value = addr;
  hideTransferAddrBook();
  detectAddrType();
}
function updateTransferAddrBook() {
  const box = document.getElementById('transferAddrBook');
  const ta = document.getElementById('transferAddr');
  if(!box || !ta) return;
  const q = ta.value.trim().toLowerCase();
  if(!q.length) {
    box.innerHTML = '';
    box.style.display = 'none';
    return;
  }
  const contacts = getTransferContacts();
  const recent = getRecentTransferAddrs();
  const contactSet = new Set(contacts.map(c => c.addr.trim().toLowerCase()));
  const matchedContacts = contacts.filter(c => {
    const al = (c && c.addr != null ? String(c.addr) : '').toLowerCase();
    const nl = (c && c.nick != null ? String(c.nick) : '').toLowerCase();
    return al.includes(q) || nl.includes(q);
  });
  const matchedRecent = recent.filter(a => {
    const al = (a != null ? String(a) : '').toLowerCase();
    return !contactSet.has(al) && al.includes(q);
  });
  if(!matchedContacts.length && !matchedRecent.length) {
    box.innerHTML = '';
    const empty = document.createElement('div');
    empty.className = 'transfer-addr-dd-empty';
    empty.textContent = (contacts.length || recent.length) ? '暂无匹配地址' : '暂无历史地址与联系人';
    box.appendChild(empty);
    box.style.display = 'block';
    return;
  }
  box.innerHTML = '';
  const appendHdr = function(lbl) {
    const h = document.createElement('div');
    h.className = 'transfer-addr-dd-hdr';
    h.textContent = lbl;
    box.appendChild(h);
  };
  const addContactItems = function(list) {
    list.forEach(function(item) {
      const div = document.createElement('div');
      div.className = 'transfer-addr-dd-item';
      const span = document.createElement('span');
      span.className = 'contact-nick-mark';
      span.textContent = item.nick + ' · ';
      div.appendChild(span);
      const addrSpan = document.createElement('span');
      addrSpan.setAttribute('data-ww-copy', item.addr);
      addrSpan.setAttribute('title', '点击复制完整地址');
      addrSpan.textContent = addrBookShort(item.addr);
      div.appendChild(addrSpan);
      div.title = item.addr;
      div.onmousedown = function(e) {
        if (e.target && e.target.closest && e.target.closest('[data-ww-copy]')) return;
        e.preventDefault();
        pickTransferAddrFromBookRaw(item.addr);
      };
      box.appendChild(div);
    });
  };
  const addRecentItems = function(list) {
    list.forEach(function(addr) {
      const div = document.createElement('div');
      div.className = 'transfer-addr-dd-item recent-item';
      const ico = document.createElement('span');
      ico.className = 'recent-ico';
      ico.textContent = '\u231b ';
      div.appendChild(ico);
      const addrSpan = document.createElement('span');
      addrSpan.setAttribute('data-ww-copy', addr);
      addrSpan.setAttribute('title', '点击复制完整地址');
      addrSpan.textContent = addr.length > 42 ? addr.slice(0, 18) + '...' + addr.slice(-12) : addr;
      div.appendChild(addrSpan);
      div.title = '\u6700\u8fd1\u8f6c\u8d26: ' + addr;
      div.onmousedown = function(e) {
        if (e.target && e.target.closest && e.target.closest('[data-ww-copy]')) return;
        e.preventDefault();
        pickTransferAddrFromBookRaw(addr);
      };
      box.appendChild(div);
    });
  };
  if(matchedContacts.length) {
    appendHdr('\u8054\u7cfb\u4eba');
    addContactItems(matchedContacts.slice(0, 12));
  }
  if(matchedRecent.length) {
    appendHdr('\u6700\u8fd1\u8f6c\u8d26');
    addRecentItems(matchedRecent.slice(0, 12));
  }
  box.style.display = 'block';
}
function shakeTransferAmountTooHigh() {
  const el = document.getElementById('transferAmountBox');
  if(!el) return;
  el.classList.remove('wt-transfer-shake');
  void el.offsetWidth;
  el.classList.add('wt-transfer-shake');
}

function detectAddrType() {
  const ta = document.getElementById('transferAddr');
  const addr = ta ? String(ta.value || '').trim() : '';
  const tag = document.getElementById('addrTypeTag');
  const box = document.getElementById('transferAddrBox');

  // wallet.html 精简转账页无 addrTypeTag 等节点：仅更新边框并走 calcTransferFee
  if (!tag) {
    if (!addr) {
      if (box) box.style.borderColor = 'var(--border)';
    } else if (box) {
      box.style.borderColor = 'rgba(200,168,75,0.4)';
    }
    calcTransferFee();
    return;
  }

  const icon = document.getElementById('addrTypeIcon');
  const name = document.getElementById('addrTypeName');
  const recipient = document.getElementById('recipientCard');

  if (!addr) {
    tag.style.display = 'none';
    if (recipient) recipient.style.display = 'none';
    if (box) box.style.borderColor = 'var(--border)';
    calcTransferFee();
    return;
  }

  let type = '', chainName = '', isWorldToken = false;
  if (addr.includes('·') || addr.length < 30) {
    type = '🌍'; chainName = 'WorldToken 万语地址'; isWorldToken = true;
  } else if (typeof wwClassifyPublicAddress === 'function') {
    var _wc = wwClassifyPublicAddress(addr);
    if (_wc) {
      type = _wc.icon || '❓';
      chainName = _wc.labelZh || '未识别地址格式';
    } else {
      type = '❓'; chainName = '未识别地址格式';
    }
  } else if (addr.startsWith('T') && addr.length >= 34) {
    type = '🔴'; chainName = 'TRX · Tron 链';
  } else if (addr.startsWith('0x') && addr.length >= 42) {
    type = '🔷'; chainName = 'ETH · Ethereum 链';
  } else if (addr.startsWith('bc1') || addr.startsWith('1') || addr.startsWith('3')) {
    type = '🟠'; chainName = 'BTC · Bitcoin 链';
  } else {
    type = '❓'; chainName = '未识别地址格式';
  }

  tag.style.display = 'block';
  if (icon) icon.textContent = type + ' ';
  if (name) name.textContent = chainName;
  if (box) box.style.borderColor = 'rgba(200,168,75,0.4)';

  if (isWorldToken && addr.includes('·')) {
    const parts = addr.split('·');
    const rn = document.getElementById('recipientName');
    const ra = document.getElementById('recipientAddr');
    if (rn) rn.textContent = parts[0].trim();
    if (ra) ra.textContent = (parts[1] && parts[2] ? (parts[1].trim() + ' · ' + parts[2].trim()) : '') || 'WorldToken 用户';
    if (recipient) recipient.style.display = 'block';
  } else if (recipient) {
    recipient.style.display = 'none';
  }

  calcTransferFee();
}

function checkTransferReady() {
  const addrEl = document.getElementById('transferAddr');
  const amtEl = document.getElementById('transferAmount');
  const addr = addrEl ? addrEl.value.trim() : '';
  const amt = amtEl ? (parseFloat(amtEl.value) || 0) : 0;
  const btn = document.getElementById('transferBtn');
  const feeRow = document.getElementById('transferFeeRow');
  if (feeRow) {
    if (addr || amt > 0) feeRow.style.display = 'block';
    else feeRow.style.display = 'none';
  }
  if (!btn) return;
  btn.disabled = false;
  btn.style.opacity = '1';
  btn.style.cursor = 'pointer';
}

function calcTransferFee() {
  try {
    var _ta = document.getElementById('transferAddr');
    if (typeof wwApplyTransferCoinForRecipientAddr === 'function') {
      wwApplyTransferCoinForRecipientAddr(_ta ? String(_ta.value || '').trim() : '');
    }
  } catch (_e0) {}
  try {
    var uc = typeof COINS !== 'undefined' && COINS.find && COINS.find(function (c) { return c && c.id === transferCoin.id; });
    if (uc) { transferCoin.bal = uc.bal; transferCoin.price = uc.price; }
  } catch (_e) {}
  try {
    if (transferCoin.id === 'usdt' && typeof wwGetUnifiedUsdtAvailable === 'function') {
      var unified = wwGetUnifiedUsdtAvailable();
      if (isFinite(unified) && unified >= 0) {
        transferCoin.bal = unified;
        var coinU = typeof COINS !== 'undefined' && COINS.find && COINS.find(function (c) { return c && c.id === 'usdt'; });
        if (coinU) coinU.bal = unified;
      }
    }
  } catch (_syncUsdtDom) {}
  const amtEl = document.getElementById('transferAmount');
  const amt = amtEl ? (parseFloat(amtEl.value) || 0) : 0;
  const coinData = (typeof COINS !== 'undefined' && COINS.find) ? COINS.find(function (c) { return c.id === transferCoin.id; }) : null;
  const price = (coinData && coinData.price) || transferCoin.price || 1;
  const nf = getNetworkFeeEstimateLines(transferCoin.id);
  const hintEl = document.getElementById('transferFeeHint');
  const netEl = document.getElementById('transferNetworkFee');
  const gasLineEl = document.getElementById('transferGasFeeLine');
  var _nfOne = nf.sub ? nf.line + ' · ' + nf.sub : nf.line;
  if (netEl) netEl.textContent = _nfOne;
  if (gasLineEl) gasLineEl.textContent = _nfOne;
  const balEl = document.getElementById('transferBal');
  if (balEl) {
    var b = Number(transferCoin.bal) || 0;
    balEl.textContent = (isFinite(b) ? b : 0).toLocaleString(undefined, { maximumFractionDigits: 8 });
  }
  var amtLbl = document.getElementById('transferAmountLabel');
  if (amtLbl) {
    if (transferCoin.id === 'eth') amtLbl.textContent = '金额（ETH · Ethereum）';
    else if (transferCoin.id === 'trx') amtLbl.textContent = '金额（TRX · Tron）';
    else amtLbl.textContent = '金额（USDT · TRC-20）';
  }
  var balSuf = document.getElementById('transferBalSuffix');
  if (balSuf) balSuf.textContent = transferCoin.name || '';
  const usdToCny = 7.24;
  const cnyEl = document.getElementById('transferCNY');
  const feeEl = document.getElementById('transferFee');
  const actEl = document.getElementById('transferActual');
  const usdEl = document.getElementById('transferUSD');
  const chainEl = document.getElementById('transferChain');
  if (amt <= 0) {
    if (feeEl) feeEl.textContent = '—';
    if (actEl) actEl.textContent = '—';
    if (usdEl) usdEl.textContent = '$0.00';
    if (cnyEl) cnyEl.textContent = '0.00';
    if (hintEl) {
      hintEl.textContent = _nfOne;
    }
  } else {
    var dec = transferCoin.id === 'eth' ? 6 : transferCoin.id === 'btc' ? 8 : 4;
    const actual = amt.toFixed(dec);
    if (feeEl) feeEl.textContent = nf.line;
    if (actEl) actEl.textContent = actual + ' ' + transferCoin.name;
    if (usdEl) usdEl.textContent = '$' + (amt * price).toFixed(2);
    if (cnyEl) cnyEl.textContent = (amt * price * usdToCny).toFixed(2);
    if (hintEl) {
      hintEl.textContent = nf.line + '（Gas，不从转账金额扣）· 到账 ' + actual + ' ' + transferCoin.name;
    }
  }
  const _spd = (typeof getTransferFeeSpeed === 'function') ? getTransferFeeSpeed() : 'normal';
  if (chainEl) chainEl.textContent = transferCoin.chain + ' · ' + (typeof transferSpeedHint === 'function' ? transferSpeedHint(transferCoin.id, _spd) : '约30秒');
  checkTransferReady();
  try { if (typeof wwRefreshTransferRecipientFeedback === 'function') wwRefreshTransferRecipientFeedback(); } catch (_wh) {}
  try { if (typeof wwUpdateTxSimulation === 'function') wwUpdateTxSimulation(); } catch (_ws) {}
}

function wwMevToggleInit() {
  var c = document.getElementById('wwMevToggle');
  if(!c) return;
  c.checked = (localStorage.getItem('ww_mev_private') === '1');
}

function wwMevSave() {
  var c = document.getElementById('wwMevToggle');
  if(!c) return;
  localStorage.setItem('ww_mev_private', c.checked ? '1' : '0');
  try { if(typeof wwUpdateTxSimulation==='function') wwUpdateTxSimulation(); } catch(e) {}
  if(typeof showToast==='function') showToast(c.checked ? '已开启 MEV 保护（示意）' : '已使用公开内存池（示意）', 'info', 2200);
}

function wwGasSaveTargets() {
  var a = document.getElementById('wwGasTrxTarget');
  var b = document.getElementById('wwGasEthTarget');
  if(a && a.value != null) localStorage.setItem('ww_gas_target_trx', String(a.value).trim());
  if(b && b.value != null) localStorage.setItem('ww_gas_target_eth', String(b.value).trim());
  try { wwGasManagerRender(); } catch(e) {}
}

function wwGasManagerRender() {
  var trxCoin = (typeof COINS !== 'undefined' && COINS.find) ? COINS.find(function(c){ return c && c.id==='trx'; }) : null;
  var ethCoin = (typeof COINS !== 'undefined' && COINS.find) ? COINS.find(function(c){ return c && c.id==='eth'; }) : null;
  var tc = document.getElementById('wwGasTrxCurrent');
  var ec = document.getElementById('wwGasEthCurrent');
  if(tc) tc.textContent = trxCoin && trxCoin.bal != null ? Number(trxCoin.bal).toFixed(4) : '—';
  if(ec) ec.textContent = ethCoin && ethCoin.bal != null ? Number(ethCoin.bal).toFixed(6) : '—';
  var ti = document.getElementById('wwGasTrxTarget');
  var ei = document.getElementById('wwGasEthTarget');
  var st = localStorage.getItem('ww_gas_target_trx');
  var se = localStorage.getItem('ww_gas_target_eth');
  if(ti && (st==null || st==='')) { ti.value = '50'; localStorage.setItem('ww_gas_target_trx','50'); }
  else if(ti && st) ti.value = st;
  if(ei && (se==null || se==='')) { ei.value = '0.02'; localStorage.setItem('ww_gas_target_eth','0.02'); }
  else if(ei && se) ei.value = se;
  var tt = parseFloat(ti && ti.value) || 50;
  var et = parseFloat(ei && ei.value) || 0.02;
  var bt = trxCoin ? Number(trxCoin.bal) || 0 : 0;
  var be = ethCoin ? Number(ethCoin.bal) || 0 : 0;
  var stEl = document.getElementById('wwGasStatus');
  if(stEl) {
    var okT = bt >= tt * 0.85;
    var okE = be >= et * 0.85;
    stEl.textContent = okT && okE
      ? '✓ Gas 代币储备相对目标充足（示意）。'
      : '⚠ 建议保留更多 TRX/ETH 以应对拥堵与合约交互（示意）。 TRX: ' + bt.toFixed(2) + ' / 目标 ' + tt + ' · ETH: ' + be.toFixed(4) + ' / 目标 ' + et;
    stEl.style.borderColor = okT && okE ? 'rgba(38,161,123,0.35)' : 'rgba(200,120,80,0.4)';
  }
}

function wwUpdateTxSimulation() {
  var host = document.getElementById('wwTxSimulateBody');
  if(!host) return;
  var amtEl = document.getElementById('transferAmount');
  var addrEl = document.getElementById('transferAddr');
  var amt = amtEl ? parseFloat(amtEl.value) || 0 : 0;
  var addr = addrEl ? String(addrEl.value || '').trim() : '';
  var coin = (typeof transferCoin !== 'undefined' && transferCoin) ? transferCoin : { name:'?', chain:'?' };
  var nf = (typeof getNetworkFeeEstimateLines === 'function') ? getNetworkFeeEstimateLines(coin.id) : { line:'—', sub:'' };
  var mev = (localStorage.getItem('ww_mev_private') === '1');
  var lines = [];
  lines.push('操作: 转账 ' + (amt > 0 ? amt : 0) + ' ' + (coin.name || '') + ' → ' + (addr || '（未填地址）'));
  lines.push('网络: ' + (coin.chain || '—'));
  lines.push('预估网络费: ' + nf.line + (nf.sub ? ' · ' + nf.sub : ''));
  lines.push('MEV 路由: ' + (mev ? '私有中继（示意）' : '公开内存池'));
  lines.push('风险: 请再次核对地址与金额；本预览不保证与链上结果一致。');
  host.textContent = lines.join('\n');
}

function setTransferMax() {
  document.getElementById('transferAmount').value = transferCoin.bal;
  calcTransferFee();
}

function selectTransferCoin(id) {
  // 从 COINS 读取实时余额和价格
  const coinData = COINS.find(c=>c.id===id);
  const map = {
    usdt:{id:'usdt',name:'USDT',chain:'TRC-20 · Tron + ERC-20 · Ethereum',icon:'💚',bal:coinData&&coinData.id==='usdt'?coinData.bal:0,price:coinData&&coinData.id==='usdt'?coinData.price:1},
    trx:{id:'trx',name:'TRX',chain:'Tron',icon:'🔴',bal:coinData&&coinData.id==='trx'?coinData.bal:0,price:coinData&&coinData.id==='trx'?coinData.price:0.12},
    eth:{id:'eth',name:'ETH',chain:'Ethereum',icon:'🔷',bal:coinData&&coinData.id==='eth'?coinData.bal:0,price:coinData&&coinData.id==='eth'?coinData.price:2500},
    btc:{id:'btc',name:'BTC',chain:'Bitcoin',icon:'🟠',bal:coinData&&coinData.id==='btc'?coinData.bal:0,price:coinData&&coinData.id==='btc'?coinData.price:60000},
  };
  transferCoin = COINS.find(c=>c.id===id) || map[id] || map.usdt;
  document.getElementById('transferCoinIcon').textContent = transferCoin.icon;
  document.getElementById('transferCoinName').textContent = transferCoin.name;
  document.getElementById('transferBal').textContent = transferCoin.bal.toLocaleString();
  closeTransferCoinPicker();
  calcTransferFee();
}

function openTransferCoinPicker() { _safeEl('transferCoinOverlay').classList.add('show'); }
function closeTransferCoinPicker() { _safeEl('transferCoinOverlay').classList.remove('show'); }

async function doTransfer() {
  const addr = document.getElementById('transferAddr').value.trim();
  const amt = document.getElementById('transferAmount').value;
  if(!addr) { showToast('❌ 请输入收款地址', 'error'); return; }
  var coinPre = transferCoin.id;
  var addrChk = typeof wwGetTransferRecipientValidation === 'function' ? wwGetTransferRecipientValidation(addr, coinPre) : { ok: true, message: '' };
  if (!addrChk.ok) {
    showToast(addrChk.message || (typeof WW_MSG_ADDR_WRONG !== 'undefined' ? WW_MSG_ADDR_WRONG : '地址有误，请核对地址'), 'error');
    return;
  }
  if((typeof wwIsOnline === 'function') ? !wwIsOnline() : (typeof navigator !== 'undefined' && navigator.onLine === false)) {
    showToast('📡 当前无网络，无法完成转账', 'warning');
    return;
  }
  var amtPre = typeof wwParsePositiveAmount === 'function'
    ? wwParsePositiveAmount(amt, 1e12)
    : NaN;
  if (typeof wwParsePositiveAmount !== 'function') {
    var _pf = parseFloat(amt);
    amtPre = (isFinite(_pf) && _pf > 0) ? _pf : NaN;
  }
  if (!isFinite(amtPre) || amtPre <= 0) { showToast('❌ 请输入有效转账金额', 'error'); return; }
  const amtNum = amtPre;
  try {
    var ucSend = typeof COINS !== 'undefined' && COINS.find && COINS.find(function (c) { return c && c.id === transferCoin.id; });
    if (ucSend) { transferCoin.bal = ucSend.bal; transferCoin.price = ucSend.price; }
  } catch (_eSync) {}
  const bal = Number(transferCoin.bal) || 0;
  if(bal < amtNum) { showToast('❌ 余额不足', 'error'); shakeTransferAmountTooHigh(); return; }
  if(!REAL_WALLET) { showToast('⚠️ 请先创建或导入钱包', 'warning'); return; }
  if (typeof wwSpendGateBeforeConfirm === 'function') {
    var _g = await wwSpendGateBeforeConfirm(amtNum);
    if (_g === false) return;
  }
  var _dec = transferCoin.id === 'eth' ? 6 : transferCoin.id === 'btc' ? 8 : 4;
  var _nf = getNetworkFeeEstimateLines(transferCoin.id);
  var _gasTxt = _nf.line + (_nf.sub ? ' · ' + _nf.sub : '');
  var _cf = document.getElementById('confirmFee');
  document.getElementById('confirmAmount').textContent = amt+' '+transferCoin.name;
  var _crEl = document.getElementById('confirmRecipient');
  if (_crEl) {
    if (typeof wwSetConfirmRecipientCopyable === 'function') wwSetConfirmRecipientCopyable(_crEl, addr);
    else _crEl.textContent = addr.length > 20 ? addr.slice(0, 20) + '...' : addr;
  }
  if (_cf) {
    _cf.textContent = _nf.line;
    _cf.title = _gasTxt;
  }
  document.getElementById('confirmActual').textContent = amtNum.toFixed(_dec)+' '+transferCoin.name;
  document.getElementById('confirmChain').textContent = transferCoin.chain;
  _safeEl('transferConfirmOverlay').classList.add('show');
}

function closeTransferConfirm() { _safeEl('transferConfirmOverlay').classList.remove('show'); }

function confirmTransfer() {
  if (!window._wwPinBypassConfirmTx && typeof wwEnsurePinThenForced === 'function') {
    wwEnsurePinThenForced(function () {
      try {
        window._wwPinBypassConfirmTx = true;
        confirmTransfer();
      } finally {
        window._wwPinBypassConfirmTx = false;
      }
    });
    return;
  }
  const addr = document.getElementById('transferAddr').value.trim();
  const coinPre = transferCoin.id;
  if (!addr) { showToast('❌ 请输入收款地址', 'error'); return; }
  if (typeof wwGetTransferRecipientValidation === 'function') {
    var _v0 = wwGetTransferRecipientValidation(addr, coinPre);
    if (!_v0.ok) { showToast(_v0.message || (typeof WW_MSG_ADDR_WRONG !== 'undefined' ? WW_MSG_ADDR_WRONG : '地址有误，请核对地址'), 'error'); return; }
  }
  if((typeof wwIsOnline === 'function') ? !wwIsOnline() : (typeof navigator !== 'undefined' && navigator.onLine === false)) {
    showToast('📡 当前无网络，无法完成转账', 'warning');
    return;
  }
  closeTransferConfirm();
  // 填充成功页数据
  const amt = document.getElementById('transferAmount').value;
  saveRecentTransferAddr(addr);
  var _nf2 = (typeof getNetworkFeeEstimateLines === 'function') ? getNetworkFeeEstimateLines(transferCoin.id) : { line: '—', sub: '' };
  var gasFeeDone = _nf2.line + (_nf2.sub ? ' · ' + _nf2.sub : '');
  const a = ADDR_SAMPLES[currentLang]||ADDR_SAMPLES.zh;
  const isEn = currentLang==='en';
  const info = LANG_INFO[currentLang]||{flag:'🇨🇳',name:'中文'};
  const g = getGiftCulture ? getGiftCulture() : {icon:'🌍'};

  // 发件人（我的地址）
  _safeEl('successAmount').textContent = amt;
  _safeEl('successCoin').textContent = transferCoin.name;
  (_safeEl('successCultureIcon') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* successCultureIcon fallback */.textContent = g.icon;
  // 发件人 = 我自己的地址
  if(isEn) {
    _safeEl('successFromPart1').textContent = 'My Wallet';
    _safeEl('successFromPart2').textContent = '';
    document.getElementById('successFromPart3').textContent = '';
    _safeEl('successFromLang').textContent = info.flag+' English · BIP39';
  } else {
    const parts = a.main.split(' · ');
    _safeEl('successFromPart1').textContent = parts[0]||'龙凤虎';
    _safeEl('successFromPart2').textContent = parts[1]||'举头望明月';
    document.getElementById('successFromPart3').textContent = a.num||'3829461';
    const fromAddr = getNativeAddr();
    var midTen = typeof getWanYuAddrMiddleTen === 'function' ? getWanYuAddrMiddleTen() : '';
    _safeEl('successFromLang').textContent = midTen || fromAddr.substring(0, 12) + '...';
  }
  var _sfcb = _safeEl('successFromSenderLabel');
  if (_sfcb) {
    if (typeof wwSetAddrBadgeCopyable === 'function') wwSetAddrBadgeCopyable(_sfcb, getNativeAddr());
    else if (typeof wwFormatAddrChip === 'function') {
      _sfcb.textContent = wwFormatAddrChip(getNativeAddr());
      _sfcb.title = '本人地址缩写';
    }
  }

  // 收件人 = 输入的对方地址（不同！）
  const isWW = addr.includes('·');
  var _stn = _safeEl('successToName');
  if(isWW) {
    // WorldToken母语地址，拆解显示
    const parts2 = addr.split('·').map(s=>s.trim());
    _safeEl('successToIcon').textContent = '🌍';
    var dispWN = parts2[0] || addr;
    if (_stn && typeof wwEscHtml === 'function' && typeof wwEscAttr === 'function') {
      _stn.innerHTML =
        '<span data-ww-copy="' +
        wwEscAttr(addr) +
        '" title="点击复制完整地址" style="cursor:pointer">' +
        wwEscHtml(dispWN) +
        '</span>';
    } else if (_stn) _stn.textContent = dispWN;
    _safeEl('successToAddr').textContent = (parts2[1]||'')+' · '+(parts2[2]||'') + ' · WorldToken';
  } else {
    // 公链地址
    const chainIcon = addr.startsWith('T')?'🔴':addr.startsWith('0x')?'🔷':addr.startsWith('bc')?'🟠':'⛓️';
    _safeEl('successToIcon').textContent = chainIcon;
    var dispC = addr.length > 26 ? addr.slice(0, 18) + '...' + addr.slice(-6) : addr;
    if (_stn && typeof wwEscHtml === 'function' && typeof wwEscAttr === 'function') {
      _stn.innerHTML =
        '<span data-ww-copy="' +
        wwEscAttr(addr) +
        '" title="点击复制完整地址" style="cursor:pointer">' +
        wwEscHtml(dispC) +
        '</span>';
    } else if (_stn) _stn.textContent = dispC;
    _safeEl('successToAddr').textContent = transferCoin.chain;
  }
  var _rcb = _safeEl('successRecipientBadge');
  if (_rcb) {
    if (typeof wwSetAddrBadgeCopyable === 'function') wwSetAddrBadgeCopyable(_rcb, addr);
    else if (typeof wwFormatAddrChip === 'function') {
      _rcb.textContent = wwFormatAddrChip(addr);
      _rcb.title = '收款地址缩写';
    }
  }

  // 详情
  var _sFeeEl = _safeEl('successFee');
  if (_sFeeEl) {
    _sFeeEl.textContent = _nf2.line;
    _sFeeEl.title = gasFeeDone;
  }
  const sfi=(_safeEl('successFeeInline') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* successFeeInline fallback */; if(sfi) sfi.textContent='矿工费（Gas）'+_nf2.line+' · '+transferCoin.chain;
  _safeEl('successChain').textContent = transferCoin.chain;
  const nt = new Date();
  const ts = nt.getFullYear()+'.'+String(nt.getMonth()+1).padStart(2,'0')+'.'+String(nt.getDate()).padStart(2,'0')+' '+String(nt.getHours()).padStart(2,'0')+':'+String(nt.getMinutes()).padStart(2,'0');
  const st=_safeEl('successTime2'); if(st) st.textContent=ts;

  // 先填充动画页数据
  const sw1=_safeEl('swooshToName'); if(sw1) sw1.textContent=_safeEl('successToName')?.textContent||'';
  const sw2=_safeEl('swooshToAddr'); if(sw2) sw2.textContent=_safeEl('successToAddr')?.textContent||'';
  const sw3=_safeEl('swooshAmtVal'); if(sw3) sw3.textContent=amt;
  const sw4=_safeEl('swooshCoinName'); if(sw4) sw4.textContent=transferCoin.name;
  const sf1=_safeEl('swooshFromPart1'); if(sf1) sf1.textContent=_safeEl('successFromPart1')?.textContent||'';
  const sf2=_safeEl('swooshFromPart2'); if(sf2) sf2.textContent=_safeEl('successFromPart2')?.textContent||'';
  const sfl=_safeEl('swooshFromLang'); if(sfl) sfl.textContent=_safeEl('successFromLang')?.textContent||'';

  // 尝试真实广播
  const sendBtn = document.getElementById('confirmSendBtn');
  if(sendBtn) { sendBtn.disabled=true; sendBtn.textContent='⏳ 广播中...'; }

  broadcastRealTransfer().then(ok => {
    if(sendBtn) { sendBtn.disabled=false; sendBtn.textContent='✅ 确认转账'; }
    if(ok) {
      goTo('page-swoosh'); // 广播成功，显示成功动画
      // 仅广播成功时启动嗖动画，动画结束后跳成功页（避免地址/网络等失败仍进入成功页）
      setTimeout(() => {
        const coin = document.getElementById('swooshCoin');
        const trail = document.getElementById('swooshTrail');
        const receiver = document.getElementById('swooshReceiver');
        const check = document.getElementById('swooshCheck');
        if(coin) coin.classList.add('swoosh-coin');
        if(trail) trail.classList.add('swoosh-trail');
        setTimeout(()=>{ if(receiver) receiver.classList.add('receiver-glow'); if(check) { check.textContent='✓'; check.style.color='#4ac84a'; check.style.fontSize='20px'; } }, 900);
        setTimeout(()=>{ goTo('page-transfer-success'); setTimeout(loadBalances, 2000); }, 1800);
      }, 200);
    } else {
      showToast('⚠️ 转账广播失败，请检查余额和网络', 'warning');
    }
  }).catch(err => {
    if(sendBtn) { sendBtn.disabled=false; sendBtn.textContent='✅ 确认转账'; }
    showToast('❌ 转账失败：' + (err?.message || '网络错误'), 'error');
  });
}

function shareSuccess() {
  const amt = _safeEl('successAmount').textContent;
  const coin = _safeEl('successCoin').textContent;
  const from = _safeEl('successFromPart1').textContent+' '+_safeEl('successFromPart2').textContent;
  navigator.clipboard?.writeText('我刚通过 WorldToken 发送了 '+amt+' '+coin+'\n发款方：'+from+'\nworldtoken.cc').catch(()=>{});
  const txEl = _safeEl('successTxHash');
  const txText = txEl ? txEl.textContent : '转账记录';
  navigator.clipboard?.writeText(txText).catch(()=>{});
  const btn2 = event?.target?.closest('div');
  if(btn2) { const old2 = btn2.querySelector('div:last-child')?.textContent || ''; if(btn2.querySelector('div:last-child')) { btn2.querySelector('div:last-child').textContent='✅ 已复制'; setTimeout(()=>btn2.querySelector('div:last-child').textContent=old2,1500); } }
}

// ══ 多文化礼金系统 ══
/* GIFT_CULTURE 由 wallet.ui.js 声明 */
function getGiftCulture() {
  return GIFT_CULTURE[currentLang] || GIFT_CULTURE.zh;
}

function updateGiftUI() {
  const g = getGiftCulture();
  // 更新礼物页标题
  const title = document.getElementById('giftTitle');
  const preview = document.getElementById('giftPreview');
  const icon = document.getElementById('giftIcon');
  const heroTagline = document.getElementById('giftHeroTagline');
  const blessingInput = document.getElementById('hbMessage');
  if(title) title.textContent = g.name;
  if(heroTagline) heroTagline.textContent = g.heroTagline || '';
  if(icon) icon.textContent = g.icon;
  if(blessingInput) blessingInput.value = g.desc;
  if(preview) {
    preview.style.background = `linear-gradient(160deg, ${g.color}dd, ${g.color}88, ${g.color}44)`;
  }
  updateHbPreview();
}

// ══ 礼物口令系统 ══
/* KW_* / LANG_KW 由 wallet.ui.js 声明 */

/* hbExpiry / hbType 由 wallet.ui.js 声明为 var */

/* BLESSINGS 由 wallet.ui.js 声明 */

function getKwPool() {
  return LANG_KW[currentLang] || KW_ZH;
}

function genKeyword() {
  const pool = getKwPool();
  return pool[Math.floor(Math.random() * pool.length)];
}

function switchHbType(type) {
  hbType = type;
  const n = document.getElementById('btnNormal');
  const l = document.getElementById('btnLucky');
  if(type === 'normal') {
    n.style.background = 'linear-gradient(135deg,#b8982a,#e8c850)';
    n.style.color = '#0a0a05';
    l.style.background = 'none';
    l.style.color = 'var(--text-muted)';
  } else {
    l.style.background = 'linear-gradient(135deg,#b8982a,#e8c850)';
    l.style.color = '#0a0a05';
    n.style.background = 'none';
    n.style.color = 'var(--text-muted)';
  }
  updateHbPreview();
}

function setAmt(v) {
  document.getElementById('hbAmount').value = v;
  updateHbPreview();
}

function setExpiry(h) {
  hbExpiry = h;
  ['exp24','exp72','exp168'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) { el.style.borderColor='var(--border)'; el.style.color='var(--text-muted)'; el.style.background='var(--bg2)'; }
  });
  const active = h===24?'exp24':h===72?'exp72':'exp168';
  const el = document.getElementById(active);
  if(el) { el.style.borderColor='rgba(200,168,75,0.4)'; el.style.color='var(--gold)'; el.style.background='linear-gradient(135deg,rgba(200,168,75,0.12),rgba(200,168,75,0.04))'; }
}

function randomBlessing() {
  const b = BLESSINGS[Math.floor(Math.random()*BLESSINGS.length)];
  document.getElementById('hbMessage').value = b;
}

function createHongbao() {
  if (!REAL_WALLET) {
    showToast('⚠️ 请先创建或导入钱包', 'warning');
    return;
  }
  try {
    if (typeof syncHbCountFromInput === 'function') syncHbCountFromInput();
  } catch (_sc) {}
  currentKeyword = genKeyword();
  var amtEl = document.getElementById('hbAmount');
  var amount = amtEl ? parseFloat(amtEl.value) : NaN;
  if (!(amount > 0) || !isFinite(amount)) {
    showToast('请输入有效金额', 'error');
    return;
  }
  if (typeof wwAssertUsdtBalanceSufficientForGift === 'function' && !wwAssertUsdtBalanceSufficientForGift(amount)) return;
  if (!window._wwPinBypassCreateHb && typeof wwEnsurePinThenForced === 'function') {
    wwEnsurePinThenForced(function () {
      try {
        window._wwPinBypassCreateHb = true;
        createHongbao();
      } finally {
        window._wwPinBypassCreateHb = false;
      }
    });
    return;
  }
  if (typeof wwGiftReserveUsdt === 'function' && !wwGiftReserveUsdt(amount)) return;
  const blessing = document.getElementById('hbMessage').value;
  const count = hbCount;
  const perPerson = hbType==='normal' ? (amount/count).toFixed(2) : null;
  const expireAt = Date.now() + hbExpiry * 3600 * 1000;

  // 存入 localStorage
  const hbData = {
    keyword: currentKeyword,
    totalAmount: amount,
    count: count,
    perPerson: perPerson,
    type: hbType,
    blessing: blessing,
    expireAt: expireAt,
    createdAt: Date.now(),
    claimed: [],  // {addr, amount, time}
    creator: REAL_WALLET.trxAddress,
    giftExpiryProcessed: false
  };
  const allHb = JSON.parse(localStorage.getItem('ww_hongbaos')||'{}');
  allHb[currentKeyword] = hbData;
  localStorage.setItem('ww_hongbaos', JSON.stringify(allHb));

  // 更新UI
  document.getElementById('kwKeyword').textContent = currentKeyword;
  document.getElementById('kwBlessingText').textContent = blessing;
  document.getElementById('kwAmtText').textContent = amount + ' USDT';
  document.getElementById('kwCntText').textContent = '共' + count + '份礼物';
  document.getElementById('kwExpText').textContent = '有效期' + hbExpiry + '小时';
  document.getElementById('kwShareKeyword').textContent = currentKeyword;
  document.getElementById('kwProgress').textContent = '0 / ' + count + ' 已领取';
  document.getElementById('kwProgressBar').style.width = '0%';
  const shareUrl = 'https://worldtoken.cc/wallet.html';
  document.getElementById('kwShareText').innerHTML = '🎁 我给你发了一个WorldToken礼物！<br>口令：<span style="color:var(--gold);font-weight:700">' + currentKeyword + '</span><br>打开WorldToken → 输入口令 → 立即领取 💰<br><span style="color:var(--text-muted);font-size:11px">有效期' + hbExpiry + '小时，先到先得</span>';

  goTo('page-hb-keyword');
}

function copyKw() {
  navigator.clipboard?.writeText(currentKeyword).catch(()=>{});
  const btn = document.getElementById('copyKwBtn');
  btn.querySelector('div:last-child').textContent = '✅ 已复制';
  setTimeout(()=>{ btn.querySelector('div:last-child').textContent = '复制口令'; }, 2000);
}

function shareKw() {
  const txt = '🎁 我给你发了一个WorldToken礼物！\n口令：' + currentKeyword + '\n打开链接领取 👉 https://worldtoken.cc/wallet.html\n有效期' + hbExpiry + '小时，先到先得';
  // 尝试直接分享 Telegram
  const tgUrl = 'https://t.me/share/url?url=' + encodeURIComponent('https://worldtoken.cc/wallet.html') + '&text=' + encodeURIComponent('🎁 WorldToken礼物口令：' + currentKeyword + '\n输入口令即可领取加密货币！');
  window.open(tgUrl, '_blank');
}

function showHbQR() {
  if(!currentKeyword) return;
  const url = 'https://worldtoken.cc/wallet.html?claim=' + encodeURIComponent(currentKeyword);
  loadQRCodeLib().then(function(){
    if(typeof QRCode !== 'undefined') {
      const canvas = document.createElement('canvas');
      QRCode.toCanvas(canvas, url, {width:200,margin:1}, function() {
        canvas.toDataURL();
        showToast('💬 请截图分享口令：' + currentKeyword, 'info', 4000);
      });
    } else {
      showToast('✅ 口令已复制：' + currentKeyword, 'success');
    }
  }).catch(function(){ showToast('✅ 口令已复制：' + currentKeyword, 'success'); });
}

function copyShareText() {
  const txt = document.getElementById('kwShareText').textContent;
  navigator.clipboard?.writeText(txt).catch(()=>{});
  document.getElementById('kwShareText').style.opacity = '0.6';
  setTimeout(()=>document.getElementById('kwShareText').style.opacity='1', 800);
}

/* submitClaim / onClaimInput / fillKeyword：见 wallet.ui.js（避免覆盖导致与新礼物格式不兼容） */

/* hbCount 由 wallet.ui.js 声明为 var */
function selectHbType(type) {
  hbType = type;
  document.getElementById('hbTypeNormal').style.borderColor = type==='normal'?'var(--gold)':'var(--border)';
  document.getElementById('hbTypeLucky').style.borderColor = type==='lucky'?'var(--gold)':'var(--border)';
  updateHbPreview();
}
function changeCount(delta) {
  hbCount = Math.max(1, Math.min(100, hbCount+delta));
  document.getElementById('hbCountVal').textContent = hbCount;
  (_safeEl('hbCountDisplay')||document.getElementById('hbCountVal')).textContent = hbCount+' 个';
  updateHbPreview();
}

function chgCnt(delta) {
  hbCount = Math.max(1, Math.min(20, hbCount + delta));
  const el = document.getElementById('hbCountVal');
  if(el) el.textContent = hbCount;
  const label = document.getElementById('hbCountLabel');
  if(label) label.textContent = hbCount + ' 个';
  updateHbPreview();
}

function updateHbPreview() {
  const amount = parseFloat(document.getElementById('hbAmount')?.value)||0;
  const per = document.getElementById('hbPerPerson');
  const tl = document.getElementById('hbTypeLabel');
  if(per) per.textContent = hbType==='lucky' ? '随机金额' : (hbCount>0?(amount/hbCount).toFixed(2)+' USDT':'- USDT');
  if(tl) tl.textContent = hbType==='lucky' ? '随机金额' : '每人金额';
}
function sendHongbao() {
  const amount = document.getElementById('hbAmount').value;
  document.getElementById('hbSuccessDesc').innerHTML = amount+' USDT · '+hbCount+'份礼物';
  document.getElementById('hbSuccessKeyword').textContent = currentKeyword;
  document.getElementById('hbSuccessOverlay').style.display = 'flex';
}
function hideHbSuccess() { document.getElementById('hbSuccessOverlay').style.display = 'none'; }


/* CURRENCIES / currencyIdx 由 wallet.ui.js 声明为 var */
function toggleCurrency() {
  currencyIdx = (currencyIdx+1) % CURRENCIES.length;
  const el = _safeEl('settingsCurrency'); if(!el) return;
  if(el) el.textContent = CURRENCIES[currencyIdx];
}

function toggleNetwork() {
  const el = (_safeEl('settingsNetwork') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* settingsNetwork fallback */;
  if(el) el.textContent = el.textContent==='主网' ? '测试网' : '主网';
}

function deleteWallet() {
  if(!window.confirm('⚠️ 确认删除钱包？请确保已备份助记词！')) return;
  if(!window.confirm('再次确认：删除后资产将永久丢失！')) return;
  wwPurgeLocalWalletStorage();
  // 跳回欢迎页
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-welcome').classList.add('active');
  showToast('✅ 钱包已删除', 'success');
}

function markBackupDone() {
  const w = JSON.parse(localStorage.getItem('ww_wallet')||'{}');
  w.backedUp = true;
  localStorage.setItem('ww_wallet', JSON.stringify(w));
  if(REAL_WALLET) REAL_WALLET.backedUp = true;
  const el = document.getElementById('backupStatus');
  if(el) { el.textContent='已备份'; el.style.color='var(--green,#26a17b)'; }
  if (typeof updateHomeBackupBanner === 'function') updateHomeBackupBanner();
  if (typeof updateWalletSecurityScoreUI === 'function') updateWalletSecurityScoreUI();
  if (typeof wwPopulatePriceAlertForm === 'function') wwPopulatePriceAlertForm();
}

function updateSettingsPage() {
  const info = LANG_INFO[currentLang]||{name:'中文'};
  const sl = (_safeEl('settingsLang') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* settingsLang fallback */;
  if(sl) sl.textContent = info.name;
  const wn = getWalletNickname();
  const wti = document.getElementById('settingsWalletTitle');
  if (wti) wti.textContent = wn || '我的钱包';
  const wni = document.getElementById('walletNicknameInput');
  if (wni && document.activeElement !== wni) wni.value = wn;
  if (typeof applyWwTheme === 'function') applyWwTheme();
  try {
    if (typeof renderHomeAddrChip === 'function') renderHomeAddrChip();
  } catch (_sa) {}
  // 实时反映备份状态
  const bs = document.getElementById('backupStatus');
  if(bs) {
    const backed = REAL_WALLET && REAL_WALLET.backedUp;
    bs.textContent = backed ? '已备份' : '未备份';
    bs.style.color = backed ? 'var(--green,#26a17b)' : 'var(--red,#e74c3c)';
  }
  var spv = document.getElementById('settingsPinValue');
  if (spv) {
    var pinSet = false;
    try {
      pinSet = typeof wwHasPinConfigured === 'function' && wwHasPinConfigured();
    } catch (_pp) {}
    spv.textContent = pinSet ? '已设置' : '未设置';
    spv.style.color = pinSet ? 'var(--green,#26a17b)' : 'var(--text-muted)';
  }
  const tv = document.getElementById('settingsTotpValue');
  if(tv) {
    const on = (typeof wwTotpEnabled === 'function' && wwTotpEnabled());
    tv.textContent = on ? '已开启' : '未开启';
    tv.style.color = on ? 'var(--green,#26a17b)' : 'var(--text-muted)';
  }
  if(typeof wwApplyIdleLockLabel==='function') wwApplyIdleLockLabel();
  if (typeof updateReferralSettingsUI === 'function') updateReferralSettingsUI();
  if (typeof updateHomeBackupBanner === 'function') updateHomeBackupBanner();
  const apv = document.getElementById('settingsAntiPhishValue');
  if (apv) {
    var aw = '';
    try { aw = localStorage.getItem('ww_antiphish_word') || ''; } catch (e) {}
    apv.textContent = aw ? ('已设置 · ' + aw.slice(0, 6) + (aw.length > 6 ? '…' : '')) : '未设置';
    apv.style.color = aw ? 'var(--green,#26a17b)' : 'var(--text-muted)';
  }
  var scv = document.getElementById('settingsSocialRecoveryValue');
  if (scv) {
    var n = 0;
    try { var ar = JSON.parse(localStorage.getItem('ww_social_contacts_v1') || '[]'); n = Array.isArray(ar) ? ar.length : 0; } catch (e0) { n = 0; }
    scv.textContent = n ? (n + ' 人') : '未添加';
    scv.style.color = n ? 'var(--green,#26a17b)' : 'var(--text-muted)';
  }
  var slv = document.getElementById('settingsSpendLimitValue');
  if (slv) {
    var sp = {};
    try { sp = JSON.parse(localStorage.getItem('ww_spend_limit_v1') || '{}'); } catch (e1) { sp = {}; }
    if (sp && sp.en && parseFloat(sp.dailyUsd) > 0) {
      slv.textContent = '每日 $' + parseFloat(sp.dailyUsd).toFixed(0);
      slv.style.color = 'var(--green,#26a17b)';
    } else {
      slv.textContent = '关闭';
      slv.style.color = 'var(--text-muted)';
    }
  }
  var whv = document.getElementById('settingsWhaleValue');
  if (whv) {
    var wh = {};
    try { wh = JSON.parse(localStorage.getItem('ww_whale_v1') || '{}'); } catch (e2) { wh = {}; }
    if (wh && wh.en) {
      whv.textContent = '已开 · $' + (parseFloat(wh.thresholdUsd) > 0 ? parseFloat(wh.thresholdUsd).toFixed(0) : '—');
      whv.style.color = 'var(--green,#26a17b)';
    } else {
      whv.textContent = '关闭';
      whv.style.color = 'var(--text-muted)';
    }
  }
  if (typeof updateWalletSecurityScoreUI === 'function') updateWalletSecurityScoreUI();
  try { if (typeof updateReputationSettingsRow === 'function') updateReputationSettingsRow(); } catch (_rs) {}
  var sav = document.getElementById('settingsAppVersion');
  if (sav) {
    var ver = (typeof WW_APP_VERSION !== 'undefined' && WW_APP_VERSION) ? String(WW_APP_VERSION) : '—';
    sav.textContent = ver;
    sav.style.color = 'var(--text-muted)';
  }
}

/** 首次打开时请求浏览器通知权限（仅询问一次） */
function requestPushPermissionOnFirstLaunch() {
  try {
    if (localStorage.getItem('ww_push_asked')) return;
    if (typeof Notification === 'undefined') {
      localStorage.setItem('ww_push_asked', '1');
      return;
    }
    Notification.requestPermission().finally(function () {
      localStorage.setItem('ww_push_asked', '1');
    });
  } catch (e) {
    try { localStorage.setItem('ww_push_asked', '1'); } catch (x) {}
  }
}

function promptWalletNotifications() {
  try {
    if (typeof Notification === 'undefined') {
      if (typeof showToast === 'function') showToast('当前环境不支持通知', 'info', 2500);
      else alert('当前环境不支持通知');
      return;
    }
    Notification.requestPermission().then(function (p) {
      localStorage.setItem('ww_push_asked', '1');
      const msg = p === 'granted' ? '已开启通知' : ('通知权限：' + p);
      if (typeof showToast === 'function') showToast(msg, 'info', 2500);
      try { if (typeof renderSystemNotificationsPanel === 'function') renderSystemNotificationsPanel(); } catch (_r) {}
    });
  } catch (e) {}
}

function wwGetSystemNotificationEntries() {
  try {
    var raw = localStorage.getItem('ww_system_notifs_v1');
    if (!raw) return [];
    var a = JSON.parse(raw);
    return Array.isArray(a) ? a : [];
  } catch (e2) { return []; }
}

function wwEscapeHtml(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderSystemNotificationsPanel() {
  var permEl = document.getElementById('systemNotifPermissionRow');
  var listEl = document.getElementById('systemNotifList');
  var actEl = document.getElementById('systemNotifActions');
  if (!permEl || !listEl || !actEl) return;
  if (typeof Notification === 'undefined') {
    permEl.textContent = '当前环境不支持浏览器推送，仅可查看下方应用内通知记录。';
  } else {
    var st = Notification.permission;
    var label = st === 'granted' ? '浏览器推送：已开启' : (st === 'denied' ? '浏览器推送：已拒绝（请在系统或站点设置中允许）' : '浏览器推送：未授权');
    permEl.textContent = label;
  }
  var entries = wwGetSystemNotificationEntries();
  if (!entries.length) {
    listEl.innerHTML = '<div style="font-size:13px;color:var(--text-muted);line-height:1.6;text-align:center;padding:8px 4px 4px">暂无通知记录</div><div style="font-size:11px;color:var(--text-dim);line-height:1.55;margin-top:10px;text-align:center">安全提示、转账结果等将显示在此处。可在下方开启浏览器推送以便后台提醒。</div>';
  } else {
    listEl.innerHTML = entries.slice(0, 50).map(function (it) {
      var t = it && it.t ? String(it.t) : '';
      var title = it && it.title ? String(it.title) : '通知';
      var body = it && it.body ? String(it.body) : '';
      return '<div style="padding:10px 0;border-bottom:1px solid var(--border);text-align:left"><div style="font-size:10px;color:var(--text-dim);margin-bottom:4px">' + wwEscapeHtml(t) + '</div><div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:4px">' + wwEscapeHtml(title) + '</div><div style="font-size:12px;color:var(--text-muted);line-height:1.45">' + wwEscapeHtml(body) + '</div></div>';
    }).join('');
  }
  actEl.innerHTML = '';
  if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-primary';
    btn.style.cssText = 'width:100%;padding:12px';
    btn.textContent = Notification.permission === 'denied' ? '前往系统设置开启推送' : '开启浏览器推送通知';
    btn.onclick = function () {
      if (Notification.permission === 'denied') {
        if (typeof showToast === 'function') showToast('请在浏览器站点设置中允许通知', 'info', 3200);
        else alert('请在浏览器站点设置中允许通知');
        return;
      }
      promptWalletNotifications();
    };
    actEl.appendChild(btn);
  }
}

function openSystemNotificationsPanel() {
  var ov = document.getElementById('systemNotifOverlay');
  if (!ov) return;
  try { renderSystemNotificationsPanel(); } catch (_e) {}
  ov.classList.add('show');
}

function closeSystemNotificationsPanel() {
  var ov = document.getElementById('systemNotifOverlay');
  if (ov) ov.classList.remove('show');
}

function openReceivePage() {
  try { goTab('tab-addr'); } catch (e) { try { goTo('page-addr'); } catch (e2) {} }
  setTimeout(function () {
    var el = document.getElementById('receiveQrSection') || document.getElementById('qrCodeContainer');
    if (el && el.scrollIntoView) {
      try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e3) { el.scrollIntoView(true); }
    }
  }, 120);
}


// ══ 兑换系统 ══
/* COINS 由 wallet.ui.js 声明为 var（USDT/TRX 等） */

function wwEscAttr(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

/** 圆形区域内的图标 HTML：优先 CDN logo，否则退回 emoji/占位 */
function wwCoinIconInnerHtml(coin, sizePx) {
  sizePx = sizePx || 24;
  if (!coin) return '●';
  if (coin.logoUrl) {
    var _alt = String((coin && (coin.name || coin.symbol)) || '').trim();
    return '<img src="' + wwEscAttr(coin.logoUrl) + '" alt="' + wwEscAttr(_alt) + '" class="ww-coin-logo-img" width="' + sizePx + '" height="' + sizePx + '" loading="lazy" decoding="async" referrerpolicy="no-referrer" draggable="false">';
  }
  var em = coin.icon || '●';
  return '<span class="ww-coin-logo-emoji" style="font-size:' + Math.round(sizePx * 0.7) + 'px;line-height:1">' + em + '</span>';
}

let swapFrom = COINS.find(c => c.id === 'usdt') || COINS[0];
let swapTo   = COINS.find(c => c.id === 'trx') || COINS[1];
/** 接受 CoinGecko 参考价，预估输出再 ×0.99（比「理论准确」参考换算低 1%，偏保守） */
var WW_SWAP_REF_CONSERVATIVE_FACTOR = 0.99;
let pickerTarget = 'from';

function setSwapCoin(target, coin) {
  if(target==='from') swapFrom=coin;
  else swapTo=coin;
  renderSwapUI();
  calcSwap();
}

function renderSwapUI() {
  try { if (typeof wwSyncCoinBalsFromHomeAssetDom === 'function') wwSyncCoinBalsFromHomeAssetDom(); } catch (_syncSw) {}
  const f=swapFrom, t=swapTo;
  var sfi = _safeEl('swapFromIcon');
  if (sfi) {
    sfi.style.background = f.logoUrl ? 'rgba(255,255,255,0.06)' : f.bg;
    sfi.innerHTML = wwCoinIconInnerHtml(f, 28);
  }
  (_safeEl('swapFromName') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* swapFromName fallback */.textContent=f.name;
  (_safeEl('swapFromChain') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* swapFromChain fallback */.textContent=f.chain;
  (_safeEl('swapFromBal') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* swapFromBal fallback */.textContent=f.bal.toLocaleString();
  var sti = _safeEl('swapToIcon');
  if (sti) {
    sti.style.background = t.logoUrl ? 'rgba(255,255,255,0.06)' : t.bg;
    sti.innerHTML = wwCoinIconInnerHtml(t, 28);
  }
  (_safeEl('swapToName') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* swapToName fallback */.textContent=t.name;
  (_safeEl('swapToChain') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* swapToChain fallback */.textContent=t.chain;
  try {
    var _sec = document.getElementById('swapRecipientSection');
    var _chk = document.getElementById('swapToOtherChk');
    if (_sec && t && t.id !== 'trx') {
      _sec.style.opacity = '0.45';
      _sec.style.pointerEvents = 'none';
      if (_chk) _chk.checked = false;
      var _row = document.getElementById('swapRecipientRow');
      if (_row) _row.style.display = 'none';
    } else if (_sec) {
      _sec.style.opacity = '1';
      _sec.style.pointerEvents = '';
    }
  } catch (_sr) {}
  var _swc = typeof WW_SWAP_REF_CONSERVATIVE_FACTOR === 'number' ? WW_SWAP_REF_CONSERVATIVE_FACTOR : 0.99;
  const rateNum = (swapFrom.price / swapTo.price) * _swc;
  const rate = t.id === 'trx' ? rateNum.toFixed(2) : rateNum.toFixed(swapTo.price > 100 ? 6 : 4);
  (_safeEl('swapRate') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* swapRate fallback */.textContent=`1 ${f.name} ≈ ${rate} ${t.name}`;
}

function calcSwap() {
  const amtIn = parseFloat(_safeEl('swapAmountIn').value)||0;
  // 用实时价格（已由 loadSwapPrices 更新）
  const pFrom = swapFrom.price || 1;
  const pTo = swapTo.price || 1;
  const fee = amtIn * 0.003;
  var _hair = typeof WW_SWAP_REF_CONSERVATIVE_FACTOR === 'number' ? WW_SWAP_REF_CONSERVATIVE_FACTOR : 0.99;
  const amtOut = ((amtIn - fee) * pFrom / pTo) * _hair;
  const fmt = swapTo.id === 'trx' ? amtOut.toFixed(2) : (amtOut > 1 ? amtOut.toFixed(4) : amtOut.toFixed(8));
  (_safeEl('swapAmountOut') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* swapAmountOut fallback */.textContent = fmt;
  (_safeEl('swapInUSD') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* swapInUSD fallback */.textContent = '$'+(amtIn*pFrom).toFixed(2);
  (_safeEl('swapOutUSD') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* swapOutUSD fallback */.textContent = '$'+(amtOut * pTo).toFixed(2);
  (_safeEl('swapFee') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* swapFee fallback */.textContent = `0.30%（${fee.toFixed(4)} ${swapFrom.name}）`;
  // 更新汇率显示（与预估同口径：参考价 × 保守系数）
  const rate = (pFrom / pTo) * _hair;
  const rateEl = (_safeEl('swapRateInfo') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* swapRateInfo fallback */;
  if(rateEl) rateEl.textContent = `1 ${swapFrom.name} ≈ ${swapTo.id === 'trx' ? rate.toFixed(2) : (rate > 1 ? rate.toFixed(4) : rate.toFixed(8))} ${swapTo.name}`;
  try { if(typeof updateCrossChainSwapCompare==='function') updateCrossChainSwapCompare(); } catch(_cc) {}
}

// 与 loadBalances 共用 getPrices() 缓存，避免短时间内两次 CoinGecko 请求给出略有差异的 TRX 单价导致「预估获得」数字来回变
async function loadSwapPrices() {
  try {
    const p = await getPrices();
    const priceMap = { usdt: p.usdt, trx: p.trx, eth: p.eth, btc: p.btc, bnb: p.bnb };
    COINS.forEach(coin => { var v = priceMap[coin.id]; if (v != null) coin.price = v; });
    calcSwap();
    try { if(typeof updateCrossChainSwapCompare==='function') updateCrossChainSwapCompare(); } catch(_cc2) {}
    console.log('兑换价格已更新');
  } catch(e) { console.log('价格加载失败，使用默认'); }
}

function swapCoins() {
  const tmp=swapFrom; swapFrom=swapTo; swapTo=tmp;
  const btn=_safeEl('swapArrowBtn');
  btn.style.transform='rotate(180deg)';
  setTimeout(()=>btn.style.transform='',300);
  renderSwapUI(); calcSwap();
}

function setSwapMax() {
  _safeEl('swapAmountIn').value=swapFrom.bal;
  calcSwap();
}

function openCoinPicker(target) {
  pickerTarget=target;
  const list=document.getElementById('coinPickerList');
  list.innerHTML='';
  COINS.forEach(coin=>{
    const current = target==='from'?swapFrom:swapTo;
    const other = target==='from'?swapTo:swapFrom;
    if(coin.id===other.id) return; // 不能选同一个
    const div=document.createElement('div');
    div.style.cssText='display:flex;align-items:center;gap:12px;background:var(--bg3);border:1.5px solid '+(coin.id===current.id?'var(--gold)':'var(--border)')+';border-radius:14px;padding:12px 14px;cursor:pointer;transition:all 0.2s';
    var _bgPick = coin.logoUrl ? 'rgba(255,255,255,0.08)' : coin.bg;
    div.innerHTML='<div style="width:36px;height:36px;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:'+_bgPick+'">'+wwCoinIconInnerHtml(coin,36)+'</div><div class="u4"><div style="font-size:15px;font-weight:600;color:var(--text)">'+coin.name+'</div><div style="font-size:11px;color:var(--text-muted)">'+coin.chain+'</div></div><div class="u6"><div style="font-size:14px;color:var(--text)">'+coin.bal.toLocaleString()+'</div></div>';
    div.onclick=()=>{setSwapCoin(pickerTarget,coin);closeCoinPicker();};
    list.appendChild(div);
  });
  const _ovcoinPi = document.getElementById('coinPickerOverlay'); if(_ovcoinPi) _ovcoinPi.classList.add('show');
}

function closeCoinPicker() { const _ovcoinPi2 = document.getElementById('coinPickerOverlay'); if(_ovcoinPi2) _ovcoinPi2.classList.remove('show'); }

/** 单行资产折合 USDT（价格均为相对美元的报价，USDT 作基准折 U） */
function wwFmtApproxUsdt(n, maxFrac) {
  maxFrac = maxFrac == null ? 2 : maxFrac;
  if (!isFinite(n)) n = 0;
  var s = n >= 1 ? n.toLocaleString('en', { maximumFractionDigits: maxFrac }) : n.toFixed(maxFrac);
  return '≈ ' + s + ' USDT';
}

/** 根据 COINS：余额为「实际数量」；总资产与各币估值 = 折合 USDT（Σ 数量×(币价/USDT价)） */
function wwHomePaintFromCoinsPortfolio() {
  try {
    if (typeof COINS === 'undefined' || !COINS || !COINS.forEach) return;
    var pUsdtRef = 1;
    var cu0 = COINS.find(function (c) { return c && c.id === 'usdt'; });
    if (cu0 && isFinite(cu0.price) && cu0.price > 0) pUsdtRef = cu0.price;
    var u = 0, t = 0, e = 0, b = 0;
    var pu = 1, pt = 0.12, pe = 2500, pb = 60000;
    COINS.forEach(function (c) {
      if (!c || !c.id) return;
      if (c.id === 'usdt') { u = Number(c.bal) || 0; if (isFinite(c.price) && c.price > 0) pu = c.price; }
      else if (c.id === 'trx') { t = Number(c.bal) || 0; if (isFinite(c.price) && c.price > 0) pt = c.price; }
      else if (c.id === 'eth') { e = Number(c.bal) || 0; if (isFinite(c.price) && c.price > 0) pe = c.price; }
      else if (c.id === 'btc') { b = Number(c.bal) || 0; if (isFinite(c.price) && c.price > 0) pb = c.price; }
    });
    var eqU = u * (pu / pUsdtRef);
    var eqT = t * (pt / pUsdtRef);
    var eqE = e * (pe / pUsdtRef);
    var eqB = b * (pb / pUsdtRef);
    var totalUsdtEquiv = eqU + eqT + eqE + eqB;
    var fmtBal = function (n) { return n >= 1 ? n.toLocaleString('en', { maximumFractionDigits: 2 }) : n.toFixed(4); };
    var set = function (id, val) { var el = document.getElementById(id); if (el) el.textContent = val; };
    set('balUsdt', fmtBal(u));
    set('valUsdt', wwFmtApproxUsdt(eqU, 2));
    set('balTrx', fmtBal(t));
    set('valTrx', wwFmtApproxUsdt(eqT, 4));
    set('balEth', fmtBal(e));
    set('valEth', wwFmtApproxUsdt(eqE, 4));
    set('balBtc', fmtBal(b));
    set('valBtc', wwFmtApproxUsdt(eqB, 4));
    var tbd = document.getElementById('totalBalanceDisplay');
    if (tbd) {
      tbd.classList.remove('home-balance--loading');
      cancelHomeBalanceAnim();
      tbd.textContent = wwFmtApproxUsdt(totalUsdtEquiv, 2);
    }
    try { window._lastTotalUsd = totalUsdtEquiv; } catch (_w) {}
    var tbs = document.getElementById('totalBalanceSub');
    var fillSub = function (tot, ci) {
      var rate = Number(ci && ci.rate);
      if (!isFinite(rate) || rate <= 0) rate = 7.2;
      var lb = ci && ci.label ? ci.label : '实时汇率';
      if (tbs) tbs.textContent = '≈ ' + (tot * rate).toFixed(0) + ' CNY · ' + lb;
    };
    if (typeof wwGetHomeCnyInfo === 'function') {
      void wwGetHomeCnyInfo().then(function (ci) {
        fillSub(totalUsdtEquiv, ci);
        try {
          if (typeof wwPersistHomeBalanceSnap === 'function' && typeof wwWalletSnapIdForCache === 'function') {
            var _chgSnap = document.getElementById('chgUsdt');
            var rate = Number(ci && ci.rate);
            if (!isFinite(rate) || rate <= 0) rate = 7.2;
            var lb = ci && ci.label ? ci.label : '实时汇率';
            wwPersistHomeBalanceSnap({
              totalUsd: totalUsdtEquiv,
              totalTxt: wwFmtApproxUsdt(totalUsdtEquiv, 2),
              subTxt: '≈ ' + (totalUsdtEquiv * rate).toFixed(0) + ' CNY · ' + lb,
              balUsdt: fmtBal(u),
              valUsdt: wwFmtApproxUsdt(eqU, 2),
              balTrx: fmtBal(t),
              valTrx: wwFmtApproxUsdt(eqT, 4),
              balEth: fmtBal(e),
              valEth: wwFmtApproxUsdt(eqE, 4),
              balBtc: fmtBal(b),
              valBtc: wwFmtApproxUsdt(eqB, 4),
              chgUsdt: _chgSnap ? _chgSnap.textContent : ''
            });
          }
        } catch (_p) {}
      }).catch(function () { fillSub(totalUsdtEquiv, null); });
    } else {
      fillSub(totalUsdtEquiv, null);
    }
    if (typeof drawPortfolioPieChart === 'function') drawPortfolioPieChart(eqU, eqT, eqE, eqB);
    if (typeof renderSwapUI === 'function') renderSwapUI();
    if (typeof calcSwap === 'function') calcSwap();
    if (typeof applyHideZeroTokens === 'function') applyHideZeroTokens();
  } catch (_e) {}
}

function wwFmtAddrShort(addr) {
  if (!addr || typeof addr !== 'string') return '';
  var s = addr.trim();
  if (s.length <= 12) return s;
  return s.slice(0, 6) + '…' + s.slice(-4);
}

function wwIsValidTronAddr(addr) {
  if (!addr || typeof addr !== 'string') return false;
  var s = addr.trim();
  if (typeof TronWeb !== 'undefined' && TronWeb.isAddress) {
    try { return TronWeb.isAddress(s); } catch (_e) { /* fall through */ }
  }
  return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(s);
}

/** 兑换页：展开/收起「他人收款地址」 */
function wwSwapToOtherToggle() {
  var chk = document.getElementById('swapToOtherChk');
  var row = document.getElementById('swapRecipientRow');
  var on = chk && chk.checked;
  if (row) row.style.display = on ? 'block' : 'none';
  if (!on) {
    var inp = document.getElementById('swapRecipientTrx');
    if (inp) inp.value = '';
  }
}

/** 与 wallet.ui.js 一致：USDT(TRC-20) / TRX 在 SunSwap 的合约标识 */
function wwSunSwapTronTokenIds() {
  var u = typeof WW_SUNSWAP_USDT !== 'undefined' ? WW_SUNSWAP_USDT : 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
  var t = typeof WW_SUNSWAP_TRX !== 'undefined' ? WW_SUNSWAP_TRX : 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb';
  return { inputCurrency: u, outputCurrency: t };
}

/**
 * 「兑换到他人地址」沿用原先逻辑：不在应用内改余额，仅打开 SunSwap，由用户在链上完成兑换；
 * 尽量在 URL 中附带 recipient，便于 DEX 预填收款方（若前端忽略该参数，请在 SunSwap 内手动指定）。
 */
function wwSwapOpenSunSwapForOtherRecipient() {
  if (!window._wwPinBypassSunSwapOther && typeof wwEnsurePinThenForced === 'function') {
    wwEnsurePinThenForced(function () {
      try {
        window._wwPinBypassSunSwapOther = true;
        wwSwapOpenSunSwapForOtherRecipient();
      } finally {
        window._wwPinBypassSunSwapOther = false;
      }
    });
    return;
  }
  var inp = _safeEl('swapAmountIn');
  var amt = inp ? parseFloat(inp.value) : NaN;
  if (!isFinite(amt) || amt <= 0) {
    if (typeof showToast === 'function') showToast('请输入兑换金额', 'warning');
    return;
  }
  if (!swapTo || swapTo.id !== 'trx' || !swapFrom || swapFrom.id !== 'usdt') {
    if (typeof showToast === 'function') showToast('「给他人」仅支持 USDT → TRX，请在兑换页保持默认币对', 'error');
    return;
  }
  var elR = document.getElementById('swapRecipientTrx');
  var recvTrx = elR ? String(elR.value || '').trim() : '';
  if (!recvTrx) {
    if (typeof showToast === 'function') showToast('请填写收款 TRON 地址', 'error');
    return;
  }
  if (!wwIsValidTronAddr(recvTrx)) {
    if (typeof showToast === 'function') showToast('TRON 地址格式无效', 'error');
    return;
  }
  try {
    var selfTrx = (typeof REAL_WALLET !== 'undefined' && REAL_WALLET && REAL_WALLET.trxAddress) ? String(REAL_WALLET.trxAddress).trim() : '';
    if (selfTrx && recvTrx === selfTrx) {
      if (typeof showToast === 'function') showToast('与当前钱包相同：请取消勾选「给他人」并使用普通兑换', 'info');
      return;
    }
  } catch (_rw) {}

  var ids = wwSunSwapTronTokenIds();
  var q =
    'inputCurrency=' + encodeURIComponent(ids.inputCurrency) +
    '&outputCurrency=' + encodeURIComponent(ids.outputCurrency) +
    '&recipient=' + encodeURIComponent(recvTrx);
  var url = 'https://sunswap.com/#/v3?' + q;
  try {
    if (typeof window !== 'undefined' && window.open) window.open(url, '_blank', 'noopener,noreferrer');
    else location.href = url;
  } catch (_o) {
    try { location.href = url; } catch (_e2) {}
  }
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(recvTrx).catch(function () {});
    }
  } catch (_c) {}
  try {
    if (typeof wwRecordSunSwapOtherPlaceholder === 'function') {
      wwRecordSunSwapOtherPlaceholder(amt, recvTrx);
    }
  } catch (_pl) {}
  if (typeof showToast === 'function') {
    showToast('已打开 SunSwap（链上兑换）。请连接 TronLink 等钱包，确认输出 TRX 的收款方为 ' + wwFmtAddrShort(recvTrx) + '；本应用不会在此模式下扣减本地余额', 'info', 5200);
  }
}

/** 应用内兑换：直接更新 COINS + 首页展示，并写入 ledger 供刷新链上时合并（不含「给他人」——该场景走 SunSwap） */
function wwExecuteInAppSwap() {
  try {
    if (typeof wwSyncCoinsBalancesFromUnifiedMerge === 'function') wwSyncCoinsBalancesFromUnifiedMerge();
    else if (typeof wwSyncCoinBalsFromHomeAssetDom === 'function') wwSyncCoinBalsFromHomeAssetDom();
  } catch (_s) {}
  var inp = _safeEl('swapAmountIn');
  var amt = inp ? parseFloat(inp.value) : NaN;
  if (!isFinite(amt) || amt <= 0) {
    if (typeof showToast === 'function') showToast('请输入有效兑换数量', 'error');
    return;
  }
  var pFrom = swapFrom.price || 1;
  var pTo = swapTo.price || 1;
  var fee = amt * 0.003;
  if (amt - fee <= 0) {
    if (typeof showToast === 'function') showToast('数量过小，扣除手续费后无效', 'error');
    return;
  }
  var _hf = typeof WW_SWAP_REF_CONSERVATIVE_FACTOR === 'number' ? WW_SWAP_REF_CONSERVATIVE_FACTOR : 0.99;
  var amtOut = (amt - fee) * pFrom / pTo * _hf;
  var fromCoin = typeof COINS !== 'undefined' && COINS.find ? COINS.find(function (c) { return c && c.id === swapFrom.id; }) : null;
  var toCoin = typeof COINS !== 'undefined' && COINS.find ? COINS.find(function (c) { return c && c.id === swapTo.id; }) : null;
  if (!fromCoin || !toCoin) {
    if (typeof showToast === 'function') showToast('币种数据异常', 'error');
    return;
  }
  var balFrom = Number(fromCoin.bal) || 0;
  if (amt > balFrom + 1e-9) {
    if (typeof showToast === 'function') showToast('❌ 余额不足', 'error');
    return;
  }

  fromCoin.bal = balFrom - amt;
  toCoin.bal = (Number(toCoin.bal) || 0) + amtOut;
  if (typeof wwApplyInappSwapToLedger === 'function') {
    wwApplyInappSwapToLedger(swapFrom.id, swapTo.id, amt, amtOut);
  }
  try {
    if (typeof wwHomePaintFromCoinsPortfolio === 'function') wwHomePaintFromCoinsPortfolio();
  } catch (_paint) {}
  /* 勿在此 await loadBalances：链上+虚拟会覆盖 COINS；用户点「刷新」再同步。兑换记录由 wwApplyInappSwapToLedger → wwRecordInappSwapTxActivity 写入本机并刷新列表 */

  if (typeof showToast === 'function') {
    var outStr = swapTo.id === 'trx' ? amtOut.toFixed(2) : (amtOut > 1 ? amtOut.toFixed(4) : amtOut.toFixed(8));
    showToast('兑换成功：-' + amt + ' ' + swapFrom.name + '，+' + outStr + ' ' + swapTo.name, 'success', 3800);
  }
}

function doSwap() {
  var oc = document.getElementById('swapConfirmOverlay');
  if (oc) oc.classList.remove('show');
  var chkOther = document.getElementById('swapToOtherChk');
  if (chkOther && chkOther.checked) {
    if (typeof wwSwapOpenSunSwapForOtherRecipient === 'function') wwSwapOpenSunSwapForOtherRecipient();
    return;
  }
  if (!window._wwPinBypassInAppSwap && typeof wwEnsurePinThenForced === 'function') {
    wwEnsurePinThenForced(function () {
      try {
        window._wwPinBypassInAppSwap = true;
        doSwap();
      } finally {
        window._wwPinBypassInAppSwap = false;
      }
    });
    return;
  }
  wwExecuteInAppSwap();
}

function openDex() {
  var closeOverlay = document.getElementById('swapConfirmOverlay');
  if (closeOverlay) closeOverlay.classList.remove('show');
  var chkOther = document.getElementById('swapToOtherChk');
  if (chkOther && chkOther.checked) {
    if (typeof wwSwapOpenSunSwapForOtherRecipient === 'function') wwSwapOpenSunSwapForOtherRecipient();
    return;
  }
  if (!window._wwPinBypassInAppSwap && typeof wwEnsurePinThenForced === 'function') {
    wwEnsurePinThenForced(function () {
      try {
        window._wwPinBypassInAppSwap = true;
        openDex();
      } finally {
        window._wwPinBypassInAppSwap = false;
      }
    });
    return;
  }
  wwExecuteInAppSwap();
}


// ── 导入钱包 ──────────────────────────────────────────────────
function initImportGrid(count) {
  count = count || 12;
  importGridWordCount = count;
  const grid = document.getElementById('importGrid');
  if(!grid) return;
  grid.innerHTML = '';
  for(let i = 0; i < count; i++) {
    const div = document.createElement('div');
    const nextFocus = Math.min(i + 1, count - 1);
    div.style.cssText = 'background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:8px;display:flex;flex-direction:column;align-items:stretch;gap:3px;min-width:0';
    div.innerHTML = `
      <span style="font-size:9px;color:var(--text-muted);text-align:center">${i+1}</span>
      <input class="import-word" id="iw_${i}" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
        style="width:100%;min-width:0;box-sizing:border-box;background:none;border:none;outline:none;font-size:12px;color:var(--text);text-align:left;font-family:inherit;overflow-x:auto;-webkit-overflow-scrolling:touch"
        oninput="updateImportWordCount()"
        onkeydown="window.wwImportGridAdvanceKeydown&&window.wwImportGridAdvanceKeydown(event,${nextFocus})">
    `;
    grid.appendChild(div);
  }
  try {
    if (typeof applyImportGridInputLangAttrs === 'function') applyImportGridInputLangAttrs();
  } catch (_ig) {}
}

function syncImportGrid(text) {
  const words = text.trim().split(/[\s,]+/).filter(w => w);
  const validLengths = [12, 15, 18, 21, 24];
  // 自动调整格子数
  const targetLen = validLengths.find(l => l >= words.length) || 12;
  initImportGrid(targetLen);
  try {
    var sel = document.getElementById('importMnemonicLength');
    if (sel && validLengths.indexOf(targetLen) >= 0) {
      sel.value = String(targetLen);
      sel.selectedIndex = validLengths.indexOf(targetLen);
    }
  } catch (_sel) {}
  for(let i = 0; i < targetLen; i++) {
    const inp = document.getElementById('iw_' + i);
    if(inp) {
      let val = String(inp.value || '').trim();
      if (val.length > 4) val = val.substring(0, 4);
      inp.value = words[i] || val;
    }
  }
  updateImportWordCount();
}

function syncImportPaste() {
  updateImportWordCount();
}

async function copyAllMnemonic(btn) {
  if (typeof showToast === 'function') showToast('为保护资产安全，已禁止复制助记词，请用纸笔抄写保存', 'warning');
}



// ── 从导入格子获取助记词 ──────────────────────────────────────────
function getMnemonicFromGrid() {
  const len = importGridWordCount || 12;
  const words = [];
  for(let i = 0; i < len; i++) {
    const inp = document.getElementById('iw_' + i);
    if(!inp || !inp.value.trim()) {
      const errEl = document.getElementById('importError');
      if(errEl) { errEl.style.display='block'; errEl.textContent=`第${i+1}个词不能为空`; }
      showToast(`❌ 第${i+1}个词不能为空`, 'error');
      return null;
    }
    words.push(inp.value.trim());
  }
  return words.join(' ');
}

/* doImportWallet：以 wallet.ui.js 为准（importWalletFlexible、PIN 引导等；勿在此重复定义以免覆盖） */

// ── 二维码生成 ──────────────────────────────────────────────────
function generateQRCode(text, canvasId) {
  const canvas = document.getElementById(canvasId || 'qrCanvas');
  if(!canvas) return;
  loadQRCodeLib().then(function(){
    if(typeof QRCode !== 'undefined' && QRCode.toCanvas) {
      QRCode.toCanvas(canvas, text || 'worldtoken', {
        width: 130,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' }
      }, function(err) {
        if(err) console.error('QR error:', err);
      });
    } else {
      const img = document.createElement('img');
      img.loading = 'lazy';
      img.decoding = 'async';
      img.alt = '';
      img.src = 'https://chart.googleapis.com/chart?chs=130x130&cht=qr&chl=' + encodeURIComponent(text) + '&choe=UTF-8';
      img.style.width = '130px';
      img.style.height = '130px';
      canvas.parentNode.replaceChild(img, canvas);
    }
  }).catch(function(e){
    console.error('QR lib:', e);
    try {
      const img = document.createElement('img');
      img.loading = 'lazy';
      img.decoding = 'async';
      img.alt = '';
      img.src = 'https://chart.googleapis.com/chart?chs=130x130&cht=qr&chl=' + encodeURIComponent(text) + '&choe=UTF-8';
      img.style.width = '130px';
      img.style.height = '130px';
      canvas.parentNode.replaceChild(img, canvas);
    } catch(e2) { console.error(e2); }
  });
}

/** 收款区「保存二维码」：导出 #qrCanvas 为 PNG；若已降级为外链 img 则尝试触发下载 */
function saveReceiveQrImage() {
  var isEn = typeof currentLang !== 'undefined' && currentLang === 'en';
  var okMsg = isEn ? 'QR code saved' : '已保存二维码图片';
  var waitMsg = isEn ? 'Wait for the QR to load, then try again' : '请稍候，待二维码加载完成后再试';
  var failMsg = isEn ? 'Could not save' : '无法保存二维码';
  try {
    var container = document.getElementById('qrCodeContainer');
    var canvas = document.getElementById('qrCanvas');
    if (!canvas && container) canvas = container.querySelector('canvas');

    function downloadUrl(href, name) {
      var a = document.createElement('a');
      a.href = href;
      a.download = name;
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    if (canvas && canvas.tagName === 'CANVAS' && canvas.width > 0) {
      try {
        var url = canvas.toDataURL('image/png');
        downloadUrl(url, 'worldwallet-receive-qr.png');
        if (typeof showToast === 'function') showToast(okMsg, 'success');
      } catch (_taint) {
        if (typeof showToast === 'function') {
          showToast(isEn ? 'Canvas is tainted; try refresh or long-press the image' : '无法导出画布（可刷新后重试或长按图片保存）', 'warning');
        }
      }
      return;
    }

    var img = container ? container.querySelector('img') : null;
    if (img && img.src) {
      downloadUrl(img.src, 'worldwallet-receive-qr.png');
      if (typeof showToast === 'function') {
        showToast(isEn ? 'Download started (if blocked, long-press the QR image)' : '已开始下载（若被拦截可长按二维码图片保存）', 'info', 3800);
      }
      return;
    }

    if (typeof showToast === 'function') showToast(waitMsg, 'warning');
  } catch (_e) {
    if (typeof showToast === 'function') showToast(failMsg, 'error');
  }
}

// 更新二维码（当地址改变时调用）
function buildReceiveQrPayload(chain, addr, amountRaw) {
  if (!addr) return '';
  return addr;
}
function updateQRCode() {
  var vwQ = typeof wwGetChainViewWallet === 'function' ? wwGetChainViewWallet() : null;
  if (!vwQ || !wwWalletHasAnyChainAddress(vwQ)) return;
  // wallet.ui.js 先加载且含完整 TRX/ETH/BTC 与金额逻辑；优先委托，避免与 ui 版本行为漂移
  if (typeof wwBuildReceiveQrPayload === 'function' && typeof wwGenerateQRCode === 'function') {
    var sel = document.getElementById('qrChainSelect');
    var qrChain = (sel && sel.value) || 'trx';
    let addr = '';
    if (qrChain === 'trx') addr = vwQ.trxAddress || '';
    else if (qrChain === 'eth') addr = vwQ.ethAddress || '';
    else if (qrChain === 'btc' || qrChain === 'native') addr = vwQ.btcAddress || vwQ.trxAddress || '';
    if (addr) {
      var payload = wwBuildReceiveQrPayload(qrChain, addr, '');
      wwGenerateQRCode(payload, 'qrCanvas');
    }
    if (typeof updateQRDisplay === 'function') updateQRDisplay();
    return;
  }
  const chain = document.getElementById('qrChainSelect')?.value || 'trx';
  let addr = '';
  if (chain === 'trx') addr = vwQ.trxAddress || '';
  else if (chain === 'eth') addr = vwQ.ethAddress || '';
  if (addr) generateQRCode(buildReceiveQrPayload(chain, addr), 'qrCanvas');
  if (typeof updateQRDisplay === 'function') updateQRDisplay();
}



function txHistoryFriendlyHtml(icon, title, hint) {
  return '<div class="tx-empty-friendly"><div class="tx-empty-icon" aria-hidden="true">' + icon + '</div><div class="tx-empty-title">' + title + '</div><div class="tx-empty-hint">' + hint + '</div></div>';
}
function txHistoryEmptyHtml() {
  const L = (typeof currentLang !== 'undefined' && currentLang) ? currentLang : 'zh';
  const M = {
    en: { title: "No transactions yet", hint: "After you send or receive once, your latest activity will appear here. On-chain confirmations usually take just a few seconds — tap Refresh above if you just sent something." },
    zh: { title: '暂无交易记录', hint: '这里会列出你最近的转账与收款。完成第一笔后，记录很快就会出现在这里。链上确认通常只要几秒——若刚发出，点上方「刷新」或稍后再看即可。' },
    'zh-TW': { title: '尚無交易紀錄', hint: '轉帳或收款後，最新活動會顯示在這裡。鏈上確認有時需要幾秒鐘，若剛送出請點上方「重新整理」或稍後再查看。' },
    ja: { title: 'まだ取引履歴がありません', hint: '送金や受取を一度行うと、直近のアクティビティがここに表示されます。オンチェーンの確定に数秒かかることがあります。送った直後は「更新」をタップしてください。' },
    ko: { title: '아직 거래 내역이 없어요', hint: '보내기·받기를 한 번 하면 최근 활동이 여기에 표시됩니다. 온체인 확인에 몇 초 걸릴 수 있어요. 방금 보냈다면 위의 새로고침을 눌러 보세요.' },
    es: { title: 'Aún no hay transacciones', hint: 'Cuando envíes o recibas, verás aquí tu actividad reciente. La confirmación en cadena puede tardar unos segundos; pulsa Actualizar arriba si acabas de enviar.' },
    fr: { title: 'Pas encore de transactions', hint: 'Après un envoi ou une réception, votre activité récente apparaîtra ici. La confirmation on-chain peut prendre quelques secondes — touchez Actualiser ci-dessus.' },
    ar: { title: 'لا توجد معاملات بعد', hint: 'بعد أول إرسال أو استلام، ستظهر أنشطتك هنا. قد تستغرق التأكيدات على السلسلة ثوانٍ — اضغط «تحديث» أعلاه إذا أرسلت للتو.' },
    hi: { title: 'अभी कोई लेनदेन नहीं', hint: 'भेजने या प्राप्त करने के बाद आपकी हाल की गतिविधि यहाँ दिखेगी। ऑन-चेन पुष्टि में कुछ सेकंड लग सकते हैं — अभी भेजा है तो ऊपर ताज़ा करें दबाएँ।' },
    pt: { title: 'Ainda não há transações', hint: 'Depois de enviar ou receber, sua atividade recente aparece aqui. A confirmação na rede pode levar alguns segundos — toque em Atualizar acima se acabou de enviar.' },
    ru: { title: 'Пока нет транзакций', hint: 'После отправки или получения здесь появится активность. Подтверждение в сети может занять несколько секунд — нажмите «Обновить» выше, если только что отправили.' },
    de: { title: 'Noch keine Transaktionen', hint: 'Nach dem ersten Senden oder Empfangen erscheint Ihre Aktivität hier. Die On-Chain-Bestätigung kann einige Sekunden dauern — tippen Sie oben auf Aktualisieren.' },
  };
  const pack = M[L] || M.zh;
  return txHistoryFriendlyHtml('📬', pack.title, pack.hint);
}

function filterTxHistoryList(txs, q) {
  if (!txs || !txs.length) return [];
  if (!q || !String(q).trim()) return txs.slice();
  var s = String(q).trim().toLowerCase();
  return txs.filter(function(tx) {
    var coin = String(tx.coin || '').toLowerCase();
    var addr = String(tx.addr || '').toLowerCase();
    var hash = String(tx.hash || '').toLowerCase();
    var typ = String(tx.type || '').toLowerCase();
    var amt = String(tx.amount || '').toLowerCase();
    return coin.indexOf(s) >= 0 || addr.indexOf(s) >= 0 || hash.indexOf(s) >= 0 || typ.indexOf(s) >= 0 || amt.indexOf(s) >= 0;
  });
}

function txHistoryRowHtml(tx) {
  const escapeHtml = function(str) {
    const div = document.createElement('div');
    div.textContent = String(str || '');
    return div.innerHTML;
  };
  var addr = String(tx.addr || '');
  var addrLine = addr.length > 8 ? (addr.slice(0, 8) + '...' + addr.slice(-6)) : addr;
  var coin = String(tx.coin || '');
  var hash = String(tx.hash || '');
  const addrEscaped = escapeHtml(addrLine);
  const amountEscaped = escapeHtml(tx.amount);
  const typeEscaped = escapeHtml(tx.type);
  const coinEscaped = escapeHtml(coin);
  const iconEscaped = escapeHtml(tx.icon);
  const timeEscaped = escapeHtml(tx.time);
  const hashAttr = escapeHtml(hash);
  const coinAttr = escapeHtml(coin);
  const addrCopyAttr =
    typeof wwEscAttr === 'function'
      ? wwEscAttr(addr)
      : String(addr || '')
          .replace(/&/g, '&amp;')
          .replace(/"/g, '&quot;')
          .replace(/</g, '&lt;');
  var col = (typeof wwTxSanitizeColor === 'function' ? wwTxSanitizeColor(tx.color) : 'inherit');
  return (
    '<div class="ww-tx-history-row" role="button" tabindex="0" data-coin="' + coinAttr + '" data-hash="' + hashAttr + '"' +
    ' style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:12px 14px;margin-bottom:8px;display:flex;align-items:center;gap:12px;cursor:pointer;transition:opacity 0.2s">' +
    '<div style="width:36px;height:36px;border-radius:50%;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">' + iconEscaped + '</div>' +
    '<div style="flex:1;min-width:0">' +
    '<div style="font-size:13px;font-weight:600;color:var(--text)">' + typeEscaped + ' ' + coinEscaped + '</div>' +
    '<div style="font-size:11px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><span data-ww-copy="' +
    addrCopyAttr +
    '" title="点击复制完整地址" style="cursor:pointer;text-decoration:underline dotted">' +
    addrEscaped +
    '</span></div>' +
    '</div>' +
    '<div style="text-align:right;flex-shrink:0">' +
    '<div style="font-size:14px;font-weight:700;color:' + col + '">' + amountEscaped + '</div>' +
    '<div style="font-size:10px;color:var(--text-muted)">' + timeEscaped + '</div>' +
    '</div>' +
    '</div>'
  );
}

function renderTxHistoryFromCache() {
  var el = document.getElementById('txHistoryList');
  if (!el) return;
  var txs = window._wwTxHistoryCache || [];
  var inp = document.getElementById('txHistoryFilter');
  var q = inp ? inp.value : '';
  var filtered = filterTxHistoryList(txs, q);
  /* 有缓存但搜索条件过窄导致 0 条：自动清空搜索，避免用户误以为「没有交易」 */
  if (txs.length > 0 && filtered.length === 0 && inp && String(q).trim()) {
    try {
      inp.value = '';
    } catch (_ic) {}
    filtered = filterTxHistoryList(txs, '');
  }
  el.innerHTML = '';
  if (txs.length === 0) {
    el.innerHTML = txHistoryEmptyHtml();
    return;
  }
  if (filtered.length === 0) {
    el.innerHTML = '<div style="text-align:center;padding:18px;color:var(--text-muted);font-size:12px;line-height:1.6">无匹配记录<br/><span style="font-size:11px;opacity:0.9">试试缩短关键词或清空搜索框</span></div>';
    return;
  }
  filtered.forEach(function(tx) {
    var html = txHistoryRowHtml(tx);
    var wrap = document.createElement('div');
    wrap.innerHTML = html;
    if (wrap.firstChild) el.appendChild(wrap.firstChild);
  });
  if (!el._wwTxHistoryDelegated && typeof wwTxHistoryRowOnClick === 'function') {
    el._wwTxHistoryDelegated = true;
    el.addEventListener('click', wwTxHistoryRowOnClick);
  }
  try { if(typeof updateReputationSettingsRow==='function') updateReputationSettingsRow(); } catch(_rep2) {}
}

function applyTxHistoryFilter() {
  renderTxHistoryFromCache();
}

function getWalletSecurityBreakdown() {
  var pinOk = false;
  try {
    pinOk = wwHasPinConfigured();
  } catch (e) {}
  var backed = false;
  try {
    if (REAL_WALLET && REAL_WALLET.backedUp) backed = true;
    else {
      var w = JSON.parse(localStorage.getItem('ww_wallet') || '{}');
      backed = !!w.backedUp;
    }
  } catch (e) {}
  var pinPts = pinOk ? 50 : 0;
  var backupPts = backed ? 50 : 0;
  return { score: pinPts + backupPts, pinOk: pinOk, backed: backed, pinPts: pinPts, backupPts: backupPts };
}

function updateWalletSecurityScoreUI() {
  var el = document.getElementById('wwSecurityScoreValue');
  var bar = document.getElementById('wwSecurityScoreBar');
  var hint = document.getElementById('wwSecurityScoreHint');
  var badge = document.getElementById('wwSecurityScoreBadge');
  if (!el || !bar || !hint) return;
  var b = getWalletSecurityBreakdown();
  el.textContent = String(b.score);
  bar.style.width = b.score + '%';
  var tips = [];
  if (!b.pinOk) tips.push('未设置 PIN：他人拿到设备时可能直接打开钱包。');
  if (!b.backed) tips.push('未确认备份助记词：设备丢失将无法恢复资产。');
  if (b.pinOk && b.backed) tips.push('PIN 与备份均已就绪；请离线保管助记词，勿截图或泄露。');
  hint.textContent = tips.length ? tips.join(' ') : '加载中…';
  if (badge) {
    if (b.score >= 100) { badge.textContent = '优秀'; badge.style.color = 'var(--green,#26a17b)'; }
    else if (b.score >= 50) { badge.textContent = '一般'; badge.style.color = 'var(--gold)'; }
    else { badge.textContent = '待加强'; badge.style.color = 'var(--red,#e74c3c)'; }
  }
}

function updateRebalanceSuggestion(parts, total) {
  var card = document.getElementById('wwRebalanceCard');
  var txt = document.getElementById('wwRebalanceText');
  if (!card || !txt) return;
  if (!total || total <= 1e-9) { card.style.display = 'none'; return; }
  var maxP = null;
  var maxPct = 0;
  parts.forEach(function(p) {
    if (p.v <= 0) return;
    var pct = 100 * p.v / total;
    if (pct > maxPct) { maxPct = pct; maxP = p; }
  });
  if (!maxP || maxPct < 72) { card.style.display = 'none'; return; }
  card.style.display = 'block';
  txt.textContent = maxP.l + ' 约占总估值 ' + maxPct.toFixed(0) + '%：单一资产占比过高时，可通过转账或兑换分散至其他币种以降低集中度。';
}

function wwNormAddr(s) {
  if (!s) return '';
  s = String(s).trim();
  if (s.startsWith('0x')) return s.toLowerCase();
  return s;
}
function wwUsdFromTxRow(tx) {
  var amtN = 0;
  try { amtN = Math.abs(parseFloat(String(tx.amount || '0').replace(/[^0-9.+-]/g, ''))); } catch (e) { amtN = 0; }
  var cg = window._wwLastCgUsd || {};
  var c = String(tx.coin || '').toUpperCase();
  if (c === 'USDT') return amtN * (parseFloat(cg.usdt) || 1);
  if (c === 'TRX') return amtN * (parseFloat(cg.trx) || 0.12);
  if (c === 'ETH') return amtN * (parseFloat(cg.eth) || 2000);
  if (c === 'BTC') return amtN * (parseFloat(cg.btc) || 60000);
  return amtN;
}
function wwCheckWhaleTxHistory(txs) {
  var cfg = {};
  try { cfg = JSON.parse(localStorage.getItem('ww_whale_v1') || '{}'); } catch (e) { cfg = {}; }
  if (!cfg || !cfg.en) return;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  var thr = parseFloat(cfg.thresholdUsd) || 10000;
  if (!(thr > 0)) return;
  var lines = String(cfg.addressesText || '').split(/\r?\n/).map(function (x) { return wwNormAddr(x); }).filter(Boolean);
  var seen = {};
  try { seen = JSON.parse(localStorage.getItem('ww_whale_seen_v1') || '{}'); } catch (e2) { seen = {}; }
  var selfTron = '';
  try { if (REAL_WALLET && REAL_WALLET.trxAddress) selfTron = wwNormAddr(REAL_WALLET.trxAddress); } catch (e3) {}
  txs.forEach(function (tx) {
    var h = tx.hash;
    if (!h || seen[h]) return;
    var usd = wwUsdFromTxRow(tx);
    if (!(usd >= thr)) return;
    var isOut = String(tx.amount || '').trim().startsWith('-');
    var peer = wwNormAddr(tx.addr);
    var hitPeer = lines.length > 0 && lines.indexOf(peer) >= 0;
    var hitSelf = !!cfg.monitorSelf && selfTron && isOut;
    if (!hitPeer && !hitSelf) return;
    seen[h] = Date.now();
    try {
      new Notification('WorldToken 巨鲸提醒', { body: (tx.coin || '') + ' ' + (tx.amount || '') + ' · 约 $' + usd.toFixed(0), tag: 'ww-whale-' + h });
    } catch (e4) {}
  });
  try { localStorage.setItem('ww_whale_seen_v1', JSON.stringify(seen)); } catch (e5) {}
}
function wwEstUsdForTransfer(amtNum) {
  var c = transferCoin || {};
  var id = c.id || 'usdt';
  var p = 1;
  try {
    var coin = typeof COINS !== 'undefined' && COINS.find ? COINS.find(function (x) { return x.id === id; }) : null;
    p = (coin && coin.price) || c.price || 1;
  } catch (e) { p = c.price || 1; }
  return Math.max(0, amtNum * (parseFloat(p) || 1));
}
async function wwSpendGateBeforeConfirm(amtNum) {
  var cfg = {};
  try { cfg = JSON.parse(localStorage.getItem('ww_spend_limit_v1') || '{}'); } catch (e) { cfg = {}; }
  if (!cfg || !cfg.en) return true;
  var d = new Date().toISOString().slice(0, 10);
  if (cfg.day !== d) { cfg.day = d; cfg.usedUsd = 0; try { localStorage.setItem('ww_spend_limit_v1', JSON.stringify(cfg)); } catch (e2) {} }
  var lim = parseFloat(cfg.dailyUsd) || 0;
  if (!(lim > 0)) return true;
  var est = wwEstUsdForTransfer(amtNum);
  var used = parseFloat(cfg.usedUsd) || 0;
  if (used + est <= lim + 1e-6) return true;
  var pin = prompt('本笔约 $' + est.toFixed(2) + '，今日已累计约 $' + used.toFixed(2) + '，已超过每日限额 $' + lim.toFixed(2) + '。输入 6 位 PIN 以本次继续');
  if (pin === null) return false;
  if (typeof verifyPin === 'function') {
    var ok = await verifyPin(pin);
    if (ok) { window.wwSessionPinBridge.set(pin); return true; }
    if (typeof showToast === 'function') showToast('PIN 不正确或未设置 PIN', 'error');
    return false;
  }
  var saved = window.wwSessionPinBridge.get();
  if (!saved || String(pin) !== saved) {
    if (typeof showToast === 'function') showToast('PIN 不正确或未设置 PIN', 'error');
    return false;
  }
  return true;
}
function wwRecordSpendAfterBroadcast(amtNum) {
  var cfg = {};
  try { cfg = JSON.parse(localStorage.getItem('ww_spend_limit_v1') || '{}'); } catch (e) { cfg = {}; }
  if (!cfg || !cfg.en) return;
  var d = new Date().toISOString().slice(0, 10);
  if (cfg.day !== d) { cfg.day = d; cfg.usedUsd = 0; }
  cfg.usedUsd = (parseFloat(cfg.usedUsd) || 0) + wwEstUsdForTransfer(amtNum);
  try { localStorage.setItem('ww_spend_limit_v1', JSON.stringify(cfg)); } catch (e2) {}
}
function wwSpendLimitPopulate() {
  var o = {};
  try { o = JSON.parse(localStorage.getItem('ww_spend_limit_v1') || '{}'); } catch (e) { o = {}; }
  var en = document.getElementById('wwSpendLimitEnable');
  if (en) en.checked = !!o.en;
  var du = document.getElementById('wwSpendLimitDailyUsd');
  if (du) du.value = o.dailyUsd && parseFloat(o.dailyUsd) > 0 ? String(o.dailyUsd) : '';
  var d = new Date().toISOString().slice(0, 10);
  if (o.day !== d) { o.usedUsd = 0; }
  var u = document.getElementById('wwSpendUsedDisplay');
  if (u) u.textContent = '$' + (parseFloat(o.usedUsd) || 0).toFixed(2);
}
function wwSpendSaveFromUI() {
  var en = !!(document.getElementById('wwSpendLimitEnable') && document.getElementById('wwSpendLimitEnable').checked);
  var daily = parseFloat((document.getElementById('wwSpendLimitDailyUsd') || {}).value || '');
  var o = {};
  try { o = JSON.parse(localStorage.getItem('ww_spend_limit_v1') || '{}'); } catch (e) { o = {}; }
  o.en = en;
  o.dailyUsd = isFinite(daily) && daily > 0 ? daily : 0;
  var d = new Date().toISOString().slice(0, 10);
  if (o.day !== d) { o.day = d; o.usedUsd = 0; }
  try { localStorage.setItem('ww_spend_limit_v1', JSON.stringify(o)); } catch (e2) {}
  if (typeof showToast === 'function') showToast('已保存支出限额', 'success');
  if (typeof updateSettingsPage === 'function') updateSettingsPage();
  wwSpendLimitPopulate();
}
function wwWhalePopulate() {
  var o = {};
  try { o = JSON.parse(localStorage.getItem('ww_whale_v1') || '{}'); } catch (e) { o = {}; }
  var en = document.getElementById('wwWhaleEnable');
  if (en) en.checked = !!o.en;
  var ms = document.getElementById('wwWhaleSelf');
  if (ms) ms.checked = !!o.monitorSelf;
  var th = document.getElementById('wwWhaleThreshold');
  if (th) th.value = o.thresholdUsd && parseFloat(o.thresholdUsd) > 0 ? String(o.thresholdUsd) : '';
  var ta = document.getElementById('wwWhaleAddresses');
  if (ta) ta.value = o.addressesText || '';
}
function wwWhaleSaveFromUI() {
  var o = {
    en: !!(document.getElementById('wwWhaleEnable') && document.getElementById('wwWhaleEnable').checked),
    monitorSelf: !!(document.getElementById('wwWhaleSelf') && document.getElementById('wwWhaleSelf').checked),
    thresholdUsd: parseFloat((document.getElementById('wwWhaleThreshold') || {}).value || '') || 0,
    addressesText: (document.getElementById('wwWhaleAddresses') || {}).value || ''
  };
  try { localStorage.setItem('ww_whale_v1', JSON.stringify(o)); } catch (e) {}
  if (typeof showToast === 'function') showToast('已保存巨鲸提醒', 'success');
  if (typeof updateSettingsPage === 'function') updateSettingsPage();
}
function wwRequestWhaleNotifyPermission() {
  try {
    if (typeof Notification === 'undefined') {
      if (typeof showToast === 'function') showToast('当前环境不支持通知', 'info');
      return;
    }
    Notification.requestPermission().then(function (p) {
      var msg = p === 'granted' ? '已授予通知权限' : ('权限：' + p);
      if (typeof showToast === 'function') showToast(msg, 'info');
    });
  } catch (e) {}
}

function wwBridgeSyncTo() {
  var f = document.getElementById('wwBridgeFrom');
  var t = document.getElementById('wwBridgeTo');
  if (!f || !t) return;
  var v = f.value === 'trx' ? 'eth' : 'trx';
  for (var i = 0; i < t.options.length; i++) {
    if (t.options[i].value === v) { t.selectedIndex = i; break; }
  }
}

function wwBridgeCopyRecvAddr() {
  var f = document.getElementById('wwBridgeFrom');
  var want = f && f.value === 'eth' ? 'eth' : 'trx';
  var addr = '';
  try {
    if (REAL_WALLET) {
      addr = want === 'eth' ? (REAL_WALLET.ethAddress || '') : (REAL_WALLET.trxAddress || '');
    }
  } catch (e) {}
  if (!addr) {
    if (typeof showToast === 'function') showToast('暂无钱包地址', 'info');
    return;
  }
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(addr).then(function () {
        if (typeof showToast === 'function') showToast('已复制 ' + want.toUpperCase() + ' 地址', 'success');
      });
    } else {
      prompt('复制地址', addr);
    }
  } catch (e2) {}
}

function wwBridgeOpenStargate() {
  try {
    if (typeof window !== 'undefined' && window.open) window.open('https://www.stargate.finance/', '_blank', 'noopener,noreferrer');
    else location.href = 'https://www.stargate.finance/';
  } catch (e) {}
  if (typeof showToast === 'function') showToast('请在桥接站点选择网络与代币，并核对合约', 'info', 3200);
}

function wwBridgeOpenTronDocs() {
  try {
    if (typeof window !== 'undefined' && window.open) window.open('https://developers.tron.network/', '_blank', 'noopener,noreferrer');
    else location.href = 'https://developers.tron.network/';
  } catch (e) {}
}

function wwVestingRender() {
  var host = document.getElementById('wwVestingTimeline');
  if (!host) return;
  var rows = null;
  try { rows = JSON.parse(localStorage.getItem('ww_vesting_demo_v1') || 'null'); } catch (e) { rows = null; }
  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    rows = [
      { t: 'T0', unlockedPct: 0 },
      { t: '第 3 月', unlockedPct: 25 },
      { t: '第 6 月', unlockedPct: 60 },
      { t: '第 12 月', unlockedPct: 100 }
    ];
  }
  host.innerHTML = rows.map(function (r) {
    var u = Math.max(0, Math.min(100, parseFloat(r.unlockedPct) || 0));
    var lk = 100 - u;
    var esc = function (s) { return String(s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
    return '<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span style="color:var(--text)">' + esc(r.t) + '</span><span style="color:var(--text-muted)">已解锁 ' + u.toFixed(0) + '% · 锁定 ' + lk.toFixed(0) + '%</span></div>' +
      '<div style="height:10px;border-radius:8px;background:var(--bg3);overflow:hidden;display:flex">' +
      '<div style="width:' + u + '%;background:linear-gradient(90deg,#26a17b,#4fd1a5)"></div>' +
      '<div style="width:' + lk + '%;background:rgba(200,168,75,0.35)"></div></div></div>';
  }).join('');
}

function wwVestingResetDemo() {
  try { localStorage.removeItem('ww_vesting_demo_v1'); } catch (e) {}
  wwVestingRender();
  if (typeof showToast === 'function') showToast('已恢复示例进度', 'info');
}

function wwDexConnectPopulate() {
  var el = document.getElementById('wwDexAddrHint');
  if (!el) return;
  try {
    if (REAL_WALLET && REAL_WALLET.ethAddress && REAL_WALLET.trxAddress) {
      el.innerHTML = '<div style="margin-bottom:6px;color:var(--text-muted)">ETH</div><div style="color:var(--text)">' + REAL_WALLET.ethAddress + '</div>' +
        '<div style="margin:10px 0 6px;color:var(--text-muted)">TRX</div><div style="color:var(--text)">' + REAL_WALLET.trxAddress + '</div>';
    } else {
      el.textContent = '请先创建或导入钱包';
    }
  } catch (e) {
    el.textContent = '—';
  }
}

function wwHardwareWalletPopulate() {
  var el = document.getElementById('wwHardwareAddrEcho');
  if (!el) return;
  try {
    if (REAL_WALLET && REAL_WALLET.ethAddress && REAL_WALLET.trxAddress) {
      el.innerHTML = '<div style="margin-bottom:6px;color:var(--text-muted)">与本钱包核对地址</div><div style="color:var(--text);font-size:12px">ETH: ' + REAL_WALLET.ethAddress + '</div><div style="color:var(--text);font-size:12px;margin-top:6px">TRX: ' + REAL_WALLET.trxAddress + '</div>';
    } else {
      el.textContent = '请先创建或导入钱包后再与硬件设备显示地址逐项核对。';
    }
  } catch (e) {
    el.textContent = '—';
  }
}

function wwOpenLedgerSupport() {
  try { if (window.open) window.open('https://support.ledger.com/', '_blank', 'noopener,noreferrer'); } catch (e) {}
  if (typeof showToast === 'function') showToast('请在官方支持页查看设备与链兼容说明', 'info', 2800);
}

function wwOpenTrezorSupport() {
  try { if (window.open) window.open('https://trezor.io/learn/', '_blank', 'noopener,noreferrer'); } catch (e) {}
}

function wwTaxReportPopulate() {
  var sum = document.getElementById('wwTaxReportSummary');
  if (!sum) return;
  var n = 0;
  try {
    if (window._wwTxHistoryCache && Array.isArray(window._wwTxHistoryCache)) n = window._wwTxHistoryCache.length;
  } catch (e) { n = 0; }
  sum.textContent = '当前可导出记录条数：' + n + '（来自首页交易历史缓存）';
}

function wwTaxExportCsv() {
  var rows = [];
  try {
    if (window._wwTxHistoryCache && Array.isArray(window._wwTxHistoryCache)) rows = window._wwTxHistoryCache.slice();
  } catch (e) { rows = []; }
  if (!rows.length) {
    if (typeof showToast === 'function') showToast('暂无缓存记录，请先在首页刷新交易历史', 'info', 3200);
    return;
  }
  var esc = function (s) {
    var t = String(s == null ? '' : s);
    if (/[",\n\r]/.test(t)) return '"' + t.replace(/"/g, '""') + '"';
    return t;
  };
  var lines = ['date,type,coin,amount,counterparty,tx_hash'];
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i] || {};
    lines.push([esc(r.time), esc(r.type), esc(r.coin), esc(r.amount), esc(r.addr), esc(r.hash)].join(','));
  }
  var blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'worldwallet-tx-tax-' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.appendChild(a);
  a.click();
  setTimeout(function () { try { URL.revokeObjectURL(a.href); document.body.removeChild(a); } catch (e2) {} }, 800);
  if (typeof showToast === 'function') showToast('已生成 CSV（请自行核对字段）', 'success', 2400);
}

function wwCopyTradingPopulate() {
  var ta = document.getElementById('wwCopyWatchInput');
  if (!ta) return;
  try {
    var raw = localStorage.getItem('ww_copy_watch_v1') || '';
    var ar = [];
    try { ar = JSON.parse(raw); } catch (e) { ar = []; }
    if (Array.isArray(ar) && ar.length) {
      ta.value = ar.map(function (x) { return (x && x.addr) ? String(x.addr) : ''; }).filter(Boolean).join('\n');
    }
  } catch (e2) {}
  wwCopyTradingRenderList();
}

function wwCopyTradingSave() {
  var ta = document.getElementById('wwCopyWatchInput');
  if (!ta) return;
  var lines = String(ta.value || '').split(/[\n,;\s]+/).map(function (s) { return s.trim(); }).filter(Boolean);
  var ar = lines.map(function (addr) { return { addr: addr }; });
  try { localStorage.setItem('ww_copy_watch_v1', JSON.stringify(ar)); } catch (e) {}
  wwCopyTradingRenderList();
  if (typeof showToast === 'function') showToast('已保存 ' + ar.length + ' 个地址（本机）', 'success', 2200);
}

function wwCopyTradingRenderList() {
  var host = document.getElementById('wwCopyWatchList');
  if (!host) return;
  var ar = [];
  try { ar = JSON.parse(localStorage.getItem('ww_copy_watch_v1') || '[]'); } catch (e) { ar = []; }
  if (!Array.isArray(ar) || !ar.length) {
    host.innerHTML = '<div style="text-align:center;padding:14px;color:var(--text-muted);font-size:12px">暂无监控地址</div>';
    return;
  }
  host.innerHTML = ar.map(function (c, i) {
    var a = (c && c.addr) ? String(c.addr) : '';
    return '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:10px 12px;margin-bottom:8px;font-size:11px;word-break:break-all;display:flex;justify-content:space-between;gap:8px;align-items:center"><span style="color:var(--text)">' + a.replace(/</g, '') + '</span><span style="color:var(--red);cursor:pointer;flex-shrink:0" onclick="if(typeof wwCopyTradingRemove===\'function\')wwCopyTradingRemove(' + i + ')">移除</span></div>';
  }).join('');
}

function wwCopyTradingRemove(idx) {
  var ar = [];
  try { ar = JSON.parse(localStorage.getItem('ww_copy_watch_v1') || '[]'); } catch (e) { ar = []; }
  if (!Array.isArray(ar) || idx < 0 || idx >= ar.length) return;
  ar.splice(idx, 1);
  try { localStorage.setItem('ww_copy_watch_v1', JSON.stringify(ar)); } catch (e2) {}
  var ta = document.getElementById('wwCopyWatchInput');
  if (ta) ta.value = ar.map(function (x) { return x.addr; }).join('\n');
  wwCopyTradingRenderList();
}

function wwPortfolioInsurancePopulate() {
  var host = document.getElementById('wwInsuranceBody');
  if (!host) return;
  var items = [
    { t: 'Nexus Mutual', d: '去中心化互助承保（需了解 NXM 与 KYC 要求）', u: 'https://www.nexusmutual.io/' },
    { t: 'InsurAce', d: '多链 DeFi 协议组合保险', u: 'https://www.insurace.io/' },
    { t: '托管方条款', d: '若资产在交易所，请查阅其用户保护与保险说明', u: 'https://www.binance.com/en/support/faq' }
  ];
  host.innerHTML = items.map(function (it) {
    return '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:12px 14px;display:flex;flex-direction:column;gap:8px">' +
      '<div style="font-weight:700;color:var(--text);font-size:14px">' + it.t + '</div>' +
      '<div style="font-size:11px;color:var(--text-muted);line-height:1.55">' + it.d + '</div>' +
      '<button type="button" class="btn-secondary" style="align-self:flex-start;padding:8px 14px;font-size:12px" onclick="try{window.open(\'' + it.u + '\',\'_blank\',\'noopener,noreferrer\');}catch(e){}">了解详情</button></div>';
  }).join('');
}

function wwYieldOptimizerPopulate() {
  var body = document.getElementById('wwYieldOptimizerBody');
  var hint = document.getElementById('wwYieldOptimizerHint');
  if (!body || !hint) return;
  var parts = [];
  var total = 0;
  try {
    if (window._wwLastPortfolioParts && window._wwLastPortfolioTotal != null) {
      parts = window._wwLastPortfolioParts;
      total = Number(window._wwLastPortfolioTotal) || 0;
    }
  } catch (e) { parts = []; total = 0; }
  if (!total || total <= 1e-9) {
    hint.textContent = '暂无持仓估值：请返回首页等待余额加载后再查看策略建议。';
    body.innerHTML = '<div style="text-align:center;padding:16px;color:var(--text-muted);font-size:12px">—</div>';
    return;
  }
  var apy = { USDT: 4.2, TRX: 4.8, ETH: 3.6, BTC: 2.9 };
  var top = null;
  var bestA = 0;
  parts.forEach(function (p) {
    var a = apy[p.l] != null ? apy[p.l] : 3.5;
    if (a > bestA && p.v > 0) { bestA = a; top = p.l; }
  });
  hint.innerHTML = '当前组合参考总市值约 <b style="color:var(--text)">$' + total.toFixed(2) + '</b>。' +
    (top ? ' 占比最高的可优化资产侧重：<b style="color:var(--gold)">' + top + '</b>（参考 APY ' + bestA.toFixed(1) + '%）。' : '');
  var strategies = [
    { n: '稳定币理财 / 货币市场', apy: '3.5–5%', fit: 'USDT', note: '适合大额 USDT，注意合约与平台信用风险' },
    { n: '原生链质押（ETH / TRX）', apy: '3–6%', fit: 'ETH,TRX', note: '流动性质押或节点委托，需解锁期与罚没规则' },
    { n: '流动性挖矿（AMM）', apy: '变动大', fit: 'USDT,ETH', note: '无常损失与智能合约风险较高' }
  ];
  body.innerHTML = strategies.map(function (s) {
    var ok = parts.some(function (p) { return p.v > 0 && s.fit.indexOf(p.l) >= 0; });
    var badge = ok ? '<span style="font-size:10px;padding:2px 8px;border-radius:999px;background:rgba(200,168,75,0.2);color:var(--gold)">与持仓相关</span>' : '';
    return '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:12px 14px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px">' +
      '<span style="font-weight:700;color:var(--text);font-size:13px">' + s.n + '</span>' + badge + '</div>' +
      '<div style="font-size:11px;color:var(--text-muted);line-height:1.55">参考 APY ' + s.apy + ' · ' + s.note + '</div></div>';
  }).join('');
}

function wwTokenUnlockCalendarPopulate() {
  var host = document.getElementById('wwUnlockCalendarBody');
  if (!host) return;
  var rows = [
    { proj: 'Arbitrum', tok: 'ARB', when: '2026-05-16', amt: '约 1.1B 代币', note: '团队与投资人解锁批次（示例）' },
    { proj: 'Optimism', tok: 'OP', when: '2026-06-30', amt: '约 3.8 亿 OP', note: '治理金库释放（示例）' },
    { proj: 'dYdX', tok: 'DYDX', when: '2026-08-01', amt: '投资人解锁', note: '请关注官方 changelog' },
    { proj: 'WorldToken 生态', tok: 'WTK', when: '2026-09-15', amt: '社区激励', note: '占位示例，非真实解锁计划' }
  ];
  host.innerHTML = rows.map(function (r) {
    return '<div style="display:flex;flex-direction:column;gap:4px;padding:12px 14px;background:var(--bg2);border:1px solid var(--border);border-radius:12px">' +
      '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap">' +
      '<span style="font-weight:700;color:var(--text)">' + r.proj + ' <span style="color:var(--gold)">' + r.tok + '</span></span>' +
      '<span style="font-size:12px;color:var(--green,#26a17b)">' + r.when + '</span></div>' +
      '<div style="font-size:11px;color:var(--text-muted)">' + r.amt + ' · ' + r.note + '</div></div>';
  }).join('');
}

function wwIdentityPopulate() {
  var o = {};
  try { o = JSON.parse(localStorage.getItem('ww_identity_v1') || '{}'); } catch (e) { o = {}; }
  var a = document.getElementById('wwIdentityEns');
  var b = document.getElementById('wwIdentityTwitter');
  var c = document.getElementById('wwIdentitySocial2');
  if (a) a.value = o.ens || '';
  if (b) b.value = o.twitter || '';
  if (c) c.value = o.social2 || '';
}

function wwIdentitySave() {
  var a = document.getElementById('wwIdentityEns');
  var b = document.getElementById('wwIdentityTwitter');
  var c = document.getElementById('wwIdentitySocial2');
  var o = {
    ens: a ? String(a.value || '').trim().slice(0, 128) : '',
    twitter: b ? String(b.value || '').trim().slice(0, 64) : '',
    social2: c ? String(c.value || '').trim().slice(0, 128) : ''
  };
  try { localStorage.setItem('ww_identity_v1', JSON.stringify(o)); } catch (e2) {}
  if (typeof showToast === 'function') showToast('链上身份已保存（本机）', 'success', 2200);
}

function wwAnalyticsPopulate() {
  var heat = document.getElementById('wwAnalyticsHeatmap');
  var topEl = document.getElementById('wwAnalyticsTopTokens');
  var sumEl = document.getElementById('wwAnalyticsSummary');
  if (!heat || !topEl || !sumEl) return;
  var txs = [];
  try { txs = window._wwTxHistoryCache || []; } catch (e) { txs = []; }
  if (!Array.isArray(txs)) txs = [];
  var days = ['一', '二', '三', '四', '五', '六', '日'];
  var n = Math.max(1, txs.length);
  heat.innerHTML = days.map(function (d, i) {
    var h = Math.min(100, 18 + (n * (i + 3)) % 72);
    return '<div style="text-align:center"><div style="height:' + h + 'px;border-radius:8px;background:linear-gradient(180deg,rgba(200,168,75,0.55),rgba(200,168,75,0.12));margin-bottom:4px"></div><div style="font-size:10px;color:var(--text-muted)">周' + d + '</div></div>';
  }).join('');
  var byCoin = {};
  txs.forEach(function (tx) {
    var k = String(tx.coin || '—');
    byCoin[k] = (byCoin[k] || 0) + 1;
  });
  var sorted = Object.keys(byCoin).sort(function (a, b) { return (byCoin[b] || 0) - (byCoin[a] || 0); });
  if (!sorted.length) {
    topEl.innerHTML = '<div style="text-align:center;padding:14px;color:var(--text-muted);font-size:12px">暂无交易缓存：请返回首页并点击「刷新」加载最近交易。</div>';
    sumEl.textContent = '';
    return;
  }
  topEl.innerHTML = sorted.slice(0, 6).map(function (k) {
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:var(--bg2);border:1px solid var(--border);border-radius:12px">' +
      '<span style="font-weight:600;color:var(--text)">' + k + '</span>' +
      '<span style="font-size:12px;color:var(--gold)">' + byCoin[k] + ' 笔</span></div>';
  }).join('');
  var inC = 0, outC = 0;
  txs.forEach(function (tx) {
    var t = String(tx.type || '');
    if (t.indexOf('入') >= 0 || t.indexOf('收') >= 0) inC++;
    else if (t.indexOf('出') >= 0 || t.indexOf('转') >= 0) outC++;
  });
  sumEl.innerHTML = '共分析 <b style="color:var(--text)">' + txs.length + '</b> 条缓存记录。方向概览：转入类约 ' + inC + ' 条，转出类约 ' + outC + ' 条（基于类型文本启发式）。';
}

function wwOpenDexUniswap() {
  try {
    if (typeof window !== 'undefined' && window.open) window.open('https://app.uniswap.org/', '_blank', 'noopener,noreferrer');
    else location.href = 'https://app.uniswap.org/';
  } catch (e) {}
  if (typeof showToast === 'function') showToast('在 Uniswap 使用 WalletConnect 连接与上述相同的地址', 'info', 3600);
}

function wwOpenDexSunswap() {
  try {
    if (typeof window !== 'undefined' && window.open) window.open('https://sunswap.com/#/home', '_blank', 'noopener,noreferrer');
    else location.href = 'https://sunswap.com/#/home';
  } catch (e) {}
  if (typeof showToast === 'function') showToast('在 SunSwap 使用 TronLink / WalletConnect', 'info', 3200);
}

function wwOpenDexOneinch() {
  try {
    if (typeof window !== 'undefined' && window.open) window.open('https://app.1inch.io/', '_blank', 'noopener,noreferrer');
    else location.href = 'https://app.1inch.io/';
  } catch (e) {}
}

function wwSocialRecoveryRender() {
  var list = document.getElementById('wwSocialContactsList');
  if (!list) return;
  var ar = [];
  try { ar = JSON.parse(localStorage.getItem('ww_social_contacts_v1') || '[]'); } catch (e) { ar = []; }
  if (!Array.isArray(ar) || ar.length === 0) {
    list.innerHTML = '<div style="text-align:center;padding:18px;color:var(--text-muted);font-size:12px">暂无联系人，点击下方添加</div>';
    return;
  }
  list.innerHTML = ar.map(function (c, i) {
    var name = (c && c.name) ? String(c.name) : '未命名';
    var note = (c && c.note) ? String(c.note) : '';
    return '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:12px 14px;display:flex;justify-content:space-between;gap:10px;align-items:flex-start">' +
      '<div><div style="font-weight:700;color:var(--text);font-size:14px">' + name.replace(/</g, '') + '</div>' +
      '<div style="font-size:11px;color:var(--text-muted);margin-top:4px;word-break:break-all">' + note.replace(/</g, '') + '</div></div>' +
      '<span style="font-size:12px;color:var(--red);cursor:pointer;flex-shrink:0" onclick="if(typeof wwSocialRemoveContact===\'function\')wwSocialRemoveContact(' + i + ')">删除</span></div>';
  }).join('');
}
function wwSocialAddContactPrompt() {
  var name = prompt('联系人称呼');
  if (name === null) return;
  var note = prompt('备注（电话 / 邮箱 / 线下约定等，仅本机）', '');
  if (note === null) return;
  var ar = [];
  try { ar = JSON.parse(localStorage.getItem('ww_social_contacts_v1') || '[]'); } catch (e) { ar = []; }
  if (!Array.isArray(ar)) ar = [];
  ar.push({ name: String(name).trim() || '未命名', note: String(note || '').trim() });
  try { localStorage.setItem('ww_social_contacts_v1', JSON.stringify(ar)); } catch (e2) {}
  wwSocialRecoveryRender();
  if (typeof updateSettingsPage === 'function') updateSettingsPage();
}
function wwSocialRemoveContact(idx) {
  var ar = [];
  try { ar = JSON.parse(localStorage.getItem('ww_social_contacts_v1') || '[]'); } catch (e) { ar = []; }
  if (!Array.isArray(ar) || idx < 0 || idx >= ar.length) return;
  ar.splice(idx, 1);
  try { localStorage.setItem('ww_social_contacts_v1', JSON.stringify(ar)); } catch (e2) {}
  wwSocialRecoveryRender();
  if (typeof updateSettingsPage === 'function') updateSettingsPage();
}
function wwSocialSaveFromUI() {
  if (typeof showToast === 'function') showToast('联系人已保存在本机', 'success');
  if (typeof updateSettingsPage === 'function') updateSettingsPage();
}

// ── 交易历史：loadTxHistory 实现在 wallet.tx.js（含 TronGrid 拉取与本机快照 wwPersistTxHistorySnap）──


// ── 礼物记录 ──────────────────────────────────────────────────
/** 礼物记录页默认展示条数，其余通过「显示更多」展开（数据仍全部保存在 ww_hongbaos） */
var WW_HB_RECORDS_PAGE_SIZE = 10;

function loadHbRecords() {
  const el = document.getElementById('hbRecordsList');
  if(!el) return;

  var allHb = {};
  try {
    allHb = JSON.parse(localStorage.getItem('ww_hongbaos') || '{}');
    if (!allHb || typeof allHb !== 'object') allHb = {};
  } catch (_parse) {
    allHb = {};
    try {
      localStorage.removeItem('ww_hongbaos');
    } catch (_r) {}
    el.innerHTML = '<div style="text-align:center;padding:32px 20px;color:var(--text-muted);font-size:13px"><div class="u10">⚠️</div>本地礼物数据已损坏，已重置。请重新创建礼物。</div>';
    return;
  }
  var myTrx =
    typeof REAL_WALLET !== 'undefined' && REAL_WALLET && REAL_WALLET.trxAddress
      ? String(REAL_WALLET.trxAddress)
      : '';
  var listSent = Object.keys(allHb)
    .map(function (k) {
      var hb = allHb[k];
      if (!hb || typeof hb !== 'object') return null;
      var o = Object.assign({}, hb);
      if (o.keyword == null) o.keyword = k;
      return o;
    })
    .filter(function (x) {
      if (!x || !(typeof x.createdAt === 'number' || typeof x.created === 'number')) return false;
      if (!myTrx) return false;
      var sender = x.creator != null ? x.creator : x.from;
      return sender === myTrx;
    })
    .sort(function (a, b) {
      return (b.createdAt || b.created || 0) - (a.createdAt || a.created || 0);
    });

  var listReceived = [];
  if (myTrx) {
    Object.keys(allHb).forEach(function (k) {
      var hb = allHb[k];
      if (!hb || typeof hb !== 'object') return;
      var keyword = hb.keyword != null ? hb.keyword : k;
      var sender = hb.creator != null ? hb.creator : hb.from;

      if (!Array.isArray(hb.claimed) && hb.amount != null) {
        if (hb.claimed === true && hb.claimedBy === myTrx) {
          if (sender && sender === myTrx) return;
          var legAmt = parseFloat(hb.amount);
          if (typeof wwRoundUsdt2 === 'function' && isFinite(legAmt)) legAmt = wwRoundUsdt2(legAmt);
          else if (isFinite(legAmt)) legAmt = Math.round(legAmt * 100) / 100;
          var legCnt = hb.count != null ? Math.max(1, parseInt(hb.count, 10) || 1) : 1;
          listReceived.push({
            keyword: keyword,
            amount: legAmt,
            time: hb.claimedAt || hb.createdAt || hb.created || 0,
            sender: sender ? String(sender) : '',
            giftType: hb.type === 'lucky' ? 'lucky' : 'normal',
            expireAt: hb.expireAt != null ? Number(hb.expireAt) : null,
            giftCount: legCnt
          });
        }
        return;
      }

      if (Array.isArray(hb.claimed)) {
        hb.claimed.forEach(function (cl) {
          if (!cl || String(cl.addr) !== myTrx) return;
          if (sender && sender === myTrx) return;
          var a = parseFloat(cl.amount);
          if (typeof wwRoundUsdt2 === 'function' && isFinite(a)) a = wwRoundUsdt2(a);
          else if (isFinite(a)) a = Math.round(a * 100) / 100;
          var shareCnt = hb.count != null ? Math.max(1, parseInt(hb.count, 10) || 1) : 1;
          listReceived.push({
            keyword: keyword,
            amount: a,
            time: cl.time || 0,
            sender: sender ? String(sender) : '',
            giftType: hb.type === 'lucky' ? 'lucky' : 'normal',
            expireAt: hb.expireAt != null ? Number(hb.expireAt) : null,
            giftCount: shareCnt
          });
        });
      }
    });
    listReceived.sort(function (a, b) {
      return (b.time || 0) - (a.time || 0);
    });
  }

  if (!myTrx) {
    el.innerHTML =
      '<div style="text-align:center;padding:40px;color:var(--text-muted);font-size:13px"><div class="u10">🎁</div>请先创建或导入钱包</div>';
    return;
  }

  if (listSent.length === 0 && listReceived.length === 0) {
    el.innerHTML =
      '<div style="text-align:center;padding:40px;color:var(--text-muted);font-size:13px"><div class="u10">🎁</div>暂无礼物记录</div>';
    return;
  }

  const now = Date.now();
  function hbEsc(s) {
    var d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }
  function hbRecordCardHtml(hb, idx) {
    const claimed = Array.isArray(hb.claimed)
      ? hb.claimed.length
      : hb.claimed === true
        ? 1
        : 0;
    const total = hb.count != null ? hb.count : 1;
    const pct = total > 0 ? Math.round((claimed / total) * 100) : 0;
    const expired = hb.expireAt != null && now > hb.expireAt;
    const fullyClaimed = claimed >= total;
    const timeAgo = formatTimeAgo(hb.createdAt || hb.created || now);
    const statusText = fullyClaimed ? '🏆 已领完' : expired ? '⏰ 已过期' : `${claimed}/${total} 已领取`;
    const statusColor = fullyClaimed ? 'var(--gold)' : expired ? 'var(--text-muted)' : 'var(--green,#26a17b)';
    const opacity = (expired || fullyClaimed) ? '0.7' : '1';
    const typeLabel = hb.type === 'lucky' ? '随机礼物' : '普通礼物';
    var rawTot = hb.totalAmount != null ? hb.totalAmount : hb.amount;
    var totNum = parseFloat(rawTot);
    if (typeof wwRoundUsdt2 === 'function' && isFinite(totNum)) totNum = wwRoundUsdt2(totNum);
    else if (isFinite(totNum)) totNum = Math.round(totNum * 100) / 100;
    const totalLine = isFinite(totNum) ? totNum.toFixed(2) : '—';
    var subLeft = typeLabel + ' · ' + timeAgo + (expired ? ' · 已过期' : '');
    if (hb.type !== 'lucky' && hb.count != null && hb.count > 0 && isFinite(totNum)) {
      subLeft += ' · 共 ' + hb.count + ' 份';
    }

    return `
      <div class="hb-sent-card" data-hb-sent-idx="${idx}" role="button" tabindex="0" aria-label="查看领取详情" style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:14px 16px;margin-bottom:10px;opacity:${opacity};cursor:pointer;-webkit-tap-highlight-color:transparent">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:${fullyClaimed||expired?'0':'10px'}">
          <span style="font-size:28px">🎁</span>
          <div class="u4">
            <div style="font-size:14px;font-weight:600;color:var(--text)">${hbEsc(hb.keyword)}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${subLeft}</div>
          </div>
          <div class="u6">
            <div style="font-size:14px;font-weight:600;color:var(--gold)">${totalLine} USDT</div>
            <div style="font-size:11px;color:${statusColor}">${statusText}</div>
          </div>
        </div>
        ${!fullyClaimed && !expired ? `
        <div style="background:var(--bg3);border-radius:6px;height:4px;overflow:hidden">
          <div style="background:linear-gradient(90deg,#c8a84b,#f0d070);height:100%;width:${pct}%;border-radius:6px;transition:width 0.5s"></div>
        </div>` : ''}
        <div style="font-size:11px;color:var(--text-muted);margin-top:8px;text-align:right">查看领取详情 ›</div>
      </div>
    `;
  }

  function hbReceivedCardHtml(rec) {
    var amtStr = isFinite(rec.amount) ? Number(rec.amount).toFixed(2) : '—';
    var ta = formatTimeAgo(rec.time || Date.now());
    var typeLabel = rec.giftType === 'lucky' ? '随机礼物' : '普通礼物';
    var gc = rec.giftCount != null ? Number(rec.giftCount) : 1;
    if (!isFinite(gc) || gc < 1) gc = 1;
    var countPart = ' · 共 ' + Math.floor(gc) + ' 份';
    var expHtml = '';
    if (rec.expireAt != null && isFinite(rec.expireAt)) {
      if (now > rec.expireAt) {
        expHtml = ' · <span style="color:var(--text-muted)">已过期</span>';
      } else {
        expHtml = ' · <span style="color:var(--green,#26a17b)">有效期内</span>';
      }
    }
    var fromLine = '';
    if (rec.sender) {
      var s = String(rec.sender);
      var shortS = s.length > 14 ? s.slice(0, 6) + '...' + s.slice(-4) : s;
      fromLine = ' · 来自 ' + hbEsc(shortS);
    }
    var subLine =
      typeLabel +
      ' · 领取 · ' +
      ta +
      countPart +
      expHtml +
      fromLine;
    return (
      '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:14px 16px;margin-bottom:10px">' +
      '<div style="display:flex;align-items:center;gap:12px">' +
      '<span style="font-size:28px">💰</span>' +
      '<div class="u4">' +
      '<div style="font-size:14px;font-weight:600;color:var(--text)">' +
      hbEsc(rec.keyword) +
      '</div>' +
      '<div style="font-size:11px;color:var(--text-muted);margin-top:2px;line-height:1.45">' +
      subLine +
      '</div>' +
      '</div>' +
      '<div class="u6">' +
      '<div style="font-size:14px;font-weight:600;color:var(--gold)">+' +
      amtStr +
      ' USDT</div>' +
      '<div style="font-size:11px;color:var(--green,#26a17b)">已入账</div>' +
      '</div></div></div>'
    );
  }

  function hbBuildColumn(cards, restDomId) {
    var limit = typeof WW_HB_RECORDS_PAGE_SIZE === 'number' && WW_HB_RECORDS_PAGE_SIZE > 0 ? WW_HB_RECORDS_PAGE_SIZE : 10;
    if (!cards.length) {
      return '<div style="text-align:center;padding:20px 8px;color:var(--text-muted);font-size:12px">暂无记录</div>';
    }
    var firstHtml = cards.slice(0, limit).join('');
    var restHtml = cards.slice(limit).join('');
    if (!restHtml) return firstHtml;
    var restCount = cards.length - limit;
    return (
      firstHtml +
      '<button type="button" class="btn-secondary hb-rec-more" style="width:100%;margin-top:6px;padding:10px;font-size:13px;border-radius:12px;cursor:pointer;border:1px solid rgba(200,168,75,0.35);background:var(--bg3);color:var(--gold)" data-ww-hb-rest="' +
      hbEsc(restDomId) +
      '">显示更多（还有 ' +
      restCount +
      ' 条）</button>' +
      '<div id="' +
      restDomId +
      '" style="display:none;margin-top:8px">' +
      restHtml +
      '</div>'
    );
  }

  window._wwHbSentListCache = listSent;
  var cardsSent = listSent.map(function (hb, i) {
    return hbRecordCardHtml(hb, i);
  });
  var cardsRecv = listReceived.map(hbReceivedCardHtml);
  var htmlSent = hbBuildColumn(cardsSent, 'hbRecordsSentRest');
  var htmlRecv = hbBuildColumn(cardsRecv, 'hbRecordsRecvRest');

  var styleHbTabActive =
    'flex:1;padding:10px 12px;border-radius:12px;border:1px solid rgba(200,168,75,0.5);background:linear-gradient(135deg,#b8982a,#e8c850);color:#0a0a05;font-size:13px;font-weight:700;cursor:pointer;box-sizing:border-box';
  var styleHbTabIdle =
    'flex:1;padding:10px 12px;border-radius:12px;border:1px solid var(--border);background:var(--bg3);color:var(--text-muted);font-size:13px;font-weight:600;cursor:pointer;box-sizing:border-box';
  var defaultShowSent = !(listSent.length === 0 && listReceived.length > 0);

  el.innerHTML =
    '<div style="display:flex;gap:8px;margin:0 0 12px;align-items:stretch">' +
    '<button type="button" id="hbTabSent" style="' +
    (defaultShowSent ? styleHbTabActive : styleHbTabIdle) +
    '">我发出的</button>' +
    '<button type="button" id="hbTabRecv" style="' +
    (defaultShowSent ? styleHbTabIdle : styleHbTabActive) +
    '">我领取的</button>' +
    '</div>' +
    '<div id="hbPanelSent" style="display:' +
    (defaultShowSent ? 'block' : 'none') +
    '">' +
    htmlSent +
    '</div>' +
    '<div id="hbPanelRecv" style="display:' +
    (defaultShowSent ? 'none' : 'block') +
    '">' +
    htmlRecv +
    '</div>' +
    '<div style="text-align:center;font-size:12px;color:var(--text-muted);margin-top:14px;padding-bottom:20px">· 发出 ' +
    listSent.length +
    ' 条 · 领取 ' +
    listReceived.length +
    ' 条 ·</div>';

  try {
    function syncHbRecordsTab(which) {
      var ps = document.getElementById('hbPanelSent');
      var pr = document.getElementById('hbPanelRecv');
      var bs = document.getElementById('hbTabSent');
      var br = document.getElementById('hbTabRecv');
      if (!ps || !pr || !bs || !br) return;
      var showSent = which === 'sent';
      ps.style.display = showSent ? 'block' : 'none';
      pr.style.display = showSent ? 'none' : 'block';
      bs.setAttribute('style', showSent ? styleHbTabActive : styleHbTabIdle);
      br.setAttribute('style', showSent ? styleHbTabIdle : styleHbTabActive);
    }
    var _ts = document.getElementById('hbTabSent');
    var _tr = document.getElementById('hbTabRecv');
    if (_ts) _ts.addEventListener('click', function () { syncHbRecordsTab('sent'); });
    if (_tr) _tr.addEventListener('click', function () { syncHbRecordsTab('recv'); });

    if (typeof el._wwHbSentCardNav === 'function') {
      el.removeEventListener('click', el._wwHbSentCardNav);
    }
    el._wwHbSentCardNav = function (ev) {
      if (ev.target.closest && ev.target.closest('[data-ww-copy]')) return;
      var card = ev.target.closest && ev.target.closest('.hb-sent-card');
      if (!card) return;
      var idx = parseInt(card.getAttribute('data-hb-sent-idx'), 10);
      if (!isFinite(idx) || !window._wwHbSentListCache || !window._wwHbSentListCache[idx]) return;
      if (typeof wwOpenHbSentDetail === 'function') wwOpenHbSentDetail(window._wwHbSentListCache[idx]);
    };
    el.addEventListener('click', el._wwHbSentCardNav);

    el.querySelectorAll('.hb-rec-more').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-ww-hb-rest');
        if (!id) return;
        var box = document.getElementById(id);
        if (box) box.style.display = 'block';
        btn.style.display = 'none';
      });
    });
  } catch (_eHbMore) {}
}

function formatTimeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if(d > 0) return d + '天前';
  if(h > 0) return h + '小时前';
  if(m > 0) return m + '分钟前';
  return '刚刚';
}

function closeHbSentDetail() {
  var ov = document.getElementById('hbSentDetailOverlay');
  if (ov) ov.classList.remove('show');
}

function wwFormatHbDetailTime(ts) {
  if (ts == null || ts === '') return '—';
  var n = Number(ts);
  if (!isFinite(n)) return '—';
  try {
    return new Date(n).toLocaleString('zh-CN', { hour12: false });
  } catch (_e) {
    return '—';
  }
}

/** 我发出的礼物：弹层展示完整领取明细（地址可点复制） */
function wwOpenHbSentDetail(hbIn) {
  if (!hbIn) return;
  var kw = hbIn.keyword != null ? String(hbIn.keyword) : '';
  var hb = Object.assign({}, hbIn);
  try {
    var all = JSON.parse(localStorage.getItem('ww_hongbaos') || '{}');
    if (kw && all[kw]) hb = Object.assign({}, all[kw]);
    if (hb.keyword == null && kw) hb.keyword = kw;
  } catch (_e0) {}

  var esc = function (s) {
    var d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  };
  var attr = function (s) {
    return typeof wwEscAttr === 'function'
      ? wwEscAttr(s)
      : String(s == null ? '' : s)
          .replace(/&/g, '&amp;')
          .replace(/"/g, '&quot;')
          .replace(/</g, '&lt;');
  };

  var typeLabel = hb.type === 'lucky' ? '随机礼物' : '普通礼物';
  var rawTot = hb.totalAmount != null ? hb.totalAmount : hb.amount;
  var totNum = parseFloat(rawTot);
  if (typeof wwRoundUsdt2 === 'function' && isFinite(totNum)) totNum = wwRoundUsdt2(totNum);
  else if (isFinite(totNum)) totNum = Math.round(totNum * 100) / 100;
  var totalLine = isFinite(totNum) ? totNum.toFixed(2) : '—';
  var countN = hb.count != null ? Math.max(1, parseInt(hb.count, 10) || 1) : 1;
  var claimedN = Array.isArray(hb.claimed)
    ? hb.claimed.length
    : hb.claimed === true
      ? 1
      : 0;
  var totalSlots = hb.count != null ? hb.count : 1;

  var perPersonLine = '';
  if (hb.type !== 'lucky' && hb.perPerson != null) {
    perPersonLine =
      '<div style="font-size:12px;color:var(--text-muted);margin-top:8px">每人约 <span style="color:var(--gold)">' +
      esc(String(hb.perPerson)) +
      '</span> USDT</div>';
  }

  var claimsHtml = '';
  if (Array.isArray(hb.claimed) && hb.claimed.length > 0) {
    claimsHtml =
      '<div style="font-size:13px;font-weight:700;color:var(--gold);margin:16px 0 10px">领取记录（' +
      hb.claimed.length +
      ' 笔）</div><div style="border-radius:12px;border:1px solid var(--border);overflow:hidden">';
    hb.claimed.forEach(function (cl, i) {
      var addr = String(cl && cl.addr != null ? cl.addr : '');
      var amt = parseFloat(cl && cl.amount);
      var tline = '—';
      if (cl && cl.time) {
        tline = typeof formatTimeAgo === 'function' ? formatTimeAgo(cl.time) : wwFormatHbDetailTime(cl.time);
      }
      var isLast = i === hb.claimed.length - 1;
      claimsHtml +=
        '<div style="padding:12px;border-bottom:' +
        (isLast ? 'none' : '1px solid var(--border)') +
        ';background:var(--bg2)">' +
        '<div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">第 ' +
        (i + 1) +
        ' 笔 · ' +
        esc(tline) +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">' +
        '<span data-ww-copy="' +
        attr(addr) +
        '" title="点击复制地址" style="font-size:12px;word-break:break-all;cursor:pointer;color:var(--text);line-height:1.45">' +
        esc(addr) +
        '</span>' +
        '<span style="color:var(--gold);flex-shrink:0;font-weight:600">+' +
        (isFinite(amt) ? amt.toFixed(2) : '—') +
        ' USDT</span></div></div>';
    });
    claimsHtml += '</div>';
  } else if (hb.claimed === true) {
    var by = String(hb.claimedBy || '');
    claimsHtml =
      '<div style="font-size:13px;font-weight:700;color:var(--gold);margin:16px 0 10px">领取记录</div>' +
      '<div style="padding:12px;border-radius:12px;border:1px solid var(--border);background:var(--bg2)">' +
      '<div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">领取方</div>' +
      '<span data-ww-copy="' +
      attr(by) +
      '" style="font-size:13px;word-break:break-all;cursor:pointer;color:var(--text)">' +
      esc(by) +
      '</span></div>';
  } else {
    claimsHtml =
      '<div style="text-align:center;padding:20px 12px;color:var(--text-muted);font-size:13px;margin-top:14px;border-radius:12px;border:1px dashed var(--border)">尚未有人领取</div>';
  }

  var blessing = hb.blessing || hb.message;
  var blessingBlock = '';
  if (blessing && String(blessing).trim()) {
    blessingBlock =
      '<div style="margin-top:12px;padding:10px 12px;border-radius:12px;background:var(--bg3);font-size:13px;color:var(--text-muted);line-height:1.5">留言：' +
      esc(String(blessing).trim()) +
      '</div>';
  }

  var expireLine = '';
  if (hb.expireAt != null && isFinite(Number(hb.expireAt))) {
    expireLine =
      '<div style="display:flex;justify-content:space-between;margin-top:8px;font-size:12px"><span style="color:var(--text-muted)">过期时间</span><span style="color:var(--text)">' +
      wwFormatHbDetailTime(hb.expireAt) +
      '</span></div>';
  }

  var inner =
    '<div style="padding:2px 4px 0">' +
    '<div style="font-size:17px;font-weight:700;color:var(--text);margin-bottom:14px;text-align:center">领取详情</div>' +
    '<div style="padding:12px;border-radius:14px;border:1px solid var(--border);background:var(--bg2)">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><span style="color:var(--text-muted);font-size:12px">口令</span><span style="font-size:15px;font-weight:700;color:var(--gold);letter-spacing:2px">' +
    esc(hb.keyword || '') +
    '</span></div>' +
    '<div style="display:flex;justify-content:space-between;font-size:12px;margin-top:10px"><span style="color:var(--text-muted)">类型</span><span>' +
    esc(typeLabel) +
    '</span></div>' +
    '<div style="display:flex;justify-content:space-between;margin-top:8px;font-size:12px"><span style="color:var(--text-muted)">总金额</span><span style="color:var(--gold);font-weight:600">' +
    totalLine +
    ' USDT</span></div>' +
    '<div style="display:flex;justify-content:space-between;margin-top:8px;font-size:12px"><span style="color:var(--text-muted)">进度</span><span>共 ' +
    countN +
    ' 份 · ' +
    claimedN +
    '/' +
    totalSlots +
    ' 已领取</span></div>' +
    perPersonLine +
    '<div style="display:flex;justify-content:space-between;margin-top:8px;font-size:12px"><span style="color:var(--text-muted)">创建时间</span><span>' +
    wwFormatHbDetailTime(hb.createdAt || hb.created) +
    '</span></div>' +
    expireLine +
    '</div>' +
    blessingBlock +
    claimsHtml +
    '</div>';

  var bodyEl = document.getElementById('hbSentDetailBody');
  var ov = document.getElementById('hbSentDetailOverlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'hbSentDetailOverlay';
    ov.className = 'overlay';
    ov.style.zIndex = '120';
    ov.innerHTML =
      '<div class="overlay-sheet" style="max-width:380px;width:92%;max-height:86vh;overflow-y:auto;padding:16px 16px 8px;box-sizing:border-box;margin:12px auto" onclick="event.stopPropagation()">' +
      '<div id="hbSentDetailBody"></div>' +
      '<button type="button" class="btn-secondary" id="hbSentDetailCloseBtn" style="width:100%;margin-top:14px;padding:12px;border-radius:12px">关闭</button>' +
      '</div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', function (e) {
      if (e.target === ov) closeHbSentDetail();
    });
    var cbtn = document.getElementById('hbSentDetailCloseBtn');
    if (cbtn) cbtn.addEventListener('click', closeHbSentDetail);
  }
  bodyEl = document.getElementById('hbSentDetailBody');
  if (bodyEl) bodyEl.innerHTML = inner;
  ov = document.getElementById('hbSentDetailOverlay');
  if (ov) ov.classList.add('show');
}

try {
  window.closeHbSentDetail = closeHbSentDetail;
  window.wwOpenHbSentDetail = wwOpenHbSentDetail;
} catch (_hbDet) {}

/* _origGetEl / document.getElementById 补丁与 showToast 首版在 wallet.ui.js */

// ── Toast（runtime 可覆盖 ui 以统一行为）──────────────────────────────
function showToast(msg, type='info', duration=2500) {
  let t = document.getElementById('wt-toast');
  if(!t) {
    t = document.createElement('div');
    t.id = 'wt-toast';
    t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(20,20,40,0.95);color:#e0e0f0;padding:10px 20px;border-radius:12px;font-size:13px;z-index:9999;pointer-events:none;transition:opacity 0.3s;white-space:nowrap;max-width:80vw;text-align:center;border:1px solid rgba(200,168,75,0.3);box-shadow:0 4px 20px rgba(0,0,0,0.5)';
    document.body.appendChild(t);
  }
  const colors = {info:'#e0e0f0', success:'#4ac84a', error:'#ff6060', warning:'#ffcc44'};
  t.style.color = colors[type] || colors.info;
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.opacity = '0'; }, duration);
}

// ── 余额查询 ──────────────────────────────────────────────────
/* priceCache / priceCacheTime 由 wallet.ui.js 声明为 var */

var WW_PRICE_PERSIST_KEY = 'ww_price_cache_v1';
async function getPrices() {
  if (priceCache && Date.now() - priceCacheTime < 5 * 60 * 1000) return priceCache;

  function mapCg(data) {
    return {
      usdt: data.tether?.usd || 1,
      trx: data.tron?.usd || 0.12,
      eth: data.ethereum?.usd || 3200,
      btc: data.bitcoin?.usd || 60000,
      bnb: data.binancecoin?.usd || 400
    };
  }
  function persist(p) {
    try {
      localStorage.setItem(WW_PRICE_PERSIST_KEY, JSON.stringify({ t: Date.now(), prices: p }));
    } catch (_e) {}
  }
  function readPersisted() {
    try {
      var raw = localStorage.getItem(WW_PRICE_PERSIST_KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || !o.prices) return null;
      if (!o.t || Date.now() - o.t > 48 * 60 * 60 * 1000) return null;
      return o.prices;
    } catch (_e) {
      return null;
    }
  }
  async function fetchCoinGecko() {
    var url = 'https://api.coingecko.com/api/v3/simple/price?ids=tether,tron,ethereum,bitcoin,binancecoin&vs_currencies=usd';
    var res =
      typeof wwFetchCoinGecko === 'function'
        ? await wwFetchCoinGecko(url)
        : typeof wwFetch429Retry === 'function'
          ? await wwFetch429Retry(url, { method: 'GET' })
          : await fetch(url);
    if (!res.ok) throw new Error('coingecko ' + res.status);
    var data = await res.json();
    if (data && data.status && data.status.error_code) throw new Error('coingecko api error');
    return mapCg(data);
  }
  /** CryptoCompare 公网备用（减轻 CoinGecko 限流时资产/兑换页「数据加载失败」） */
  async function fetchCryptoCompare() {
    var url = 'https://min-api.cryptocompare.com/data/pricemulti?fsyms=USDT,TRX,ETH,BTC,BNB&tsyms=USD';
    var res = await fetch(url);
    if (!res.ok) throw new Error('cryptocompare ' + res.status);
    var d = await res.json();
    return {
      usdt: d.USDT && d.USDT.USD != null ? Number(d.USDT.USD) : 1,
      trx: d.TRX && d.TRX.USD != null ? Number(d.TRX.USD) : 0.12,
      eth: d.ETH && d.ETH.USD != null ? Number(d.ETH.USD) : 3200,
      btc: d.BTC && d.BTC.USD != null ? Number(d.BTC.USD) : 60000,
      bnb: d.BNB && d.BNB.USD != null ? Number(d.BNB.USD) : 400
    };
  }

  try {
    priceCache = await fetchCoinGecko();
    priceCacheTime = Date.now();
    persist(priceCache);
    return priceCache;
  } catch (_cg) {
    try {
      priceCache = await fetchCryptoCompare();
      priceCacheTime = Date.now();
      persist(priceCache);
      return priceCache;
    } catch (_cc) {
      var stale = readPersisted();
      if (stale) {
        priceCache = stale;
        priceCacheTime = Date.now() - 4 * 60 * 1000;
        return priceCache;
      }
      priceCache = { usdt: 1, trx: 0.12, eth: 3200, btc: 60000, bnb: 400 };
      priceCacheTime = Date.now();
      return priceCache;
    }
  }
}

var WW_HOME_BALANCE_SNAP_KEY = 'ww_home_balance_snap_v1';
/** 应用内兑换相对链上余额的累计调整（同钱包持久化；刷新余额后仍叠加） */
var WW_INAPP_SWAP_LEDGER_KEY = 'ww_inapp_swap_ledger_v1';

/** 按 TRX 主地址分文件存 ledger，避免 wid 字符串不一致导致合并失败 */
function wwInappLedgerStorageKey() {
  try {
    if (typeof REAL_WALLET !== 'undefined' && REAL_WALLET && REAL_WALLET.trxAddress) {
      return WW_INAPP_SWAP_LEDGER_KEY + '_trx_' + String(REAL_WALLET.trxAddress);
    }
    if (REAL_WALLET && REAL_WALLET.ethAddress) {
      return WW_INAPP_SWAP_LEDGER_KEY + '_eth_' + String(REAL_WALLET.ethAddress);
    }
  } catch (_e) {}
  return WW_INAPP_SWAP_LEDGER_KEY;
}

function wwReadInappSwapLedger() {
  try {
    var key = typeof wwInappLedgerStorageKey === 'function' ? wwInappLedgerStorageKey() : WW_INAPP_SWAP_LEDGER_KEY;
    var raw = localStorage.getItem(key);
    if (!raw) raw = localStorage.getItem(WW_INAPP_SWAP_LEDGER_KEY);
    if (!raw) return { dusdt: 0, dtrx: 0, deth: 0, dbtc: 0 };
    var o = JSON.parse(raw);
    if (!o) return { dusdt: 0, dtrx: 0, deth: 0, dbtc: 0 };
    if (raw === localStorage.getItem(WW_INAPP_SWAP_LEDGER_KEY) && typeof wwWalletSnapIdForCache === 'function' && o.wid != null && o.wid !== wwWalletSnapIdForCache()) {
      return { dusdt: 0, dtrx: 0, deth: 0, dbtc: 0 };
    }
    return {
      dusdt: Number(o.dusdt) || 0,
      dtrx: Number(o.dtrx) || 0,
      deth: Number(o.deth) || 0,
      dbtc: Number(o.dbtc) || 0
    };
  } catch (_e) {
    return { dusdt: 0, dtrx: 0, deth: 0, dbtc: 0 };
  }
}

function wwPersistInappSwapLedger(L) {
  try {
    var key = typeof wwInappLedgerStorageKey === 'function' ? wwInappLedgerStorageKey() : WW_INAPP_SWAP_LEDGER_KEY;
    var wid = typeof wwWalletSnapIdForCache === 'function' ? wwWalletSnapIdForCache() : '';
    localStorage.setItem(key, JSON.stringify({
      wid: wid,
      dusdt: L.dusdt,
      dtrx: L.dtrx,
      deth: L.deth,
      dbtc: L.dbtc,
      t: Date.now()
    }));
  } catch (_e) {}
}

function wwMergeChainWithInappLedger(usdtBal, trxBal, ethBal, btcBal) {
  var L = wwReadInappSwapLedger();
  return {
    usdt: (Number(usdtBal) || 0) + L.dusdt,
    trx: (Number(trxBal) || 0) + L.dtrx,
    eth: (Number(ethBal) || 0) + L.deth,
    btc: (Number(btcBal) || 0) + L.dbtc
  };
}

/** USDT 两位小数（礼物金额） */
function wwRoundUsdt2(n) {
  var x = Number(n);
  if (!isFinite(x)) return 0;
  return Math.round(x * 100) / 100;
}

/**
 * 从首页 DOM → 持久化快照 → COINS 取得「展示余额」，反推链上基准（展示 − ledger），与 loadBalances 合并逻辑一致。
 */
function wwEnsureBalanceBaseFromDomOrSnap() {
  try {
    var L = wwReadInappSwapLedger();
    function displayNum(domId, snapKey, coinId) {
      var el = document.getElementById(domId);
      if (el) {
        var tx = String(el.textContent || '').trim();
        if (tx && tx !== '...' && tx !== '…') {
          var n =
            typeof wwParseNumericBalanceText === 'function'
              ? wwParseNumericBalanceText(tx)
              : parseFloat(String(tx).replace(/,/g, ''));
          if (isFinite(n)) return n;
        }
      }
      var snap = typeof wwReadHomeBalanceSnap === 'function' ? wwReadHomeBalanceSnap() : null;
      if (snap && snap[snapKey] != null) {
        var ps = typeof wwParseNumericBalanceText === 'function' ? wwParseNumericBalanceText(snap[snapKey]) : NaN;
        if (isFinite(ps)) return ps;
      }
      if (typeof COINS !== 'undefined' && COINS.find) {
        var c = COINS.find(function (x) {
          return x && x.id === coinId;
        });
        if (c && isFinite(Number(c.bal))) return Number(c.bal);
      }
      return 0;
    }
    var u = displayNum('balUsdt', 'balUsdt', 'usdt');
    var t = displayNum('balTrx', 'balTrx', 'trx');
    var e = displayNum('balEth', 'balEth', 'eth');
    var b = displayNum('balBtc', 'balBtc', 'btc');
    window._wwLastBalanceBaseForInApp = {
      usdt: u - (Number(L.dusdt) || 0),
      trx: t - (Number(L.dtrx) || 0),
      eth: e - (Number(L.deth) || 0),
      btc: b - (Number(L.dbtc) || 0)
    };
    return true;
  } catch (_e) {
    return false;
  }
}

/** 全站统一的「可花 USDT」展示值（链上基准 + 应用内 ledger，与首页一致） */
function wwGetUnifiedUsdtAvailable() {
  try {
    wwEnsureBalanceBaseFromDomOrSnap();
    var base = window._wwLastBalanceBaseForInApp;
    if (base && typeof wwMergeChainWithInappLedger === 'function') {
      var mg = wwMergeChainWithInappLedger(
        Number(base.usdt) || 0,
        Number(base.trx) || 0,
        Number(base.eth) || 0,
        Number(base.btc) || 0
      );
      return wwRoundUsdt2(mg.usdt);
    }
  } catch (_e) {}
  try {
    if (typeof wwSyncCoinBalsFromHomeAssetDom === 'function') wwSyncCoinBalsFromHomeAssetDom();
  } catch (_s) {}
  var n = typeof wwGetAssetPageUsdtBalanceNumber === 'function' ? wwGetAssetPageUsdtBalanceNumber() : NaN;
  if (isFinite(n)) return wwRoundUsdt2(n);
  var u = typeof COINS !== 'undefined' && COINS.find ? COINS.find(function (c) { return c && c.id === 'usdt'; }) : null;
  return u ? wwRoundUsdt2(Number(u.bal) || 0) : 0;
}

/** 将 COINS 各币种 bal 同步为「基准+ledger」合并值（兑换/转账前调用，避免 COINS 未随首页刷新） */
function wwSyncCoinsBalancesFromUnifiedMerge() {
  try {
    wwEnsureBalanceBaseFromDomOrSnap();
    var base = window._wwLastBalanceBaseForInApp;
    if (!base || typeof wwMergeChainWithInappLedger !== 'function') return false;
    var mg = wwMergeChainWithInappLedger(
      Number(base.usdt) || 0,
      Number(base.trx) || 0,
      Number(base.eth) || 0,
      Number(base.btc) || 0
    );
    if (typeof COINS === 'undefined' || !COINS.forEach) return false;
    COINS.forEach(function (coin) {
      if (!coin || !coin.id) return;
      if (coin.id === 'usdt') coin.bal = mg.usdt;
      else if (coin.id === 'trx') coin.bal = mg.trx;
      else if (coin.id === 'eth') coin.bal = mg.eth;
      else if (coin.id === 'btc') coin.bal = mg.btc;
    });
    return true;
  } catch (_e) {
    return false;
  }
}

try {
  window.wwGetUnifiedUsdtAvailable = wwGetUnifiedUsdtAvailable;
  window.wwSyncCoinsBalancesFromUnifiedMerge = wwSyncCoinsBalancesFromUnifiedMerge;
  window.wwEnsureBalanceBaseFromDomOrSnap = wwEnsureBalanceBaseFromDomOrSnap;
} catch (_wwu) {}

function wwLedgerStorageKeyForTrx(trxAddr) {
  return WW_INAPP_SWAP_LEDGER_KEY + '_trx_' + String(trxAddr || '');
}

function wwReadInappLedgerByKey(key) {
  try {
    var raw = localStorage.getItem(key);
    if (!raw) return { dusdt: 0, dtrx: 0, deth: 0, dbtc: 0 };
    var o = JSON.parse(raw);
    return {
      dusdt: Number(o.dusdt) || 0,
      dtrx: Number(o.dtrx) || 0,
      deth: Number(o.deth) || 0,
      dbtc: Number(o.dbtc) || 0
    };
  } catch (_e) {
    return { dusdt: 0, dtrx: 0, deth: 0, dbtc: 0 };
  }
}

function wwPersistInappLedgerByKey(key, L) {
  try {
    var wid = typeof wwWalletSnapIdForCache === 'function' ? wwWalletSnapIdForCache() : '';
    localStorage.setItem(
      key,
      JSON.stringify({
        wid: wid,
        dusdt: L.dusdt,
        dtrx: L.dtrx,
        deth: L.deth,
        dbtc: L.dbtc,
        t: Date.now()
      })
    );
  } catch (_e) {}
}

/** deltaUsdt 正数增加展示余额，负数扣减（与 wwMergeChainWithInappLedger 的 dusdt 一致） */
function wwGiftAdjustUsdtForTrx(trxAddr, deltaUsdt) {
  if (!trxAddr || !isFinite(deltaUsdt) || deltaUsdt === 0) return false;
  var key = wwLedgerStorageKeyForTrx(trxAddr);
  var L = wwReadInappLedgerByKey(key);
  L.dusdt = (Number(L.dusdt) || 0) + deltaUsdt;
  wwPersistInappLedgerByKey(key, L);
  return true;
}

function wwGetUsdtBalanceForGiftCheck() {
  return typeof wwGetUnifiedUsdtAvailable === 'function' ? wwGetUnifiedUsdtAvailable() : 0;
}

/**
 * 仅校验 USDT 是否足够创建礼物（不扣款）。用于表单与余额检查通过后、PIN 验证之前。
 */
function wwAssertUsdtBalanceSufficientForGift(amount) {
  var a =
    typeof wwRoundUsdt2 === 'function'
      ? wwRoundUsdt2(amount)
      : Math.round(Number(amount) * 100) / 100;
  if (!(a > 0)) {
    if (typeof showToast === 'function') showToast('请输入有效金额', 'error');
    return false;
  }
  if (!REAL_WALLET || !REAL_WALLET.trxAddress) {
    if (typeof showToast === 'function') showToast('⚠️ 请先创建或导入钱包', 'warning');
    return false;
  }
  var bal = typeof wwGetUsdtBalanceForGiftCheck === 'function' ? wwGetUsdtBalanceForGiftCheck() : 0;
  if (bal + 1e-9 < a) {
    if (typeof showToast === 'function') showToast('❌ USDT 余额不足', 'error');
    return false;
  }
  return true;
}

/** 创建礼物时从当前钱包 USDT 扣款并写入 ledger（展示余额立即减少） */
function wwGiftReserveUsdt(amount) {
  var a = wwRoundUsdt2(amount);
  if (!(a > 0)) return false;
  if (!REAL_WALLET || !REAL_WALLET.trxAddress) {
    if (typeof showToast === 'function') showToast('⚠️ 请先创建或导入钱包', 'warning');
    return false;
  }
  var bal = wwGetUsdtBalanceForGiftCheck();
  if (bal + 1e-9 < a) {
    if (typeof showToast === 'function') showToast('❌ USDT 余额不足', 'error');
    return false;
  }
  wwGiftAdjustUsdtForTrx(REAL_WALLET.trxAddress, -a);
  if (typeof wwPaintMergedBalancesFromLedgerBase === 'function') wwPaintMergedBalancesFromLedgerBase();
  return true;
}

/** 领取礼物或过期返还时增加指定 TRX 地址钱包的 USDT ledger */
function wwGiftCreditUsdt(trxAddr, amount) {
  var a = wwRoundUsdt2(amount);
  if (!(a > 0) || !trxAddr) return;
  wwGiftAdjustUsdtForTrx(trxAddr, a);
  try {
    if (REAL_WALLET && REAL_WALLET.trxAddress === trxAddr && typeof wwPaintMergedBalancesFromLedgerBase === 'function')
      wwPaintMergedBalancesFromLedgerBase();
  } catch (_p) {}
}

function wwHongbaoClaimedSumUsdt(hb) {
  if (!hb || !Array.isArray(hb.claimed)) return 0;
  return hb.claimed.reduce(function (s, x) {
    return s + (parseFloat(x && x.amount) || 0);
  }, 0);
}

/**
 * 礼物过期结算：未领完部分按创建者 TRX 地址返还到其应用内 ledger。
 * 有效期内已扣余额不会自动退回；仅过期后处理未领取份额。
 */
function wwRunGiftExpirySettlement() {
  if (!REAL_WALLET || !REAL_WALLET.trxAddress) return;
  var myTrx = REAL_WALLET.trxAddress;
  var allHb = {};
  try {
    allHb = JSON.parse(localStorage.getItem('ww_hongbaos') || '{}');
  } catch (_e) {
    return;
  }
  var now = Date.now();
  var changed = false;
  Object.keys(allHb).forEach(function (kw) {
    var hb = allHb[kw];
    if (!hb || hb.giftExpiryProcessed) return;
    var expireAt = hb.expireAt;
    if (expireAt == null) {
      var base = hb.createdAt || hb.created;
      if (base) expireAt = base + 24 * 3600000;
    }
    if (expireAt == null || now <= expireAt) return;

    var creator = hb.creator || hb.from;
    if (!creator) {
      hb.giftExpiryProcessed = true;
      allHb[kw] = hb;
      changed = true;
      return;
    }

    var refund = 0;

    if (!Array.isArray(hb.claimed) && hb.amount != null) {
      if (hb.claimed === true) {
        hb.giftExpiryProcessed = true;
        allHb[kw] = hb;
        changed = true;
        return;
      }
      refund = wwRoundUsdt2(hb.amount);
    } else if (Array.isArray(hb.claimed)) {
      var total = wwRoundUsdt2(hb.totalAmount);
      var taken = wwRoundUsdt2(wwHongbaoClaimedSumUsdt(hb));
      refund = wwRoundUsdt2(Math.max(0, total - taken));
    } else {
      hb.giftExpiryProcessed = true;
      allHb[kw] = hb;
      changed = true;
      return;
    }

    if (refund > 1e-9) {
      wwGiftAdjustUsdtForTrx(creator, refund);
    }
    hb.giftExpiryProcessed = true;
    allHb[kw] = hb;
    changed = true;
  });

  if (changed) {
    try {
      localStorage.setItem('ww_hongbaos', JSON.stringify(allHb));
    } catch (_e2) {}
    try {
      if (typeof wwPaintMergedBalancesFromLedgerBase === 'function') wwPaintMergedBalancesFromLedgerBase();
    } catch (_p2) {}
    try {
      if (typeof updateGiftCountBadge === 'function') updateGiftCountBadge();
    } catch (_b) {}
  }
}

try {
  window.wwRunGiftExpirySettlement = wwRunGiftExpirySettlement;
  window.wwGiftReserveUsdt = wwGiftReserveUsdt;
  window.wwGiftCreditUsdt = wwGiftCreditUsdt;
  window.wwRoundUsdt2 = wwRoundUsdt2;
  window.wwAssertUsdtBalanceSufficientForGift = wwAssertUsdtBalanceSufficientForGift;
} catch (_wwg) {}

/** 记录一笔应用内兑换对 ledger 的增减（与 calcSwap 输出 amtOut 一致） */
function wwApplyInappSwapToLedger(fromId, toId, amtIn, amtOut) {
  var L = wwReadInappSwapLedger();
  function dec(id, a) {
    if (!isFinite(a) || a <= 0) return;
    if (id === 'usdt') L.dusdt -= a;
    else if (id === 'trx') L.dtrx -= a;
    else if (id === 'eth') L.deth -= a;
    else if (id === 'btc') L.dbtc -= a;
  }
  function inc(id, a) {
    if (!isFinite(a) || a <= 0) return;
    if (id === 'usdt') L.dusdt += a;
    else if (id === 'trx') L.dtrx += a;
    else if (id === 'eth') L.deth += a;
    else if (id === 'btc') L.dbtc += a;
  }
  dec(fromId, amtIn);
  inc(toId, amtOut);
  wwPersistInappSwapLedger(L);
  try {
    if (typeof wwRecordInappSwapTxActivity === 'function') {
      wwRecordInappSwapTxActivity(fromId, toId, amtIn, amtOut);
    }
  } catch (_swapTx) {}
}

/** 兑换至他人地址：仅扣「从」币种 ledger，不增加「到」币种（输出记在对方链上地址） */
function wwApplyInappSwapFromLedgerOnly(fromId, amtIn) {
  var L = wwReadInappSwapLedger();
  if (!isFinite(amtIn) || amtIn <= 0) return;
  if (fromId === 'usdt') L.dusdt -= amtIn;
  else if (fromId === 'trx') L.dtrx -= amtIn;
  else if (fromId === 'eth') L.deth -= amtIn;
  else if (fromId === 'btc') L.dbtc -= amtIn;
  wwPersistInappSwapLedger(L);
}

/**
 * 从当前 COINS 展示余额反推「链上+虚拟」基准（展示 = 基准 + ledger）。
 * 在写入 ledger 之前调用，供兑换后立即重绘。
 */
function wwCaptureBalanceBaseBeforeSwap() {
  try {
    var L = wwReadInappSwapLedger();
    function fromDomOrCoin(domId, coinId) {
      var el = document.getElementById(domId);
      if (el) {
        var tx = String(el.textContent || '').trim();
        if (tx && tx !== '...' && tx !== '…') {
          var n = typeof wwParseNumericBalanceText === 'function' ? wwParseNumericBalanceText(tx) : parseFloat(tx.replace(/,/g, ''));
          if (isFinite(n)) return n;
        }
      }
      if (typeof COINS !== 'undefined' && COINS.find) {
        var c = COINS.find(function (x) { return x && x.id === coinId; });
        if (c) return Number(c.bal) || 0;
      }
      return 0;
    }
    var u = fromDomOrCoin('balUsdt', 'usdt');
    var t = fromDomOrCoin('balTrx', 'trx');
    var e = fromDomOrCoin('balEth', 'eth');
    var b = fromDomOrCoin('balBtc', 'btc');
    window._wwLastBalanceBaseForInApp = {
      usdt: u - (Number(L.dusdt) || 0),
      trx: t - (Number(L.dtrx) || 0),
      eth: e - (Number(L.deth) || 0),
      btc: b - (Number(L.dbtc) || 0)
    };
  } catch (_cap) {}
}

/**
 * 用 _wwLastBalanceBaseForInApp 与当前 ledger 合并后刷新 #bal* / COINS（不发起网络）。
 * 兑换成功后立即调用，避免仅依赖异步 loadBalances 导致不扣 USDT、TRX 不显示。
 */
function wwPaintMergedBalancesFromLedgerBase() {
  try {
    var base = window._wwLastBalanceBaseForInApp;
    if (!base || typeof wwMergeChainWithInappLedger !== 'function') return false;
    var prices = { usdt: 1, trx: 0.12, eth: 2500, btc: 60000 };
    if (typeof COINS !== 'undefined' && COINS.forEach) {
      COINS.forEach(function (c) {
        if (!c || !c.id || !isFinite(c.price)) return;
        if (c.id === 'usdt') prices.usdt = c.price;
        if (c.id === 'trx') prices.trx = c.price;
        if (c.id === 'eth') prices.eth = c.price;
        if (c.id === 'btc') prices.btc = c.price;
      });
    }
    var mg = wwMergeChainWithInappLedger(base.usdt, base.trx, base.eth, base.btc);
    var usdtBal = mg.usdt, trxBal = mg.trx, ethBal = mg.eth, btcBal = mg.btc;
    var fmt = function (n) { return n >= 1 ? n.toLocaleString('en', { maximumFractionDigits: 2 }) : n.toFixed(4); };
    var fmtUsd = function (n) { return '$' + (n >= 1 ? n.toLocaleString('en', { maximumFractionDigits: 2 }) : n.toFixed(2)); };
    var pUsdtRef = (prices.usdt && prices.usdt > 0) ? prices.usdt : 1;
    var usdtEq = usdtBal * ((prices.usdt || 1) / pUsdtRef);
    var trxEq = trxBal * ((prices.trx || 0.12) / pUsdtRef);
    var ethEq = ethBal * ((prices.eth || 2500) / pUsdtRef);
    var btcEq = btcBal * ((prices.btc || 60000) / pUsdtRef);
    var total = usdtEq + trxEq + ethEq + btcEq;
    var set = function (id, val) { var el = document.getElementById(id); if (el) el.textContent = val; };
    set('balUsdt', fmt(usdtBal));
    set('valUsdt', typeof wwFmtApproxUsdt === 'function' ? wwFmtApproxUsdt(usdtEq, 2) : fmtUsd(usdtEq));
    set('balTrx', fmt(trxBal));
    set('valTrx', typeof wwFmtApproxUsdt === 'function' ? wwFmtApproxUsdt(trxEq, 4) : fmtUsd(trxEq));
    set('balEth', fmt(ethBal));
    set('valEth', typeof wwFmtApproxUsdt === 'function' ? wwFmtApproxUsdt(ethEq, 4) : fmtUsd(ethEq));
    set('balBtc', fmt(btcBal));
    set('valBtc', typeof wwFmtApproxUsdt === 'function' ? wwFmtApproxUsdt(btcEq, 4) : fmtUsd(btcEq));
    var tbd = document.getElementById('totalBalanceDisplay');
    if (tbd) {
      tbd.classList.remove('home-balance--loading');
      cancelHomeBalanceAnim();
      tbd.textContent = typeof wwFmtApproxUsdt === 'function' ? wwFmtApproxUsdt(total, 2) : fmtUsd(total);
    }
    try { window._lastTotalUsd = total; } catch (_wt) {}
    if (typeof COINS !== 'undefined' && COINS.forEach) {
      COINS.forEach(function (coin) {
        if (coin.id === 'usdt') { coin.bal = usdtBal; coin.price = prices.usdt || 1; }
        else if (coin.id === 'trx') { coin.bal = trxBal; coin.price = prices.trx || 0.12; }
        else if (coin.id === 'eth') { coin.bal = ethBal; coin.price = prices.eth || 2500; }
        else if (coin.id === 'btc') { coin.bal = btcBal; coin.price = prices.btc || 60000; }
      });
    }
    if (typeof renderSwapUI === 'function') renderSwapUI();
    if (typeof calcSwap === 'function') calcSwap();
    if (typeof applyHideZeroTokens === 'function') applyHideZeroTokens();
    return true;
  } catch (_p) {
    return false;
  }
}

/** 将首页/快照上的余额文案解析为数字（支持千分位逗号） */
function wwParseNumericBalanceText(txt) {
  if (txt == null) return NaN;
  var s = String(txt).replace(/,/g, '').replace(/\s/g, '').trim();
  var n = parseFloat(s);
  return isFinite(n) ? n : NaN;
}

/** 资产页「我的资产」USDT 行当前展示的数值（与 #balUsdt 一致） */
function wwGetAssetPageUsdtBalanceNumber() {
  var el = document.getElementById('balUsdt');
  if (!el) return NaN;
  var t = String(el.textContent || '').trim();
  if (!t || t === '...' || t === '…') return NaN;
  return wwParseNumericBalanceText(t);
}

/** 将资产页 #balUsdt / #balTrx 等展示值写回 COINS，使兑换页与资产页单一数据源一致 */
function wwSyncCoinBalsFromHomeAssetDom() {
  if (typeof COINS === 'undefined' || !COINS || !COINS.forEach) return;
  var pairs = [
    ['usdt', 'balUsdt'],
    ['trx', 'balTrx'],
    ['eth', 'balEth'],
    ['btc', 'balBtc']
  ];
  for (var i = 0; i < pairs.length; i++) {
    var coinId = pairs[i][0];
    var el = document.getElementById(pairs[i][1]);
    if (!el) continue;
    var t = String(el.textContent || '').trim();
    if (!t || t === '...' || t === '…') continue;
    var n = wwParseNumericBalanceText(t);
    if (!isFinite(n)) continue;
    COINS.forEach(function (coin) {
      if (coin && coin.id === coinId) coin.bal = n;
    });
  }
}

function wwReadHomeBalanceSnap() {
  try {
    var raw = localStorage.getItem(WW_HOME_BALANCE_SNAP_KEY);
    if (!raw) return null;
    var o = JSON.parse(raw);
    if (!o || typeof o.wid !== 'string' || typeof wwWalletSnapIdForCache !== 'function' || o.wid !== wwWalletSnapIdForCache()) return null;
    return o;
  } catch (_e) {
    return null;
  }
}

function wwApplyHomeBalanceSnap(o) {
  if (!o || !REAL_WALLET) return false;
  var tbd = document.getElementById('totalBalanceDisplay');
  var tbs = document.getElementById('totalBalanceSub');
  if (tbd) {
    tbd.classList.remove('home-balance--loading');
    if (o.totalTxt != null) tbd.textContent = o.totalTxt;
  }
  if (tbs && o.subTxt != null) tbs.textContent = o.subTxt;
  var btn = typeof _safeEl === 'function' ? _safeEl('balRefreshBtn') : document.getElementById('balRefreshBtn');
  if (btn) btn.textContent = '刷新';
  var set = function(id, val) {
    var el = document.getElementById(id);
    if (el && val != null) el.textContent = val;
  };
  set('balUsdt', o.balUsdt);
  set('valUsdt', o.valUsdt);
  set('balTrx', o.balTrx);
  set('valTrx', o.valTrx);
  set('balEth', o.balEth);
  set('valEth', o.valEth);
  set('balBtc', o.balBtc);
  set('valBtc', o.valBtc);
  if (o.chgUsdt != null) set('chgUsdt', o.chgUsdt);
  try {
    if (typeof COINS !== 'undefined' && COINS.forEach) {
      if (o.balUsdt != null) {
        var _snapUsdt = wwParseNumericBalanceText(o.balUsdt);
        if (isFinite(_snapUsdt)) {
          COINS.forEach(function (coin) {
            if (coin && coin.id === 'usdt') coin.bal = _snapUsdt;
          });
        }
      }
      if (o.balTrx != null) {
        var _snapTrx = wwParseNumericBalanceText(o.balTrx);
        if (isFinite(_snapTrx)) {
          COINS.forEach(function (coin) {
            if (coin && coin.id === 'trx') coin.bal = _snapTrx;
          });
        }
      }
      if (o.balEth != null) {
        var _snapEth = wwParseNumericBalanceText(o.balEth);
        if (isFinite(_snapEth)) {
          COINS.forEach(function (coin) {
            if (coin && coin.id === 'eth') coin.bal = _snapEth;
          });
        }
      }
      if (o.balBtc != null) {
        var _snapBtc = wwParseNumericBalanceText(o.balBtc);
        if (isFinite(_snapBtc)) {
          COINS.forEach(function (coin) {
            if (coin && coin.id === 'btc') coin.bal = _snapBtc;
          });
        }
      }
    }
  } catch (_coinSnap) {}
  if (typeof o.totalUsd === 'number' && isFinite(o.totalUsd)) {
    window._lastTotalUsd = o.totalUsd;
  } else if (typeof parseUsdFromBalanceTxt === 'function' && o.totalTxt) {
    window._lastTotalUsd = parseUsdFromBalanceTxt(o.totalTxt);
  }
  try { if (typeof applyHideZeroTokens === 'function') applyHideZeroTokens(); } catch (_e) {}
  return true;
}

function wwTryRestoreCachedHomeUi() {
  if (!REAL_WALLET || typeof wwWalletSnapIdForCache !== 'function') return;
  if (typeof wwDevVirtualUsdtActive === 'function' && wwDevVirtualUsdtActive()) return;
  var snap = wwReadHomeBalanceSnap();
  if (!snap) return;
  wwApplyHomeBalanceSnap(snap);
}

function wwPersistHomeBalanceSnap(payload) {
  try {
    if (typeof wwWalletSnapIdForCache !== 'function') return;
    payload = payload || {};
    payload.wid = wwWalletSnapIdForCache();
    payload.t = Date.now();
    localStorage.setItem(WW_HOME_BALANCE_SNAP_KEY, JSON.stringify(payload));
  } catch (_e) {}
}

/** 多公共 RPC 依次 POST JSON-RPC（429 退避 + 备用节点）；供 eth_getBalance / eth_call 共用 */
async function wwEthereumJsonRpc(payloadObj) {
  var payload = JSON.stringify(payloadObj);
  var headers = { 'Content-Type': 'application/json' };
  var bases = [];
  try {
    if (typeof ETH_RPC !== 'undefined' && ETH_RPC) bases.push(String(ETH_RPC).replace(/\/$/, ''));
  } catch (_e) {}
  bases.push(
    'https://rpc.ankr.com/eth',
    'https://ethereum.publicnode.com',
    'https://eth.llamarpc.com',
    'https://1rpc.io/eth'
  );
  var seen = {};
  for (var i = 0; i < bases.length; i++) {
    var url = bases[i];
    if (!url || seen[url]) continue;
    seen[url] = 1;
    try {
      var res = typeof wwFetch429Retry === 'function'
        ? await wwFetch429Retry(url, { method: 'POST', headers: headers, body: payload })
        : await fetch(url, { method: 'POST', headers: headers, body: payload });
      if (!res.ok) continue;
      var ethData = await res.json();
      if (ethData && ethData.error) continue;
      if (ethData && ethData.result !== undefined && ethData.result !== null) return ethData.result;
    } catch (_err) {}
  }
  return null;
}

async function wwEthGetBalanceWei(ethAddr) {
  if (!ethAddr || typeof ethAddr !== 'string') return null;
  var r = await wwEthereumJsonRpc({ jsonrpc: '2.0', method: 'eth_getBalance', params: [ethAddr, 'latest'], id: 1 });
  if (r == null) return null;
  try {
    return parseInt(r, 16);
  } catch (_p) {
    return null;
  }
}

/** 以太坊主网官方 USDT（ERC-20，6 小数），与 TronGrid 拉取的 TRC-20 USDT 合并为同一 USDT 展示 */
var WW_ETH_MAINNET_USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

function wwEthEncodeErc20BalanceOf(holderAddr) {
  var h = String(holderAddr).replace(/^0x/i, '').toLowerCase();
  if (h.length !== 40) return null;
  return '0x70a08231000000000000000000000000' + h;
}

async function wwEthMainnetErc20UsdtBalance(holderAddr) {
  var data = wwEthEncodeErc20BalanceOf(holderAddr);
  if (!data) return 0;
  var r = await wwEthereumJsonRpc({
    jsonrpc: '2.0',
    method: 'eth_call',
    params: [{ to: WW_ETH_MAINNET_USDT, data: data }, 'latest'],
    id: 4
  });
  if (r == null || r === '0x' || r === '') return 0;
  try {
    var n = typeof r === 'string' && /^0x/i.test(r) ? parseInt(r, 16) : Number(r);
    if (!isFinite(n)) return 0;
    return n / 1e6;
  } catch (_x) {
    return 0;
  }
}

/** mempool.space 与 blockstream 同源字段，互为备用 */
async function wwFetchBtcChainBalanceBtc(btcAddr) {
  if (!btcAddr || typeof btcAddr !== 'string') return 0;
  var urls = [
    'https://mempool.space/api/address/' + encodeURIComponent(btcAddr),
    'https://blockstream.info/api/address/' + encodeURIComponent(btcAddr)
  ];
  for (var j = 0; j < urls.length; j++) {
    try {
      var res = typeof wwFetch429Retry === 'function'
        ? await wwFetch429Retry(urls[j], { method: 'GET' })
        : await fetch(urls[j]);
      if (!res.ok) continue;
      var btcData = await res.json();
      var cs = btcData.chain_stats;
      var funded = (cs && cs.funded_txo_sum) ? cs.funded_txo_sum : 0;
      var spent = (cs && cs.spent_txo_sum) ? cs.spent_txo_sum : 0;
      var b = (funded - spent) / 1e8;
      if (typeof b === 'number' && isFinite(b)) return b;
    } catch (_e2) {}
  }
  return 0;
}

async function loadBalances() {
  /* 先挂载 #wwHomeAssetCardsMount（与是否有链上地址无关），避免早退时「我的资产」空白 */
  try {
    if (typeof wwInitHomeAssetCardsFromCoins === 'function') wwInitHomeAssetCardsFromCoins();
  } catch (_wic0) {}
  var vw =
    typeof wwGetChainViewWallet === 'function' ? wwGetChainViewWallet() : typeof REAL_WALLET !== 'undefined' ? REAL_WALLET : null;
  if (!vw) return;
  if (!vw.ethAddress && !vw.trxAddress && !vw.btcAddress) return;
  const tbd = document.getElementById('totalBalanceDisplay');
  const tbs = document.getElementById('totalBalanceSub');
  /* 快照前再确保一次（幂等） */
  try {
    if (typeof wwInitHomeAssetCardsFromCoins === 'function') wwInitHomeAssetCardsFromCoins();
  } catch (_wic) {}
  var hadSnap = false;
  try {
    if (!(typeof wwDevVirtualUsdtActive === 'function' && wwDevVirtualUsdtActive()) && typeof wwReadHomeBalanceSnap === 'function' && typeof wwApplyHomeBalanceSnap === 'function') {
      var _snap = wwReadHomeBalanceSnap();
      if (_snap) hadSnap = !!wwApplyHomeBalanceSnap(_snap);
    }
  } catch (_s) {}
  if (!hadSnap) {
    if (tbd) {
      tbd.classList.remove('home-balance--loading');
      if (!tbd.textContent || tbd.textContent === '…' || tbd.textContent === '...') tbd.textContent = '$0.00';
    }
    if (tbs) tbs.textContent = '≈ 0 CNY · 币安U价第三档';
    const btn0 = _safeEl('balRefreshBtn');
    if (btn0) btn0.textContent = '刷新';
    var bU = document.getElementById('balUsdt');
    if (bU) bU.textContent = '0.0000';
    var vU = document.getElementById('valUsdt');
    if (vU) vU.textContent = '$0.00';
  }

  const btn = _safeEl('balRefreshBtn');
  var cnyPromise = wwGetHomeCnyInfo();
  if (!hadSnap && tbs) {
    void cnyPromise.then(function (ci) {
      try {
        if (tbs && /^≈ 0 CNY/.test(String(tbs.textContent || ''))) tbs.textContent = '≈ 0 CNY · ' + ci.label;
      } catch (_e) {}
    });
  }

  try {
    const trxAddr = vw.trxAddress;
    const ethAddr = vw.ethAddress;
    var _ethOk = ethAddr && /^0x[0-9a-fA-F]{40}$/.test(String(ethAddr).trim());
    var _trxOk = trxAddr && /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(String(trxAddr).trim());
    if (ethAddr && !_ethOk) console.warn('[loadBalances] 无效 ETH 地址，已跳过链上查询');
    if (trxAddr && !_trxOk) console.warn('[loadBalances] 无效 TRX 地址，已跳过链上查询');
    const trxAddrQ = _trxOk ? String(trxAddr).trim() : '';
    const ethAddrQ = _ethOk ? String(ethAddr).trim() : '';
    const defaultPrices = { usdt: 1, trx: 0.12, eth: 2500, btc: 60000 };

    /** TronGrid：TRX + TRC-20 USDT 一次返回 */
    async function wwLoadTrxTronBalances() {
      if (!trxAddrQ) return { trxBal: 0, usdtTrc: 0 };
      try {
        const trxRes = await (typeof wwFetch429Retry === 'function' ? wwFetch429Retry : (typeof wwFetchRetry === 'function' ? wwFetchRetry : fetch))(
          (typeof wwTronGridBase === 'function' ? wwTronGridBase() : (typeof TRON_GRID === 'string' ? TRON_GRID.replace(/\/$/, '') : 'https://api.trongrid.io')) +
            '/v1/accounts/' +
            encodeURIComponent(trxAddrQ),
          {
            method: 'GET',
            headers: typeof wwTronHeaders === 'function' ? wwTronHeaders() : {}
          }
        );
        if (!trxRes.ok) throw new Error('trongrid ' + trxRes.status);
        const trxData = await trxRes.json();
        var tb = 0, ut = 0;
        if (trxData.data && trxData.data[0]) {
          tb = (trxData.data[0].balance || 0) / 1e6;
          const trc20 = trxData.data[0].trc20 || [];
          const usdtToken = trc20.find(function (t) { return Object.keys(t)[0] === 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'; });
          if (usdtToken) ut = parseInt(Object.values(usdtToken)[0], 10) / 1e6;
        }
        return { trxBal: tb, usdtTrc: ut };
      } catch (e) {
        console.log('TRX query failed:', e);
        return { trxBal: 0, usdtTrc: 0 };
      }
    }

    /** ETH 原生与 ERC-20 USDT 并行请求 */
    async function wwLoadEthBalancesParallel() {
      if (!ethAddrQ) return { ethBal: 0, usdtErc: 0 };
      var ethNativeP = (async function () {
        try {
          var ethOk = false;
          var ethB = 0;
          if (typeof wwFetchEthJsonRpc === 'function') {
            try {
              const ethRes = await wwFetchEthJsonRpc({ jsonrpc: '2.0', method: 'eth_getBalance', params: [ethAddrQ, 'latest'], id: 1 });
              const ethData = await ethRes.json();
              if (ethData && ethData.result) {
                ethB = parseInt(ethData.result, 16) / 1e18;
                ethOk = true;
              }
            } catch (_ej) {}
          }
          if (!ethOk) {
            var wei = await wwEthGetBalanceWei(ethAddrQ);
            if (wei != null) ethB = wei / 1e18;
          }
          return ethB;
        } catch (e) {
          console.log('ETH query failed:', e);
          return 0;
        }
      })();
      var usdtErcP = wwEthMainnetErc20UsdtBalance(ethAddrQ).catch(function (_uet) {
        console.log('ETH USDT (ERC-20) query failed:', _uet);
        return 0;
      });
      var parts = await Promise.all([ethNativeP, usdtErcP]);
      var ue = parts[1];
      return { ethBal: parts[0], usdtErc: isFinite(ue) ? ue : 0 };
    }

    async function wwLoadBtcBalanceAsync() {
      if (!vw.btcAddress) return 0;
      try {
        return await wwFetchBtcChainBalanceBtc(vw.btcAddress);
      } catch (e) {
        console.log('BTC query skipped');
        return 0;
      }
    }

    var prices, trxR, ethR, btcBalNum;
    try {
      var _all = await Promise.all([
        (async function () {
          try {
            if (typeof getPrices === 'function') return await getPrices();
          } catch (_gp) {}
          return defaultPrices;
        })(),
        wwLoadTrxTronBalances(),
        wwLoadEthBalancesParallel(),
        wwLoadBtcBalanceAsync()
      ]);
      prices = _all[0];
      trxR = _all[1];
      ethR = _all[2];
      btcBalNum = _all[3];
    } catch (_pa) {
      prices = defaultPrices;
      trxR = { trxBal: 0, usdtTrc: 0 };
      ethR = { ethBal: 0, usdtErc: 0 };
      btcBalNum = 0;
    }

    let usdtBal = (trxR.usdtTrc || 0) + (ethR.usdtErc || 0);
    let trxBal = trxR.trxBal || 0;
    let ethBal = ethR.ethBal || 0;
    let btcBal = typeof btcBalNum === 'number' && isFinite(btcBalNum) ? btcBalNum : 0;

    const fmt = (n) => n >= 1 ? n.toLocaleString('en',{maximumFractionDigits:2}) : n.toFixed(4);
    const fmtUsd = (n) => '$' + (n >= 1 ? n.toLocaleString('en',{maximumFractionDigits:2}) : n.toFixed(2));

    if (typeof WW_DEV_VIRTUAL_USDT_BAL === 'number' && WW_DEV_VIRTUAL_USDT_BAL !== 0) {
      usdtBal += WW_DEV_VIRTUAL_USDT_BAL;
    }

    try {
      window._wwLastBalanceBaseForInApp = {
        usdt: usdtBal,
        trx: trxBal,
        eth: ethBal,
        btc: btcBal
      };
    } catch (_wb) {}

    var _mg = typeof wwMergeChainWithInappLedger === 'function'
      ? wwMergeChainWithInappLedger(usdtBal, trxBal, ethBal, btcBal)
      : { usdt: usdtBal, trx: trxBal, eth: ethBal, btc: btcBal };
    usdtBal = _mg.usdt;
    trxBal = _mg.trx;
    ethBal = _mg.eth;
    btcBal = _mg.btc;

    // 首页总资产与各币估值：折合 USDT = 数量 × (币 USD 价 / USDT USD 价)
    const pUsdtRef = (prices.usdt && prices.usdt > 0) ? prices.usdt : 1;
    const usdtEq = usdtBal * ((prices.usdt || 1) / pUsdtRef);
    const trxEq = trxBal * ((prices.trx || 0.12) / pUsdtRef);
    const ethEq = ethBal * ((prices.eth || 2500) / pUsdtRef);
    const btcEq = btcBal * ((prices.btc || 60000) / pUsdtRef);
    const total = usdtEq + trxEq + ethEq + btcEq;

    const set = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
    set('balUsdt', fmt(usdtBal));
    set('valUsdt', typeof wwFmtApproxUsdt === 'function' ? wwFmtApproxUsdt(usdtEq, 2) : fmtUsd(usdtEq));
    set('balTrx', fmt(trxBal));
    set('valTrx', typeof wwFmtApproxUsdt === 'function' ? wwFmtApproxUsdt(trxEq, 4) : fmtUsd(trxEq));
    set('balEth', fmt(ethBal));
    set('valEth', typeof wwFmtApproxUsdt === 'function' ? wwFmtApproxUsdt(ethEq, 4) : fmtUsd(ethEq));
    set('balBtc', fmt(btcBal));
    set('valBtc', typeof wwFmtApproxUsdt === 'function' ? wwFmtApproxUsdt(btcEq, 4) : fmtUsd(btcEq));
    /* USDT 24h 涨跌幅：不阻塞主余额，后台拉取后写入 */
    void (async function wwRefreshUsdt24hChange() {
      try {
        var cgChg = 'https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd&include_24hr_change=true';
        const r2 =
          typeof wwFetchCoinGecko === 'function'
            ? await wwFetchCoinGecko(cgChg)
            : typeof wwFetch429Retry === 'function'
              ? await wwFetch429Retry(cgChg, { method: 'GET' })
              : await fetch(cgChg);
        if (r2.ok) {
          const d2 = await r2.json();
          const fmtChg = (v) => (v>0?'+':'')+v.toFixed(2)+'%';
          if(d2.tether?.usd_24h_change!==undefined) set('chgUsdt', fmtChg(d2.tether.usd_24h_change));
        }
      } catch(e) {}
    })();
    if(tbd) tbd.classList.remove('home-balance--loading');
    /* 总资产立即落屏，避免 560ms 缓动导致「刷新后迟迟不更新」的观感 */
    cancelHomeBalanceAnim();
    if (tbd) {
      var _fmtTot = typeof wwFmtApproxUsdt === 'function' ? function (n) { return wwFmtApproxUsdt(n, 2); } : fmtUsd;
      tbd.textContent = _fmtTot(total);
    }
    window._lastTotalUsd = total;
    if(typeof drawPortfolioPieChart==='function') drawPortfolioPieChart(usdtEq, trxEq, ethEq, btcEq);
    if(typeof refreshHomePriceTicker==='function') refreshHomePriceTicker();
    const cnyInfo = await cnyPromise;
    var domUsd = parseUsdFromBalanceTxt(tbd ? tbd.textContent : '');
    var basisUsd =
      typeof total === 'number' && isFinite(total) && total > 0 ? total : Math.max(0, domUsd);
    var rate = Number(cnyInfo && cnyInfo.rate);
    if (!isFinite(rate) || rate <= 0) rate = 7.2;
    var cnyLbl = cnyInfo && cnyInfo.label ? cnyInfo.label : '实时汇率';
    set('totalBalanceSub', '≈ ' + (basisUsd * rate).toFixed(0) + ' CNY · ' + cnyLbl);

    // ── 同步 COINS 余额（兑换页使用）──
    COINS.forEach(coin => {
      if(coin.id === 'usdt') { coin.bal = usdtBal; coin.price = prices.usdt || 1; }
      else if(coin.id === 'trx') { coin.bal = trxBal; coin.price = prices.trx || 0.12; }
      else if(coin.id === 'eth') { coin.bal = ethBal; coin.price = prices.eth || 2500; }
      else if(coin.id === 'btc') { coin.bal = btcBal; coin.price = prices.btc || 60000; }
    });
    renderSwapUI(); calcSwap();
    
    if(btn) btn.textContent = '刷新';
    if(typeof applyHideZeroTokens==='function') applyHideZeroTokens();
    if(typeof loadTrxResource==='function') loadTrxResource();
    try {
      var _ptLb = document.getElementById('page-transfer');
      if (_ptLb && _ptLb.classList.contains('active') && typeof calcTransferFee === 'function') calcTransferFee();
    } catch (_ctfLb) {}
    try {
      var _chgSnap = document.getElementById('chgUsdt');
      wwPersistHomeBalanceSnap({
        totalUsd: basisUsd,
        totalTxt: typeof wwFmtApproxUsdt === 'function' ? wwFmtApproxUsdt(basisUsd, 2) : fmtUsd(basisUsd),
        subTxt: '≈ ' + (basisUsd * rate).toFixed(0) + ' CNY · ' + cnyLbl,
        balUsdt: fmt(usdtBal),
        valUsdt: typeof wwFmtApproxUsdt === 'function' ? wwFmtApproxUsdt(usdtEq, 2) : fmtUsd(usdtEq),
        balTrx: fmt(trxBal),
        valTrx: typeof wwFmtApproxUsdt === 'function' ? wwFmtApproxUsdt(trxEq, 4) : fmtUsd(trxEq),
        balEth: fmt(ethBal),
        valEth: typeof wwFmtApproxUsdt === 'function' ? wwFmtApproxUsdt(ethEq, 4) : fmtUsd(ethEq),
        balBtc: fmt(btcBal),
        valBtc: typeof wwFmtApproxUsdt === 'function' ? wwFmtApproxUsdt(btcEq, 4) : fmtUsd(btcEq),
        chgUsdt: _chgSnap ? _chgSnap.textContent : ''
      });
    } catch (_ps) {}
  } catch(e) {
    console.error('Balance load error:', e);
    if(tbd) tbd.classList.remove('home-balance--loading');
    if(btn) btn.textContent = '刷新';
    if (typeof wwDevVirtualUsdtActive === 'function' && wwDevVirtualUsdtActive()) {
      try {
        var prObj = { usdt: 1, trx: 0.12, eth: 3200, btc: 60000 };
        try {
          if (typeof getPrices === 'function') prObj = await getPrices();
        } catch (_gp) {}
        var pu = prObj && isFinite(prObj.usdt) ? prObj.usdt : 1;
        var pt = prObj && isFinite(prObj.trx) ? prObj.trx : 0.12;
        var pe = prObj && isFinite(prObj.eth) ? prObj.eth : 2500;
        var pb = prObj && isFinite(prObj.btc) ? prObj.btc : 60000;
        var usdtBase = 0, trxBase = 0, ethBase = 0, btcBase = 0;
        if (typeof WW_DEV_VIRTUAL_USDT_BAL === 'number' && WW_DEV_VIRTUAL_USDT_BAL !== 0) {
          usdtBase += WW_DEV_VIRTUAL_USDT_BAL;
        }
        try {
          window._wwLastBalanceBaseForInApp = {
            usdt: usdtBase,
            trx: trxBase,
            eth: ethBase,
            btc: btcBase
          };
        } catch (_wbc) {}
        var _mV = typeof wwMergeChainWithInappLedger === 'function'
          ? wwMergeChainWithInappLedger(usdtBase, trxBase, ethBase, btcBase)
          : { usdt: usdtBase, trx: trxBase, eth: ethBase, btc: btcBase };
        var pRef = pu > 0 ? pu : 1;
        var usdtEqV = _mV.usdt * (pu / pRef);
        var trxEqV = _mV.trx * (pt / pRef);
        var ethEqV = _mV.eth * (pe / pRef);
        var btcEqV = _mV.btc * (pb / pRef);
        var totalV = usdtEqV + trxEqV + ethEqV + btcEqV;
        var fmtN = function (n) { return n >= 1 ? n.toLocaleString('en', { maximumFractionDigits: 2 }) : n.toFixed(4); };
        var fmtU = function (n) { return '$' + (n >= 1 ? n.toLocaleString('en', { maximumFractionDigits: 2 }) : n.toFixed(2)); };
        var setE = function (id, val) { var el = document.getElementById(id); if (el) el.textContent = val; };
        setE('balUsdt', fmtN(_mV.usdt));
        setE('valUsdt', typeof wwFmtApproxUsdt === 'function' ? wwFmtApproxUsdt(usdtEqV, 2) : fmtU(usdtEqV));
        setE('balTrx', fmtN(_mV.trx));
        setE('valTrx', typeof wwFmtApproxUsdt === 'function' ? wwFmtApproxUsdt(trxEqV, 4) : fmtU(trxEqV));
        setE('balEth', fmtN(_mV.eth));
        setE('valEth', typeof wwFmtApproxUsdt === 'function' ? wwFmtApproxUsdt(ethEqV, 4) : fmtU(ethEqV));
        setE('balBtc', fmtN(_mV.btc));
        setE('valBtc', typeof wwFmtApproxUsdt === 'function' ? wwFmtApproxUsdt(btcEqV, 4) : fmtU(btcEqV));
        if (tbd) {
          cancelHomeBalanceAnim();
          var _fmtV = typeof wwFmtApproxUsdt === 'function' ? function (nv) { return wwFmtApproxUsdt(nv, 2); } : fmtU;
          tbd.textContent = _fmtV(totalV);
        }
        window._lastTotalUsd = totalV;
        var cnyI = await wwGetHomeCnyInfo();
        var rVirt = Number(cnyI && cnyI.rate);
        if (!isFinite(rVirt) || rVirt <= 0) rVirt = 7.2;
        var lbVirt = cnyI && cnyI.label ? cnyI.label : '实时汇率';
        if (tbs) tbs.textContent = '≈ ' + (totalV * rVirt).toFixed(0) + ' CNY · 含虚拟余额（链上请求失败） · ' + lbVirt;
        if (typeof COINS !== 'undefined' && COINS.forEach) {
          COINS.forEach(function (coin) {
            if (coin.id === 'usdt') { coin.bal = _mV.usdt; coin.price = pu; }
            else if (coin.id === 'trx') { coin.bal = _mV.trx; coin.price = pt; }
            else if (coin.id === 'eth') { coin.bal = _mV.eth; coin.price = pe; }
            else if (coin.id === 'btc') { coin.bal = _mV.btc; coin.price = pb; }
          });
        }
        if (typeof renderSwapUI === 'function') renderSwapUI();
        if (typeof calcSwap === 'function') calcSwap();
        try {
          var _ptV = document.getElementById('page-transfer');
          if (_ptV && _ptV.classList.contains('active') && typeof calcTransferFee === 'function') calcTransferFee();
        } catch (_ctfV) {}
      } catch (_ve) {}
    }
  } finally {
    try {
      window._wwHomeBalancesHydrated = true;
    } catch (_hyd) {}
  }
}

/** ui.js 先于 runtime：首帧 goTo 时尚无 wwInitHomeAssetCardsFromCoins / loadBalances；且仅靠 .active 会漏检（首帧仅靠 data-ww-boot-page + CSS 显示首页）。 */
function wwHomePageIsVisibleForMount() {
  try {
    var ph = document.getElementById('page-home');
    if (!ph) return false;
    if (ph.classList.contains('active')) return true;
    try {
      if (document.documentElement.getAttribute('data-ww-boot-page') === 'page-home') return true;
    } catch (_b) {}
    try {
      var st = window.getComputedStyle(ph);
      if (st && st.display !== 'none' && st.visibility !== 'hidden' && ph.getBoundingClientRect().height > 40) return true;
    } catch (_g) {}
  } catch (_e) {}
  return false;
}

function wwEnsureHomeUiAfterRuntime() {
  try {
    if (!wwHomePageIsVisibleForMount()) return;
    var mount = document.getElementById('wwHomeAssetCardsMount');
    var needCards = mount && (!mount.querySelector || !mount.querySelector('.asset-card'));
    if (needCards && typeof wwInitHomeAssetCardsFromCoins === 'function') wwInitHomeAssetCardsFromCoins();
    if (typeof updateAddr === 'function') updateAddr();
    if (
      typeof wwWalletHasAnyChainAddressIncludingTemp === 'function' &&
      wwWalletHasAnyChainAddressIncludingTemp() &&
      typeof loadBalances === 'function'
    ) {
      void loadBalances();
    } else if (typeof applyHideZeroTokens === 'function') {
      applyHideZeroTokens();
    }
  } catch (_e) {}
}
try {
  window.wwEnsureHomeUiAfterRuntime = wwEnsureHomeUiAfterRuntime;
} catch (_w) {}

(function wwSyncActiveHomeAfterRuntimeLoaded() {
  function tick() {
    wwEnsureHomeUiAfterRuntime();
  }
  setTimeout(tick, 0);
  setTimeout(tick, 50);
  setTimeout(tick, 180);
  if (document.readyState === 'complete') {
    setTimeout(tick, 0);
  } else {
    window.addEventListener('load', function () {
      setTimeout(tick, 0);
    });
  }
})();


// ── 加密资讯 ──────────────────────────────────────────────────
/* newsLoading / newsCache / newsCacheTime 由 wallet.ui.js 声明为 var */

async function loadNews() {
  // 备用新闻源列表（allorigins代理）
  const RSS_SOURCES = [
    'https://api.allorigins.win/get?url=https%3A%2F%2Fcoindesk.com%2Farc%2Foutboundfeeds%2Frss%2F',
    'https://api.allorigins.win/get?url=https%3A%2F%2Fcointelegraph.com%2Frss',
    'https://api.allorigins.win/get?url=https%3A%2F%2Fdecrypt.co%2Ffeed',
  ];
  if(newsLoading) return;
  const list = document.getElementById('newsList');
  if(!list) return;
  if(newsCache && Date.now() - newsCacheTime < 5 * 60 * 1000) {
    renderNews(newsCache);
    return;
  }
  newsLoading = true;
  list.innerHTML = '<div style="text-align:center;padding:40px 20px;color:var(--text-muted)"><div class="u10">⏳</div><div style="font-size:13px">加载中...</div></div>';
  try {
    // 使用 allorigins 代理绕过 CORS，抓取 CoinDesk RSS
    const proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent('https://www.coindesk.com/arc/outboundfeeds/rss/');
    const res = await fetch(proxyUrl);
    const data = await res.json();
    // 解析 RSS XML
    const parser = new DOMParser();
    const xml = parser.parseFromString(data.contents, 'text/xml');
    const items = xml.querySelectorAll('item');
    newsCache = Array.from(items).slice(0,20).map(item => ({
      title: item.querySelector('title')?.textContent || '',
      url: item.querySelector('link')?.textContent || item.querySelector('guid')?.textContent || '',
      source: {title: 'CoinDesk'},
      published_at: item.querySelector('pubDate')?.textContent || ''
    }));
    newsCacheTime = Date.now();
    renderNews(newsCache);
  } catch(e) {
    console.log('News load failed:', e);
    list.innerHTML = '<div style="text-align:center;padding:30px 20px;color:var(--text-muted)"><div class="u10">😕</div><div style="font-size:13px;margin-bottom:16px">加载失败，请点下方链接阅读</div></div>';
  }
  newsLoading = false;
}

function renderNews(items) {
  const list = document.getElementById('newsList');
  if(!list || !items.length) return;
  
  list.innerHTML = '';
  items.forEach(item => {
    const time = item.published_at ? new Date(item.published_at).toLocaleString('zh-CN', {month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '';
    const source = item.source?.title || item.domain || '';
    const coins = (item.currencies || []).slice(0,3).map(c => 
      `<span style="background:rgba(200,168,75,0.12);border:1px solid rgba(200,168,75,0.2);border-radius:6px;padding:2px 6px;font-size:10px;color:var(--gold)">${c.code}</span>`
    ).join('');
    
    const div = document.createElement('div');
    div.style.cssText = 'background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:14px;cursor:pointer;transition:all 0.15s';
    div.innerHTML = `
      <div style="font-size:14px;font-weight:600;color:var(--text);line-height:1.5;margin-bottom:8px">${item.title}</div>
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px">
        <div class="u11">
          <span style="font-size:11px;color:var(--text-muted)">${source}</span>
          ${time ? '<span style="font-size:10px;color:var(--text-dim)">· ' + time + '</span>' : ''}
        </div>
        <div style="display:flex;gap:4px;flex-wrap:wrap">${coins}</div>
      </div>
    `;
    div.onclick = () => {
      if(item.url) window.open(item.url, '_blank');
    };
    list.appendChild(div);
  });
}


/* changeMnemonicLength / startVerify / checkVerify / _resumeWalletAfterUnlock：以 wallet.ui.js 为准（runtime 曾覆盖导致 createRealWallet 覆盖本机钱包等严重问题） */

function wwB64Bytes(u8) {
  var s = '';
  var chunk = 8192;
  for (var i = 0; i < u8.length; i += chunk) {
    s += String.fromCharCode.apply(null, u8.subarray(i, Math.min(i + chunk, u8.length)));
  }
  return btoa(s);
}
function wwRefreshAntiPhishOnPinUnlock() {
  var w = '';
  try { w = localStorage.getItem('ww_antiphish_word') || ''; } catch (e) {}
  var el = document.getElementById('wwAntiPhishBadge');
  if (!el) return;
  if (!w) { el.style.display = 'none'; el.textContent = ''; return; }
  el.style.display = 'block';
  el.textContent = '防钓鱼口令：' + w;
}
function wwOpenAntiPhishDialog() {
  var cur = '';
  try { cur = localStorage.getItem('ww_antiphish_word') || ''; } catch (e) {}
  var t = prompt('设置防钓鱼口令（解锁界面会显示，用于识别仿冒应用）\n留空则清除', cur);
  if (t === null) return;
  t = String(t).trim();
  if (t === '') {
    try { localStorage.removeItem('ww_antiphish_word'); } catch (e) {}
    if (typeof showToast === 'function') showToast('已清除防钓鱼口令', 'info');
  } else {
    try { localStorage.setItem('ww_antiphish_word', t.slice(0, 32)); } catch (e) {}
    if (typeof showToast === 'function') showToast('已保存防钓鱼口令', 'success');
  }
  wwRefreshAntiPhishOnPinUnlock();
  if (typeof updateSettingsPage === 'function') updateSettingsPage();
}
async function wwExportEncryptedCloudBackup() {
  if (!REAL_WALLET || !REAL_WALLET.ethAddress) { if (typeof showToast === 'function') showToast('请先创建或导入钱包', 'warning'); return; }
  var pass = prompt('设置加密密码（请牢记，用于解密此备份）');
  if (!pass) return;
  var enc = new TextEncoder();
  try {
    var payload = JSON.stringify({
      v: 1,
      t: Date.now(),
      eth: REAL_WALLET.ethAddress,
      trx: REAL_WALLET.trxAddress || '',
      btc: REAL_WALLET.btcAddress || '',
      backed: !!REAL_WALLET.backedUp
    });
    var salt = crypto.getRandomValues(new Uint8Array(16));
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveBits', 'deriveKey']);
    var key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: 120000, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
    var ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, enc.encode(payload));
    var out = { v: 1, kind: 'ww_cloud_backup', salt: wwB64Bytes(salt), iv: wwB64Bytes(iv), data: wwB64Bytes(new Uint8Array(ct)) };
    var txt = JSON.stringify(out);
    try {
      await navigator.clipboard.writeText(txt);
      if (typeof showToast === 'function') showToast('加密备份已复制到剪贴板，可粘贴到邮件或云笔记', 'success');
    } catch (e) {
      prompt('复制加密备份（手动全选复制）', txt);
    }
  } catch (e) {
    if (typeof showToast === 'function') showToast('导出失败：' + (e && e.message ? e.message : String(e)), 'error');
  }
}
async function wwExportEncryptedKeyBackup() {
  if (!REAL_WALLET || !REAL_WALLET.ethAddress) { if (typeof showToast === 'function') showToast('请先创建或导入钱包', 'warning'); return; }
  if (!window.confirm('将导出含助记词的加密文本。若密码泄露，资产将面临风险。仅保存到可信位置，切勿与密码同存一处。确定继续？')) return;
  var pass = prompt('设置加密密码（请牢记，用于在其他设备解密此备份）');
  if (!pass) return;
  if (String(pass).length < 4) { if (typeof showToast === 'function') showToast('请输入至少 4 位密码', 'warning'); return; }
  var enc = new TextEncoder();
  var doExport = async function () {
    if (!REAL_WALLET.enMnemonic) { if (typeof showToast === 'function') showToast('请先创建或导入钱包', 'warning'); return; }
    try {
      var payload = JSON.stringify({
        v: 1,
        t: Date.now(),
        kind: 'ww_key_payload',
        enMnemonic: REAL_WALLET.enMnemonic,
        eth: REAL_WALLET.ethAddress,
        trx: REAL_WALLET.trxAddress || '',
        btc: REAL_WALLET.btcAddress || '',
        backed: !!REAL_WALLET.backedUp
      });
      var salt = crypto.getRandomValues(new Uint8Array(16));
      var iv = crypto.getRandomValues(new Uint8Array(12));
      var keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveBits', 'deriveKey']);
      var key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: 120000, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
      var ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, enc.encode(payload));
      var out = { v: 1, kind: 'ww_key_backup', salt: wwB64Bytes(salt), iv: wwB64Bytes(iv), data: wwB64Bytes(new Uint8Array(ct)) };
      var txt = JSON.stringify(out);
      try {
        await navigator.clipboard.writeText(txt);
        if (typeof showToast === 'function') showToast('含助记词加密备份已复制，请离线妥善保管', 'success');
      } catch (e) {
        prompt('复制加密备份（手动全选复制）', txt);
      }
    } catch (e) {
      if (typeof showToast === 'function') showToast('导出失败：' + (e && e.message ? e.message : String(e)), 'error');
    }
  };
  if (typeof wwWithWalletSensitive === 'function') return wwWithWalletSensitive(doExport);
  return doExport();
}
function renderWwChartsPlaceholder() {
  var host = document.getElementById('wwCandleBars');
  if (!host) return;
  host.innerHTML = '';
  var n = 28;
  for (var i = 0; i < n; i++) {
    var h = 36 + Math.random() * 58;
    var up = Math.random() > 0.42;
    var col = up ? '#26a17b' : '#e74c3c';
    var wick = 10 + Math.random() * 20;
    var d = document.createElement('div');
    d.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;flex:1;min-width:0;max-width:12px';
    d.innerHTML = '<div style="width:2px;height:' + wick + '%;background:rgba(255,255,255,0.22);margin-bottom:2px"></div><div style="width:72%;height:' + h + '%;background:' + col + ';border-radius:2px;opacity:0.92"></div>';
    host.appendChild(d);
  }
}

function continueAfterPinCheck() {
  if (!wwHasPinConfigured()) { void _resumeWalletAfterUnlock(); return; }
  const ov = document.getElementById('pinUnlockOverlay');
  const inp = document.getElementById('pinUnlockInput');
  const err = document.getElementById('pinUnlockError');
  if(ov && inp) {
    inp.value = '';
    if(err) err.style.display = 'none';
    ov.classList.add('show');
    try { if (typeof wwRefreshAntiPhishOnPinUnlock === 'function') wwRefreshAntiPhishOnPinUnlock(); } catch (_ap) {}
    setTimeout(() => { try { inp.focus(); } catch(e) {} }, 200);
  } else {
    void _resumeWalletAfterUnlock();
  }
}
async function submitPageRestorePin() {
  const inp = document.getElementById('pinRestorePageInput');
  const err = document.getElementById('pageRestorePinError');
  const panel = document.getElementById('pageRestorePinPanel');
  if (!wwHasPinConfigured()) {
    if (typeof wwEnsurePinThen === 'function') {
      wwEnsurePinThen(function () {
        if (typeof showToast === 'function') showToast('PIN 已设置，请输入 6 位数字解锁', 'info', 3200);
      });
      return;
    }
    if (err) { err.textContent = '尚未在本机设置 PIN，请在设置中配置或使用导入流程'; err.style.display = 'block'; }
    if (inp) inp.value = '';
    if (panel) { panel.classList.remove('wt-shake-wrong'); void panel.offsetWidth; panel.classList.add('wt-shake-wrong'); }
    return;
  }
  const got = inp ? String(inp.value).trim() : '';
  var ok = typeof verifyPin === 'function' ? await verifyPin(got) : false;
  if (ok) {
    window.wwSessionPinBridge.set(got);
    try {
      localStorage.setItem('ww_pin_set', '1');
    } catch (_ps) {}
    try {
      if (typeof updateSettingsPage === 'function') updateSettingsPage();
    } catch (_usp) {}
    if (err) { err.style.display = 'none'; err.textContent = ''; }
    if (inp) inp.value = '';
    if (typeof wwTotpEnabled === 'function' && wwTotpEnabled()) {
      showTotpUnlockOverlay();
    } else {
      window._wwForceIdleLock = false;
      await _resumeWalletAfterUnlock();
    }
  } else {
    if (err) { err.textContent = 'PIN错误'; err.style.display = 'block'; }
    if (inp) inp.value = '';
    if (panel) { panel.classList.remove('wt-shake-wrong'); void panel.offsetWidth; panel.classList.add('wt-shake-wrong'); }
  }
}
async function submitPinUnlock() {
  const inp = document.getElementById('pinUnlockInput');
  const got = inp ? inp.value.trim() : '';
  const ov = document.getElementById('pinUnlockOverlay');
  const err = document.getElementById('pinUnlockError');
  const panel = document.getElementById('pinUnlockPanel');
  var ok = typeof verifyPin === 'function' ? await verifyPin(got) : false;
  if (ok) {
    try {
      localStorage.setItem('ww_pin_set', '1');
    } catch (_ps2) {}
    try {
      if (typeof updateSettingsPage === 'function') updateSettingsPage();
    } catch (_usp2) {}
    if (typeof window._wwAfterPinUnlockContinue === 'function') {
      var cont = window._wwAfterPinUnlockContinue;
      window._wwAfterPinUnlockContinue = null;
      window.wwSessionPinBridge.set(got);
      if (ov) ov.classList.remove('show');
      if (err) err.style.display = 'none';
      if (inp) inp.value = '';
      try {
        await Promise.resolve(cont());
      } catch (_c) {}
      return;
    }
    window.wwSessionPinBridge.set(got);
    if(ov) ov.classList.remove('show');
    if(typeof wwTotpEnabled === 'function' && wwTotpEnabled()) {
      showTotpUnlockOverlay();
    } else {
      window._wwForceIdleLock = false;
      await _resumeWalletAfterUnlock();
    }
  } else {
    if(err) { err.textContent = 'PIN错误'; err.style.display = 'block'; }
    if(panel) { panel.classList.remove('wt-shake-wrong'); void panel.offsetWidth; panel.classList.add('wt-shake-wrong'); }
    if(inp) inp.value = '';
  }
}
function closePinUnlock() {
  if(window._wwForceIdleLock) {
    if(typeof showToast==='function') showToast('闲置超时，请输入 PIN 解锁', 'warning', 2200);
    return;
  }
  try { window._wwAfterPinUnlockContinue = null; } catch (_cl) {}
  const ov = document.getElementById('pinUnlockOverlay');
  if(ov) ov.classList.remove('show');
}
function checkWwAirdrop() {
  try {
    var u = 'https://worldtoken.cc/';
    if (typeof window !== 'undefined' && window.open) {
      window.open(u, '_blank', 'noopener,noreferrer');
    } else {
      location.href = u;
    }
  } catch (e) {}
  if (typeof showToast === 'function') showToast('已在浏览器打开官网，可在站内查看活动与公告', 'info', 2800);
}

async function openPinSettingsDialog() {
  if (typeof openPinSetupOverlay === 'function' && typeof wwPersistPinFromSetup === 'function') {
    try {
      if (wwHasPinConfigured() && confirm('是否清除本机已保存的 PIN？\n确定：清除 PIN 及两步验证绑定；取消：使用下方键盘重新设置 PIN（需输入两次一致）。')) {
        window.wwSessionPinBridge.clear();
        try {
          localStorage.removeItem('ww_unlock_pin');
          localStorage.removeItem('ww_pin');
          localStorage.removeItem('ww_pin_hash');
          localStorage.removeItem('ww_pin_set');
          localStorage.removeItem('ww_totp_secret');
          localStorage.removeItem('ww_totp_enabled');
        } catch (e) {}
        showToast('已清除 PIN', 'success');
        if (typeof updateSettingsPage === 'function') updateSettingsPage();
        return;
      }
    } catch (e) {}
    window._wwPinSetupComplete = async function (pin) {
      await wwPersistPinFromSetup(pin);
      showToast('PIN 已保存', 'success');
      if (typeof updateSettingsPage === 'function') updateSettingsPage();
      if (typeof updateWalletSecurityScoreUI === 'function') updateWalletSecurityScoreUI();
      if (typeof offerTotpAfterPinSave === 'function') offerTotpAfterPinSave();
    };
    openPinSetupOverlay({ skipFirstRunLock: true });
    return;
  }
  const cur = window.wwSessionPinBridge.get() || '';
  const a = prompt('设置 6 位数字 PIN（留空则清除 PIN）', cur);
  if(a === null) return;
  const t = a.trim();
  if(t === '') {
    window.wwSessionPinBridge.clear();
    try {
      localStorage.removeItem('ww_unlock_pin');
      localStorage.removeItem('ww_pin');
      localStorage.removeItem('ww_pin_hash');
      localStorage.removeItem('ww_pin_set');
      localStorage.removeItem('ww_totp_secret');
      localStorage.removeItem('ww_totp_enabled');
    } catch(e2) {}
    showToast('已清除 PIN', 'success');
    if(typeof updateSettingsPage==='function') updateSettingsPage();
    return;
  }
  if(!/^\d{6}$/.test(t)) { showToast('PIN 须为 6 位数字', 'error'); return; }
  try {
    if (typeof savePinSecure === 'function') await savePinSecure(t);
  } catch (e) {
    console.error(e);
    showToast('PIN 保存失败', 'error');
    return;
  }
  window.wwSessionPinBridge.set(t);
  try { localStorage.setItem('ww_pin_set', '1'); } catch(e3) {}
  showToast('PIN 已保存', 'success');
  if (typeof updateSettingsPage === 'function') updateSettingsPage();
  if (typeof updateWalletSecurityScoreUI === 'function') updateWalletSecurityScoreUI();
  if(typeof offerTotpAfterPinSave === 'function') offerTotpAfterPinSave();
}

// 时钟
function updateTime() {
  const now=new Date();
  document.getElementById('statusTime').textContent=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
}
updateTime(); window._timeInterval = setInterval(updateTime,60000);
try {
  wwResetActivityClock();
  ['pointerdown','touchstart','keydown','scroll','click'].forEach(function(ev) {
    document.addEventListener(ev, function() { wwResetActivityClock(); }, { capture: true, passive: true });
  });
  setInterval(function() { try { wwTickIdleLock(); } catch(e) {} }, 15000);
  setInterval(function() { try { if (typeof wwRecurringTick === 'function') wwRecurringTick(); } catch(e) {} }, 60000);
  wwApplyIdleLockLabel();
} catch(e) {}
const lg=document.getElementById("welcomeLangGrid"); if(lg) lg.scrollTop=0;
try { var _ap0 = document.querySelector('.page.active'); applySeoForPage(_ap0 && _ap0.id ? _ap0.id : 'page-welcome'); applyOfflineState(); window.addEventListener('online', applyOfflineState); window.addEventListener('offline', applyOfflineState); } catch(e) {}
try { initBalancePrivacyToggle(); initScrollTopBtn(); initTabSwipeGesture(); } catch (e) {}

/* hash 路由由 wallet.ui.js 统一处理（含 wwEnsureInitialHashRoute）；勿重复注册，避免双次 goTo 与行为不一致 */

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      });
    }
  

(function(){
  function run(){
    if(window._wwPaintBoot) return;
    window._wwPaintBoot = true;
    try { if(typeof updateHomeChainStrip==='function') updateHomeChainStrip(); } catch(e) {}
  }
  if(document.readyState==='complete') run();
  else window.addEventListener('load', run);
})();



// ── 刷新恢复当前页（补充：无 hash 时按上次 goTo 的 ww_last_page）────────────────
(function() {
  var ALLOW_RESTORE = ['page-home', 'page-addr', 'page-swap', 'page-settings', 'page-hongbao'];
  try {
    var last = sessionStorage.getItem('ww_last_page');
    if (!last || !document.getElementById(last)) return;
    var devAny = typeof window !== 'undefined' && window.WW_DEV_PRESERVE_ROUTE;
    if (!devAny && (!ALLOW_RESTORE.includes(last))) return;
    var hasWallet = typeof wwWalletHasAnyChainAddress === 'function' && wwWalletHasAnyChainAddress(REAL_WALLET);
    if (!hasWallet) {
      try { sessionStorage.removeItem('ww_last_page'); } catch (_r) {}
      return;
    }
    if ((location.hash || '').replace(/^#/, '').trim().split('?')[0]) return;
    setTimeout(function() { goTo(last); }, 50);
  } catch(_) {}
})();

(function wwClearStaleServiceWorkerCaches() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.getRegistrations().then(function(regs) {
    regs.forEach(function(r) { r.update(); });
  });
  if (typeof caches === 'undefined' || !caches.keys) return;
  caches.keys().then(function(names) {
    names.forEach(function(name) {
      if (name !== 'worldtoken-v202604090938') caches.delete(name);
    });
  });
})();

// 防止在控制台输出敏感数据
(function wwSanitizeConsoleOutput() {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  const sanitize = function(obj) {
    if (obj === REAL_WALLET || (obj && typeof obj === 'object' && obj.privateKey)) {
      return '[SENSITIVE_DATA_FILTERED]';
    }
    if (typeof obj === 'string' && (obj.includes('privateKey') || obj.includes('mnemonic'))) {
      return '[SENSITIVE_DATA_FILTERED]';
    }
    return obj;
  };
  console.log = function() {
    return originalLog.apply(console, Array.from(arguments).map(sanitize));
  };
  console.error = function() {
    return originalError.apply(console, Array.from(arguments).map(sanitize));
  };
  console.warn = function() {
    return originalWarn.apply(console, Array.from(arguments).map(sanitize));
  };
})();

// data-ww-fn：显式挂到 window，供 wallet.html 捕获阶段委托脚本读取 window[fnName]
(function wwExposeDataWwFnHandlers() {
  try {
    if (typeof checkVerify === 'function') window.checkVerify = checkVerify;
    if (typeof closePinSetupOverlay === 'function') window.closePinSetupOverlay = closePinSetupOverlay;
    if (typeof closePinUnlock === 'function') window.closePinUnlock = closePinUnlock;
    if (typeof closeTotpSetup === 'function') window.closeTotpSetup = closeTotpSetup;
    if (typeof closeTotpUnlock === 'function') window.closeTotpUnlock = closeTotpUnlock;
    if (typeof closeTransferConfirm === 'function') window.closeTransferConfirm = closeTransferConfirm;
    if (typeof confirmTotpSetup === 'function') window.confirmTotpSetup = confirmTotpSetup;
    if (typeof confirmTransfer === 'function') window.confirmTransfer = confirmTransfer;
    if (typeof copyHbCreatedKeyword === 'function') window.copyHbCreatedKeyword = copyHbCreatedKeyword;
    if (typeof copyHomeAddr === 'function') window.copyHomeAddr = copyHomeAddr;
    if (typeof copyNative === 'function') window.copyNative = copyNative;
    if (typeof createGift === 'function') window.createGift = createGift;
    if (typeof createNewWallet === 'function') window.createNewWallet = createNewWallet;
    if (typeof doImportWallet === 'function') window.doImportWallet = doImportWallet;
    if (typeof doSwap === 'function') window.doSwap = doSwap;
    if (typeof wwExecuteInAppSwap === 'function') window.wwExecuteInAppSwap = wwExecuteInAppSwap;
    if (typeof wwSwapToOtherToggle === 'function') window.wwSwapToOtherToggle = wwSwapToOtherToggle;
    if (typeof wwHomePaintFromCoinsPortfolio === 'function') window.wwHomePaintFromCoinsPortfolio = wwHomePaintFromCoinsPortfolio;
    if (typeof openDex === 'function') window.openDex = openDex;
    if (typeof doTransfer === 'function') window.doTransfer = doTransfer;
    if (typeof openHomeTransfer === 'function') window.openHomeTransfer = openHomeTransfer;
    if (typeof hideQR === 'function') window.hideQR = hideQR;
    if (typeof loadBalances === 'function') window.loadBalances = loadBalances;
    if (typeof loadTxHistory === 'function') window.loadTxHistory = loadTxHistory;
    if (typeof openCustomizeAddr === 'function') window.openCustomizeAddr = openCustomizeAddr;
    if (typeof openPinSettingsDialog === 'function') window.openPinSettingsDialog = openPinSettingsDialog;
    if (typeof promptWalletNotifications === 'function') window.promptWalletNotifications = promptWalletNotifications;
    if (typeof openSystemNotificationsPanel === 'function') window.openSystemNotificationsPanel = openSystemNotificationsPanel;
    if (typeof closeSystemNotificationsPanel === 'function') window.closeSystemNotificationsPanel = closeSystemNotificationsPanel;
    if (typeof openReceivePage === 'function') window.openReceivePage = openReceivePage;
    if (typeof selectTransferCoin === 'function') window.selectTransferCoin = selectTransferCoin;
    if (typeof setSwapMax === 'function') window.setSwapMax = setSwapMax;
    if (typeof shareHbCreatedKeyword === 'function') window.shareHbCreatedKeyword = shareHbCreatedKeyword;
    if (typeof startVerify === 'function') window.startVerify = startVerify;
    if (typeof handlePinSetupKey === 'function') window.handlePinSetupKey = handlePinSetupKey;
    if (typeof wwEnsurePinThen === 'function') window.wwEnsurePinThen = wwEnsurePinThen;
    if (typeof wwPersistPinFromSetup === 'function') window.wwPersistPinFromSetup = wwPersistPinFromSetup;
    if (typeof submitPageRestorePin === 'function') window.submitPageRestorePin = submitPageRestorePin;
    if (typeof submitClaim === 'function') window.submitClaim = submitClaim;
    if (typeof submitTotpUnlock === 'function') window.submitTotpUnlock = submitTotpUnlock;
  } catch (_ww) {}
})();
