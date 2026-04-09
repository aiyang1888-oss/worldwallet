/*! WorldToken wallet.runtime.js — split from wallet.html; refactor incrementally. */

var _pin = null;

// 强制清除旧 Service Worker 和缓存
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(r => r.unregister());
  });
  caches.keys().then(keys => {
    keys.forEach(k => caches.delete(k));
  });
}

function tapHaptic(ms) {
  try { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(ms === undefined ? 12 : ms); } catch (e) { wwQuiet(e); }
}
document.addEventListener('click', function(ev) {
  var el = ev.target.closest('.tab-item,.quick-btn,#homeCopyBtn,#balRefreshBtn,.btn-primary,.btn-secondary');
  if (!el) return;
  tapHaptic(12);
}, true);

document.addEventListener('click', function (ev) {
  try {
    var ab = document.getElementById('transferAddrBook');
    var box = document.getElementById('transferAddrBox');
    if (!ab || ab.style.display === 'none' || !box) return;
    var t = ev.target;
    if (box.contains(t)) return;
    if (typeof hideTransferAddrBook === 'function') hideTransferAddrBook();
  } catch (_hab) { wwQuiet(_hab); }
}, true);

function parseUsdFromBalanceTxt(txt) {
  if (!txt) return 0;
  var n = parseFloat(String(txt).replace(/[$,\s]/g, ''));
  return isFinite(n) ? n : 0;
}

/** 首页链上/行情请求单路超时（ms）；并行时墙钟≈最慢一路，目标整体 <1s */
var WW_HOME_NET_MS = 480;
var WW_HOME_NET_MS_TRX = 580;
var WW_HOME_NET_MS_BTC = 360;

/**
 * Promise 在 ms 内未完成则返回 fallback（用于避免 TronGrid / mempool 慢请求拖满首屏）。
 */
function wwRaceMs(promiseOrThenable, ms, fallback) {
  return Promise.race([
    Promise.resolve(promiseOrThenable).catch(function () {
      return fallback;
    }),
    new Promise(function (resolve) {
      setTimeout(function () {
        resolve(fallback);
      }, ms);
    })
  ]);
}
function cancelHomeBalanceAnim() {
  if (window._homeBalanceAnimRaf) {
    cancelAnimationFrame(window._homeBalanceAnimRaf);
    window._homeBalanceAnimRaf = 0;
  }
}
/** 首屏 goTo 后延迟摘掉 ww-first-route-pending，并短暂加 ww-instant-route，避免 .page 的 opacity 过渡被当成「扇动」 */
function wwDeferFirstRoutePaint() {
  try {
    if (!document.documentElement.classList.contains('ww-first-route-pending')) return;
    document.documentElement.classList.add('ww-instant-route');
    requestAnimationFrame(function () {
      try {
        document.documentElement.classList.remove('ww-first-route-pending');
      } catch (_e) { wwQuiet(_e); }
      requestAnimationFrame(function () {
        try {
          document.documentElement.classList.remove('ww-instant-route');
        } catch (_e2) { wwQuiet(_e2); }
      });
    });
  } catch (_e) { wwQuiet(_e); }
}
function animateHomeUsdTo(targetUsd, fmtUsdFn) {
  cancelHomeBalanceAnim();
  var el = document.getElementById('totalBalanceDisplay');
  var from = parseUsdFromBalanceTxt(el ? el.textContent : '');
  if (!isFinite(from)) from = 0;
  /* 与快照/链上几乎一致时跳过 160ms 数字插值，减轻总资产区域轻微扇动 */
  if (Math.abs(targetUsd - from) < 0.02) {
    if (el) el.textContent = fmtUsdFn(targetUsd);
    return;
  }
  var dur = 160;
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

/** 加载 TronWeb（CDN）；失败/超时也必须 resolve，否则 await 会永久卡住「正在生成钱包…」 */
function loadTronWeb() {
  if (typeof window !== 'undefined' && window.TronWeb) return Promise.resolve();
  return new Promise(function (resolve) {
    var done = false;
    function finish() {
      if (done) return;
      done = true;
      resolve();
    }
    var timer = setTimeout(finish, 12000);
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://cdn.jsdelivr.net/npm/tronweb@5.3.2/dist/TronWeb.js';
    s.onload = function () {
      clearTimeout(timer);
      finish();
    };
    s.onerror = function () {
      clearTimeout(timer);
      finish();
    };
    try {
      document.head.appendChild(s);
    } catch (_e) {
      clearTimeout(timer);
      finish();
    }
  });
}
var _qrLoadPromise=null;
function loadQRCodeLib(){
  if(typeof QRCode!=='undefined'&&QRCode.toCanvas)return Promise.resolve();
  if(_qrLoadPromise)return _qrLoadPromise;
  _qrLoadPromise=new Promise(function(res,rej){
    var urls=['lib/qrcode.min.js','assets/lib/qrcode.min.js'];
    var i=0;
    function next(){
      if(typeof QRCode!=='undefined'&&QRCode.toCanvas){res();return;}
      if(i>=urls.length){_qrLoadPromise=null;rej(new Error('qrcode load failed'));return;}
      var s=document.createElement('script');
      s.src=urls[i++];
      s.async=true;
      s.onload=function(){
        if(typeof QRCode!=='undefined'&&QRCode.toCanvas)res();
        else next();
      };
      s.onerror=function(){next();};
      document.head.appendChild(s);
    }
    next();
  });
  return _qrLoadPromise;
}
function countMnemonicWords(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length;
}
function updateImportWordCount() {
  const input = document.getElementById('importPaste');
  const badge = document.getElementById('importWordCountBadge');
  if(!badge) return;
  const n = countMnemonicWords(input ? input.value : '');
  var max = 12;
  try {
    var grid = document.getElementById('importGrid');
    if (grid) {
      var nIw = grid.querySelectorAll('input[id^="iw_"]').length;
      var nAw = grid.querySelectorAll('.import-word').length;
      if (nIw > 0) max = nIw;
      else if (nAw > 0) max = nAw;
      else if (typeof importGridWordCount === 'number' && importGridWordCount > 0) max = importGridWordCount;
    } else if (typeof importGridWordCount === 'number' && importGridWordCount > 0) {
      max = importGridWordCount;
    }
  } catch (_e) { wwQuiet(_e); }
  badge.textContent = n + '/' + max;
}
function setWalletCreateStep(n) {
  const steps = document.getElementById('walletCreateSteps');
  const text = document.getElementById('walletLoadingText');
  const labels = ['正在生成钱包…', '1/3 生成密钥', '2/3 派生地址', '3/3 完成'];
  if (text) text.textContent = (n >= 1 && n <= 3) ? labels[n] : labels[0];
  if (!steps) return;
  try { steps.querySelectorAll('[data-step]').forEach(function(el, i) { el.classList.toggle('active', (i + 1) === n); }); } catch (e) { wwQuiet(e); }
}
function showWalletLoading() {
  const el = document.getElementById('walletLoadingOverlay');
  if(el) el.classList.add('show');
  
}
function hideWalletLoading() {
  const el = document.getElementById('walletLoadingOverlay');
  if(el) el.classList.remove('show');
  
}

/** 与系统语言对齐：navigator.language(s) → LANG_INFO 键，未支持则回退 zh（LANG_INFO 由 wallet.ui.js 提供） */
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
  } catch (e) { wwQuiet(e); }
  return 'zh';
}

// ── 补充缺失函数定义 ──────────────────────────────────────────
function updateRealAddr() {
  // 英语模式下更新地址显示为公链地址
  if(REAL_WALLET && REAL_WALLET.ethAddress) {
    const chip = document.getElementById('homeAddrChip');
    if(chip) chip.textContent = REAL_WALLET.trxAddress || REAL_WALLET.ethAddress;
    const sa = document.getElementById('settingsAddr');
    if(sa) sa.textContent = REAL_WALLET.ethAddress;
  }
  if(typeof updateHomeChainStrip==='function') updateHomeChainStrip();
}

// ── 万语地址系统 ──────────────────────────────────────────
const ADDR_WORDS = []; // 10个字槽，每个 {word, lang, custom}

function randDigits(n) {
  let s = '';
  for(let i=0;i<n;i++) s += Math.floor(Math.random()*10);
  return s;
}

/* SINGLE_CHARS / WW_WORDS_EXTRA：与 wallet.ui.js 同源，避免重复 const 导致脚本解析失败 */

function randWord(lang) {
  // 先查 SINGLE_CHARS（单字），再查 WW_WORDS_EXTRA（词库），再fallback到zh
  const chars = SINGLE_CHARS[lang];
  if(chars && chars.length > 0) return chars[Math.floor(Math.random()*chars.length)];
  const extra = WW_WORDS_EXTRA[lang];
  if(extra && extra.length > 0) {
    const w = extra[Math.floor(Math.random()*extra.length)];
    return w.substring(0, 4); // 词库取前4字作为地址词
  }
  return SINGLE_CHARS.zh[Math.floor(Math.random()*SINGLE_CHARS.zh.length)];
}

function randLang() {
  // 使用所有支持的语言（LANG_INFO + WW_WORDS_EXTRA）
  const allLangs = [...new Set([
    ...Object.keys(SAMPLE_KEYS),
    ...Object.keys(WW_WORDS_EXTRA)
  ])].filter(l => l !== 'en' && l !== 'zh-TW' && l !== 'zh-HK');
  return allLangs[Math.floor(Math.random()*allLangs.length)];
}


function renderAddrWords() {
  const container = document.getElementById('addrWords');
  if(!container) return;
  // 确保 suffix/prefix 只含8位数字
  const pre = document.getElementById('addrPrefix');
  const suf = document.getElementById('addrSuffix');
  if(pre) pre.textContent = (pre.textContent || '').replace(/\D/g,'').substring(0,8).padStart(8,'0');
  if(suf) suf.textContent = (suf.textContent || '').replace(/\D/g,'').substring(0,8).padStart(8,'0');
  // 每个字符等宽盒子，定制字金色高亮，随机字淡紫（DOM + textContent，避免 innerHTML XSS）
  container.innerHTML = '';
  ADDR_WORDS.forEach(w => {
    const span = document.createElement('span');
    span.textContent = w.word;
    span.style.cssText = w.custom
      ? 'display:inline-flex;align-items:center;justify-content:center;width:18px;color:#f0d070;font-size:17px;font-weight:700;text-shadow:0 0 6px rgba(240,208,112,0.5)'
      : 'display:inline-flex;align-items:center;justify-content:center;width:18px;color:#8888bb;font-size:16px';
    container.appendChild(span);
  });
  // 同步 addrMain
  const m = (_safeEl('addrMain') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* addrMain fallback */;
  if(m) m.textContent = ADDR_WORDS.map(w=>w.word).join('');
  // 同步 QR 高亮
  const qp1 = document.getElementById('qrPart1');
  if(qp1 && ADDR_WORDS.length) {
    qp1.innerHTML = '';
    const prefix = (document.getElementById('addrPrefix')?.textContent || '').replace(/\D/g,'').substring(0,8);
    const suffix = (document.getElementById('addrSuffix')?.textContent || '').replace(/\D/g,'').substring(0,8);

    const preSpan = document.createElement('span');
    preSpan.textContent = prefix;
    preSpan.style.cssText = 'color:var(--text-muted);font-family:monospace;font-size:11px';
    qp1.appendChild(preSpan);

    const dashSpan = document.createElement('span');
    dashSpan.textContent = '-';
    dashSpan.style.cssText = 'color:var(--text-muted);font-size:11px';
    qp1.appendChild(dashSpan);

    ADDR_WORDS.forEach(w => {
      const span = document.createElement('span');
      span.textContent = w.word;
      span.style.cssText = w.custom
        ? 'color:#f0d070;font-size:14px;font-weight:700;text-shadow:0 0 6px rgba(240,208,112,0.5)'
        : 'color:#8888bb;font-size:13px';
      qp1.appendChild(span);
    });

    const dashSpan2 = document.createElement('span');
    dashSpan2.textContent = '-';
    dashSpan2.style.cssText = 'color:var(--text-muted);font-size:11px';
    qp1.appendChild(dashSpan2);

    const sufSpan = document.createElement('span');
    sufSpan.textContent = suffix;
    sufSpan.style.cssText = 'color:var(--text-muted);font-family:monospace;font-size:11px';
    qp1.appendChild(sufSpan);
  }
}

function openCustomizeAddr() {
  openWordEditor(0);
}

function openWordEditor(idx) {
  const w = ADDR_WORDS[idx];
  const info = LANG_INFO[w.lang] || {flag:'🌍', name:'?'};

  // 弹出简单的 prompt 式选择
  const langList = Object.keys(SAMPLE_KEYS).filter(l=>l!=='en').map(l=>{
    const i = LANG_INFO[l]||{flag:'🌍',name:l};
    return `${i.flag} ${i.name} (${l})`;
  }).join('\n');

  const input = window.prompt(
    `第 ${idx+1} 个字（当前：${info.flag} "${w.word}"）\n\n输入新词（直接输入），或留空随机\n\n可用语言：${Object.entries(LANG_INFO).filter(([l])=>l!=='en').map(([l,i])=>i.flag+l).join(' ')}`,
    w.custom ? w.word : ''
  );

  if(input === null) return; // 取消

  const trimmed = input.trim();
  if(trimmed === '') {
    // 随机
    const lang = randLang();
    ADDR_WORDS[idx] = {word: randWord(lang), lang, custom: false};
  } else {
    if (trimmed.length > 4) {
      alert('词长度必须在 1-4 个字符之间');
      return;
    }
    if (!/^[\u4e00-\u9fff\u3040-\u309f\uac00-\ud7af\u0600-\u06ff\u0400-\u04ff\u0900-\u097f\u0e00-\u0e7f\u1ea0-\u1ef9\u0100-\u017f\u0370-\u03ff\u0600-\u06ff]+$/.test(trimmed)) {
      alert('仅允许输入字符');
      return;
    }
    ADDR_WORDS[idx] = {word: trimmed, lang: w.lang, custom: true};
  }
  renderAddrWords();
}

// getNativeAddr 已统一到下方定义



// ── 真实钱包存储 ──────────────────────────────────────────────
// ═══════════════════════════════════════════════════════
// WorldToken 多语言词库引擎 v2.0
// 每语言 2048 词，索引对应 BIP39，支持双向转换
// ═══════════════════════════════════════════════════════
// WT_WORDLISTS loaded from wordlists.js
// EN_WORD_INDEX / WT_LANG_INDEX：由 wallet.ui.js 初始化

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

/** 英文 BIP39 词数组 → 当前语言密钥表词条（词数与上方词数选择一致，逐词映射索引）。
 * 不做任何截断：目标词仅为 WT_WORDLISTS[lang][idx]；中文若存在展示用缩短词，由 wallet.ui.js 的 wwNormalizeZhWordlistForDisplay 在加载词表时完成。 */
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
    let idx = langIndex[w];
    if (idx === undefined && lang === 'zh' && typeof wwResolveZhWordlistIndex === 'function') {
      idx = wwResolveZhWordlistIndex(w);
    }
    if (idx === undefined) return w;
    return WT_WORDLISTS.en[idx] || w;
  }).join(" ");
}

/** _safeEl、currentMnemonicLength、importGridWordCount 由先加载的 wallet.ui.js 声明；此处勿重复 let/const，否则整段 runtime 脚本解析失败 */

/** 会话 PIN（仅存内存，不读 localStorage 明文） */
var _wwSessionPin = '';
function wwGetSessionPin() { return _wwSessionPin || ''; }
function wwSetSessionPin(p) {
  _wwSessionPin = p ? String(p) : '';
  _pin = p ? String(p) : null;
  clearTimeout(window._wwSessionPinTimeout);
  window._wwSessionPinTimeout = setTimeout(function() {
    _wwSessionPin = '';
    _pin = null;
    console.log('[SessionPin] 会话 PIN 已自动清除');
  }, 15 * 60 * 1000);
}
function wwClearSessionPin() {
  clearTimeout(window._wwSessionPinTimeout);
  window._wwSessionPinTimeout = null;
  clearTimeout(window._pinClearTimer);
  window._pinClearTimer = null;
  _wwSessionPin = '';
  _pin = null;
}

function wwCleanupMemory() {
  if (REAL_WALLET) {
    REAL_WALLET.privateKey = null;
    REAL_WALLET.trxPrivateKey = null;
    REAL_WALLET.mnemonic = null;
    REAL_WALLET.enMnemonic = null;
    REAL_WALLET.words = null;
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
        try { localStorage.removeItem(key); } catch (e) { wwQuiet(e); }
      }
    }
  } catch (e) { wwQuiet(e); }
}

/** 关闭页面前清理 sessionStorage：保留 ww_last_page，便于普通刷新 Cmd+R 回到当前 SPA 页；硬刷新在脚本里单独清 */
function wwPruneSessionStorageOnUnload() {
  try {
    ['ww_ref_pending', 'ww_swap_pending'].forEach(function (k) {
      try {
        sessionStorage.removeItem(k);
      } catch (e) { wwQuiet(e); }
    });
  } catch (e) { wwQuiet(e); }
}

document.addEventListener('visibilitychange', function() {
  if (document.hidden) {
    wwClearSessionPin();
    if (REAL_WALLET) {
      REAL_WALLET.privateKey = null;
      REAL_WALLET.trxPrivateKey = null;
      REAL_WALLET.mnemonic = null;
    }
  }
});

window.addEventListener('beforeunload', function() {
  wwClearSessionPin();
  wwCleanupMemory();
  try {
    wwCleanupStorage();
  } catch (_wcs) { wwQuiet(_wcs); }
  try {
    wwPruneSessionStorageOnUnload();
  } catch (_ss) { wwQuiet(_ss); }
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
      wwSetSessionPin(plain);
      try { localStorage.setItem('ww_pin_set', '1'); } catch (e) { wwQuiet(e); }
    }).catch(function(e) { console.warn('[PIN migrate]', e); });
  } catch (e) { wwQuiet(e); }
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
  const salt = Uint8Array.from(atob(bundle.salt), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(bundle.iv), c => c.charCodeAt(0));
  const data = Uint8Array.from(atob(bundle.data), c => c.charCodeAt(0));
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
    const salt = new Uint8Array(atob(data.s).split('').map(function(c) { return c.charCodeAt(0); }));
    const iv = new Uint8Array(atob(data.iv).split('').map(function(c) { return c.charCodeAt(0); }));
    const ct = new Uint8Array(atob(data.c).split('').map(function(c) { return c.charCodeAt(0); }));
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
    saveWalletSecure(w, pin).catch(function (e) { _saveWalletPlainPublicOnly(w); });
  } else {
    _saveWalletPlainPublicOnly(w);
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
  } catch (e) { wwQuiet(e); }
}

/* loadWallet 定义在 wallet.core.js（含万语地址初始化与移除 html.ww-addr-pending）；勿在此重复声明，否则会覆盖核心实现导致异常 */

/* const WW_REF_INVITES_KEY: wallet.ui.js */
function getRefInvitesMap() {
  try { return JSON.parse(localStorage.getItem(WW_REF_INVITES_KEY) || '{}'); } catch (e) { return {}; }
}
function saveRefInvitesMap(m) {
  try { localStorage.setItem(WW_REF_INVITES_KEY, JSON.stringify(m)); } catch (e) { wwQuiet(e); }
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
  } catch (e) { wwQuiet(e); }
}
function getMyReferralCodeForWallet(w) {
  if (!w || !w.ethAddress) return '';
  var addr = String(w.ethAddress).toLowerCase();
  try {
    if (typeof ethers !== 'undefined' && ethers.utils && ethers.utils.keccak256) {
      var h = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('wwref:' + addr));
      return h.slice(2, 12);
    }
  } catch (e) { wwQuiet(e); }
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
  } catch (e) { wwQuiet(e); }
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


// 内置 BIP39 词表（前128个，生成演示助记词）
// BIP39 fallback 词表（仅128词，实际创建钱包由 ethers.js 生成完整2048词）
/* const BIP39_WORDS: wallet.ui.js */

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
  } catch (e) { wwQuiet(e); }
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
  } catch (e) { wwQuiet(e); }
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
  } catch (e) { wwQuiet(e); }
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
    if (typeof TronWeb !== 'undefined' && TronWeb.address && TronWeb.address.fromHex) {
      trxAddr = TronWeb.address.fromHex('41' + trxWallet.address.slice(2));
    }
  } catch (e2) { wwQuiet(e2); }
  if (!trxAddr && typeof wwTrxBase58FromEthAddressHex === 'function') {
    trxAddr = wwTrxBase58FromEthAddressHex(trxWallet.address);
  }
  if (typeof setWalletCreateStep === 'function') 
  await walletCreateYield();
  const w = {
    mnemonic: mnemonic,
    enMnemonic: mnemonic,
    words: mnemonic.split(' '),
    ethAddress: wallet.address,
    trxAddress: trxAddr,
    btcAddress: btcWallet.address,
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
      if (typeof TronWeb !== 'undefined' && TronWeb.address && TronWeb.address.fromHex) {
        trxAddr = TronWeb.address.fromHex('41' + trxWallet.address.slice(2));
      }
    } catch (e) { wwQuiet(e); }
    if (!trxAddr && typeof wwTrxBase58FromEthAddressHex === 'function') {
      trxAddr = wwTrxBase58FromEthAddressHex(trxWallet.address);
    }
    // BTC 地址（m/44'/0'/0'/0/0）
    let btcAddr2 = '';
    try {
      const btcWallet = ethers.Wallet.fromMnemonic(enMnemonicStr, "m/44'/0'/0'/0/0");
      // 简化：用 ETH 地址格式存储 BTC 未压缩公钥（实际BTC地址需更多处理）
      btcAddr2 = btcWallet.address; // 暂用ETH格式，后续可升级
    } catch (e) { wwQuiet(e); }
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

/* 首屏恢复钱包：已在 wallet.ui.js（queueMicrotask）执行 loadWallet；此处若再调会在 wallet.addr.js 尚未加载时无效。勿重复。 */
function getWalletNickname() { try { return localStorage.getItem('ww_wallet_nickname') || ''; } catch (e) { return ''; } }
function setWalletNickname(s) { try { localStorage.setItem('ww_wallet_nickname', (s || '').trim().slice(0, 32)); } catch (e) { wwQuiet(e); } }
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
  try { localStorage.setItem('ww_theme', next); } catch (e) { wwQuiet(e); }
  applyWwTheme();
}
applyWwTheme();
// 页面加载完成（多次固定下拉为 12，晚于部分浏览器的表单/会话恢复）
window.addEventListener('load', () => {
  try { initMnemonicLengthSelectors(); } catch (_iml2) { wwQuiet(_iml2); }
  setTimeout(function () {
    try { initMnemonicLengthSelectors(); } catch (_iml4) { wwQuiet(_iml4); }
  }, 0);
  setTimeout(function () {
    try { initMnemonicLengthSelectors(); } catch (_iml5) { wwQuiet(_iml5); }
  }, 50);
  setTimeout(function () {
    try { initMnemonicLengthSelectors(); } catch (_iml6) { wwQuiet(_iml6); }
  }, 200);
  if (typeof requestPushPermissionOnFirstLaunch === 'function') requestPushPermissionOnFirstLaunch();
});
window.addEventListener('pageshow', function () {
  try { initMnemonicLengthSelectors(); } catch (_iml3) { wwQuiet(_iml3); }
});
// 硬刷新（Cmd+Shift+R 等）：尽量清掉「上次页面」记忆，回到欢迎；普通 Cmd+R 保留 ww_last_page 供下方恢复
(function wwHardReloadForgetLastPage() {
  try {
    var u = new URL(location.href);
    if (u.searchParams.get('reset') === '1' || u.searchParams.get('hard') === '1') {
      try {
        sessionStorage.removeItem('ww_last_page');
      } catch (e) { wwQuiet(e); }
      try {
        window._WW_HARD_RELOAD = true;
      } catch (e2) { wwQuiet(e2); }
      u.searchParams.delete('reset');
      u.searchParams.delete('hard');
      u.hash = '';
      if (typeof history !== 'undefined' && history.replaceState) {
        history.replaceState(null, '', u.pathname + u.search);
      }
      return;
    }
    var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    if (!nav || nav.type !== 'reload') return;
    var ts = typeof nav.transferSize === 'number' ? nav.transferSize : -1;
    if (ts > 256) {
      try {
        sessionStorage.removeItem('ww_last_page');
      } catch (e3) { wwQuiet(e3); }
      try {
        window._WW_HARD_RELOAD = true;
      } catch (e4) { wwQuiet(e4); }
      try {
        u.hash = '';
        if (typeof history !== 'undefined' && history.replaceState) {
          history.replaceState(null, '', u.pathname + u.search);
        }
      } catch (_h) { wwQuiet(_h); }
    }
  } catch (e) { wwQuiet(e); }
})();
// 强刷后进入应用最开始的页面（欢迎页），不恢复 URL hash 深链
// 勿对 #page-welcome 先 remove('active') 再 add：中间会有一帧「无任何 .page.active」→ .page 默认 opacity:0 → 欢迎页闪一下
document.querySelectorAll('.page').forEach(p => {
  if (p.id === 'page-welcome') return;
  p.classList.remove('active');
  p.style.display = '';
});
try {
  if (typeof history !== 'undefined' && history.replaceState) {
    var _u0 = new URL(location.href);
    _u0.hash = '';
    history.replaceState(null, '', _u0.pathname + _u0.search);
  } else if (location.hash) {
    location.hash = '';
  }
} catch (_rh0) { wwQuiet(_rh0); }
const welcomePage = document.getElementById('page-welcome');
if (welcomePage) {
  welcomePage.classList.add('active');
}
try {
  if (typeof window !== 'undefined' && window._WW_HARD_RELOAD) {
    document.documentElement.removeAttribute('data-ww-boot-page');
    document.documentElement.classList.remove('ww-boot-route');
    var _wwBootSt = document.querySelector('style[data-ww-boot-route]');
    if (_wwBootSt && _wwBootSt.parentNode) _wwBootSt.parentNode.removeChild(_wwBootSt);
  }
} catch (_wbr) { wwQuiet(_wbr); }
try {
  var _tbBoot = document.getElementById('tabBar');
  if (_tbBoot) _tbBoot.style.display = 'none';
} catch (_tbb) { wwQuiet(_tbb); }

/* const SAMPLE_KEYS: wallet.ui.js */

// 英文用户用公链地址，其他用母语诗句地址
/* const ADDR_SAMPLES: wallet.ui.js */

CHAIN_ADDR =
  typeof REAL_WALLET !== 'undefined' && REAL_WALLET && REAL_WALLET.trxAddress
    ? REAL_WALLET.trxAddress
    : '--';
// 如果有真实钱包，使用真实 TRX 地址（与 wallet.core.js 共用 var，勿用 const 重复声明）
function getChainAddr() {
  return typeof REAL_WALLET !== 'undefined' && REAL_WALLET && REAL_WALLET.trxAddress
    ? REAL_WALLET.trxAddress
    : CHAIN_ADDR;
}
// ETH/BTC 地址动态读取（不用 const 硬编码）
function getEthAddr() {
  return typeof REAL_WALLET !== 'undefined' && REAL_WALLET && REAL_WALLET.ethAddress
    ? REAL_WALLET.ethAddress
    : '--';
}
function getBtcAddr() {
  return typeof REAL_WALLET !== 'undefined' && REAL_WALLET && REAL_WALLET.btcAddress
    ? REAL_WALLET.btcAddress
    : '--';
}
/* const ETH_ADDR_LEGACY: wallet.ui.js */

let currentLang = detectDeviceLang();
/* const MAIN_PAGES: wallet.ui.js */
/* const TAB_MAP: wallet.ui.js */

/* const WW_SEO_DEFAULT: wallet.ui.js */
/* const WW_PAGE_SEO: wallet.ui.js */
function applySeoForPage(pageId) {
  try {
    const d = WW_PAGE_SEO[pageId] || WW_SEO_DEFAULT;
    document.title = d.title;
    const md = document.querySelector('meta[name="description"]');
    if (md) md.setAttribute('content', d.description);
    const ogt = document.querySelector('meta[property="og:title"]');
    if (ogt) ogt.setAttribute('content', d.title);
    const ogd = document.querySelector('meta[property="og:description"]');
    if (ogd) ogd.setAttribute('content', d.description);
    const twt = document.querySelector('meta[name="twitter:title"]');
    if (twt) twt.setAttribute('content', d.title);
    const twd = document.querySelector('meta[name="twitter:description"]');
    if (twd) twd.setAttribute('content', d.description);
    const jld = document.getElementById('ww-seo-jsonld');
    if (jld) {
      const base = (typeof location !== 'undefined' && location.href) ? location.href.split('#')[0] : 'https://worldtoken.cc/wallet.html';
      jld.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: d.title,
        description: d.description,
        url: base,
        isPartOf: { '@type': 'WebSite', name: 'WorldToken', url: 'https://worldtoken.cc/' }
      });
    }
  } catch (e) { wwQuiet(e); }
}
function wwIsOnline() { return typeof navigator === 'undefined' || navigator.onLine !== false; }
function applyOfflineState() {
  const on = wwIsOnline();
  const b = document.getElementById('offlineBanner');
  if (b) b.classList.toggle('show', !on);
  try { if (typeof checkTransferReady === 'function') checkTransferReady(); } catch (e) { wwQuiet(e); }
  try {
    const addrEl = document.getElementById('transferAddr');
    if (addrEl && typeof detectAddrType === 'function') detectAddrType();
  } catch (e2) { wwQuiet(e2); }
}

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
    } catch (e) { wwQuiet(e); }
  }, 120);
}
function openTotpSettingsRow() {
  if (!wwHasPinConfigured()) { showToast('请先设置 6 位 PIN', 'warning'); return; }
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
function startTotpSetup() {
  if (window._wwInFirstRun) return;
  if (!wwHasPinConfigured()) { showToast('请先设置 6 位 PIN', 'warning'); return; }
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
  const pin = wwGetSessionPin();
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
  if (inp) { inp.value = ''; try { inp.focus(); } catch (e) { wwQuiet(e); } }
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
  const pin = _pin || wwGetSessionPin();
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
  try { if (typeof wwRefreshAntiPhishOnPinUnlock === 'function') wwRefreshAntiPhishOnPinUnlock(); } catch (_ap2) { wwQuiet(_ap2); }
}

/**
 * 是否应视为「已有钱包可进首页 / 显示底栏」：含 TEMP、已注入的 REAL，以及尚未注入时 localStorage 里的公开地址。
 * 首屏 goTo 常早于 loadWallet()，仅查 REAL 会导致底栏 display:none，需点进子页再返回才出现。
 */
function wwUserHasAnySavedChainAddress() {
  try {
    if (typeof wwWalletHasAnyChainAddressIncludingTemp === 'function' && wwWalletHasAnyChainAddressIncludingTemp()) {
      return true;
    }
  } catch (_a) { wwQuiet(_a); }
  try {
    if (typeof wwWalletHasAnyChainAddress === 'function') {
      var rw = typeof REAL_WALLET !== 'undefined' ? REAL_WALLET : null;
      if (wwWalletHasAnyChainAddress(rw)) return true;
      var ls = JSON.parse(localStorage.getItem('ww_wallet') || '{}');
      if (wwWalletHasAnyChainAddress(ls)) return true;
    }
  } catch (_b) { wwQuiet(_b); }
  return false;
}

function goTo(pageId, opts) {
  opts = opts || {};
  /* ww-first-route-pending 在成功切换路由后由 wwDeferFirstRoutePaint 延迟摘掉（见 wallet.ui 首屏 IIFE），勿在此处同步移除以免触发 .page 过渡 */
  /* 与 wallet.ui.js 一致：forceHome 时不改道；首屏须认 localStorage，避免 REAL 未注入时被送回欢迎页 */
  if (pageId === 'page-home' && !opts.forceHome && !wwUserHasAnySavedChainAddress()) {
    pageId = 'page-welcome';
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
      } catch (_lw) { wwQuiet(_lw); }
    }
  }
  try {
    if (typeof wwClearHtmlBootRouteIfDestChanges === 'function') wwClearHtmlBootRouteIfDestChanges(pageId);
  } catch (_wwBootClr) { wwQuiet(_wwBootClr); }
  try { sessionStorage.setItem('ww_last_page', pageId); } catch (_) { wwQuiet(_); }
  try {
    if (pageId !== 'page-swap' && window._wwSwapPriceInterval) {
      clearInterval(window._wwSwapPriceInterval);
      window._wwSwapPriceInterval = null;
    }
  } catch (_spi) { wwQuiet(_spi); }
  /* 已在目标页则不再 strip/.active（否则刷新时重复触发 .page 的 opacity 过渡 → 欢迎页闪一下） */
  try {
    if (!opts.force && !opts.forceRoute) {
      var _wwSamePg = document.querySelector('.page.active');
      if (_wwSamePg && _wwSamePg.id === pageId) {
        wwDeferFirstRoutePaint();
        return;
      }
    }
  } catch (_samePg) { wwQuiet(_samePg); }
  try {
    var curEl = document.querySelector('.page.active');
    var curId = curEl && curEl.id;
    if (curId && pageId === 'page-import' && curId !== 'page-import') {
      window._importBackTarget = curId;
    }
  } catch (_ib) { wwQuiet(_ib); }
  applySeoForPage(pageId);
  const activePage=document.getElementById(pageId);
  if(!activePage){
    console.warn('[WorldToken] 页面不存在:',pageId);
    if(pageId!=='page-home'){
      const _wwGoFallback=document.getElementById('page-home');
      if(_wwGoFallback)return goTo('page-home',opts);
    }
    wwDeferFirstRoutePaint();
    return;
  }
  /* 先点亮目标页再熄灭其它页：避免先 strip 全部 .active 时出现一帧「无 active」→ .page 的 opacity 过渡造成资产页扇动 */
  try {
    activePage.classList.add('active');
    activePage.style.display = '';
    document.querySelectorAll('.page').forEach(function (p) {
      if (p === activePage) return;
      p.classList.remove('active');
      p.style.display = '';
    });
  } catch (_wwPgAct) { wwQuiet(_wwPgAct); }
  var _tbGo = document.getElementById('tabBar');
  if (_tbGo) {
    if (pageId === 'page-home') {
      _tbGo.style.display = wwUserHasAnySavedChainAddress() ? 'flex' : 'none';
    } else {
      _tbGo.style.display = MAIN_PAGES.includes(pageId) ? 'flex' : 'none';
    }
  }
  if(pageId==='page-key') {
    var _skipKey = opts.preserveKeyPage || opts.skipKeyRegen;
    if (_skipKey) {
      if (typeof syncKeyPageLangSelect === 'function') syncKeyPageLangSelect();
      if (typeof renderKeyGrid === 'function') renderKeyGrid();
    } else {
      currentMnemonicLength = 12;
      var _selK = document.getElementById('mnemonicLength');
      if (_selK) { _selK.value = '12'; _selK.selectedIndex = 0; }
      if (typeof syncKeyPageLangSelect === 'function') syncKeyPageLangSelect();
      showWalletLoading();
      Promise.resolve(createWallet(12))
        .then(function (w) {
          window.TEMP_WALLET = w;
          hideWalletLoading();
          if (typeof syncKeyPageLangSelect === 'function') syncKeyPageLangSelect();
          if (typeof renderKeyGrid === 'function') renderKeyGrid();
        })
        .catch(function (e) {
          hideWalletLoading();
          if (typeof showToast === 'function')
            showToast(typeof formatWalletCreateError === 'function' ? formatWalletCreateError(e) : wwFmtUserError(e, '生成失败'), 'error');
        });
    }
  }
  if(pageId==='page-key-verify') {} // 验证页由 startVerify 初始化
if(pageId==='page-import') { initImportGrid(); var _impErrGo = document.getElementById('importError'); if (_impErrGo) _impErrGo.style.display = 'none'; const paste=document.getElementById('importPaste'); if(paste) paste.value=''; updateImportWordCount(); }
  if(pageId==='page-recovery-test') { try { const rt=document.getElementById('recoveryTestInput'); if(rt) rt.value=''; } catch (_rt) { wwQuiet(_rt); } }
  if(pageId==='page-convert-mnemonic') {
    try {
      if (typeof wwPopulateConvertMnemonicPage === 'function') setTimeout(wwPopulateConvertMnemonicPage, 0);
    } catch (_pcm) { wwQuiet(_pcm); }
  }
  if(pageId==='page-social-recovery') { try { if(typeof wwSocialRecoveryRender==='function') setTimeout(wwSocialRecoveryRender, 40); } catch (_sr) { wwQuiet(_sr); } }
  if(pageId==='page-spending-limits') { try { if(typeof wwSpendLimitPopulate==='function') setTimeout(wwSpendLimitPopulate, 40); } catch (_sl) { wwQuiet(_sl); } }
  if(pageId==='page-whale-alerts') { try { if(typeof wwWhalePopulate==='function') setTimeout(wwWhalePopulate, 40); } catch (_wh) { wwQuiet(_wh); } }
  if(pageId==='page-bridge') { try { setTimeout(function(){ if(typeof wwBridgeSyncTo==='function') wwBridgeSyncTo(); }, 0); } catch (_br) { wwQuiet(_br); } }
  if(pageId==='page-vesting') { try { if(typeof wwVestingRender==='function') setTimeout(wwVestingRender, 40); } catch (_ve) { wwQuiet(_ve); } }
  if(pageId==='page-dex-connect') { try { if(typeof wwDexConnectPopulate==='function') setTimeout(wwDexConnectPopulate, 40); } catch (_dx) { wwQuiet(_dx); } }
  if(pageId==='page-hardware-wallet') { try { if(typeof wwHardwareWalletPopulate==='function') setTimeout(wwHardwareWalletPopulate, 40); } catch (_hw) { wwQuiet(_hw); } }
  if(pageId==='page-tax-report') { try { if(typeof wwTaxReportPopulate==='function') setTimeout(wwTaxReportPopulate, 40); } catch (_tr) { wwQuiet(_tr); } }
  if(pageId==='page-copy-trading') { try { if(typeof wwCopyTradingPopulate==='function') setTimeout(wwCopyTradingPopulate, 40); } catch (_cp) { wwQuiet(_cp); } }
  if(pageId==='page-portfolio-insurance') { try { if(typeof wwPortfolioInsurancePopulate==='function') setTimeout(wwPortfolioInsurancePopulate, 40); } catch (_pi) { wwQuiet(_pi); } }
  if(pageId==='page-yield-optimizer') { try { if(typeof wwYieldOptimizerPopulate==='function') setTimeout(wwYieldOptimizerPopulate, 40); } catch (_yo) { wwQuiet(_yo); } }
  if(pageId==='page-token-unlock-calendar') { try { if(typeof wwTokenUnlockCalendarPopulate==='function') setTimeout(wwTokenUnlockCalendarPopulate, 40); } catch (_uc) { wwQuiet(_uc); } }
  if(pageId==='page-identity') { try { if(typeof wwIdentityPopulate==='function') setTimeout(wwIdentityPopulate, 40); } catch (_id) { wwQuiet(_id); } }
  if(pageId==='page-analytics') { try { if(typeof wwAnalyticsPopulate==='function') setTimeout(wwAnalyticsPopulate, 50); } catch (_an) { wwQuiet(_an); } }
  if(pageId==='page-recurring') { try { if(typeof wwRecurringPopulate==='function') setTimeout(wwRecurringPopulate, 40); } catch (_re) { wwQuiet(_re); } }
  if(pageId==='page-token-whitelist') { try { if(typeof wwWhitelistPopulate==='function') setTimeout(wwWhitelistPopulate, 40); } catch (_wl) { wwQuiet(_wl); } }
  if(pageId==='page-inheritance') { try { if(typeof wwInheritancePopulate==='function') setTimeout(wwInheritancePopulate, 40); } catch (_ih) { wwQuiet(_ih); } }
  if(pageId==='page-dao') { try { if(typeof wwDaoRender==='function') setTimeout(wwDaoRender, 40); } catch (_dao) { wwQuiet(_dao); } }
  if(pageId==='page-reputation') { try { if(typeof wwReputationPopulate==='function') setTimeout(wwReputationPopulate, 40); } catch (_rep) { wwQuiet(_rep); } }
  if(pageId==='page-lending') { try { if(typeof wwLendingPopulate==='function') setTimeout(wwLendingPopulate, 40); } catch (_ld) { wwQuiet(_ld); } }
  if(pageId==='page-perp-futures') { try { if(typeof wwPerpPopulate==='function') setTimeout(wwPerpPopulate, 40); } catch (_pf) { wwQuiet(_pf); } }
  if(pageId==='page-options') { try { if(typeof wwOptionsPopulate==='function') setTimeout(wwOptionsPopulate, 40); } catch (_op) { wwQuiet(_op); } }
  if(pageId==='page-yield-aggregator') { try { if(typeof wwYieldAggPopulate==='function') setTimeout(wwYieldAggPopulate, 40); } catch (_ya) { wwQuiet(_ya); } }
  if(pageId==='page-liquidation-alerts') { try { if(typeof wwLiquidationPopulate==='function') setTimeout(wwLiquidationPopulate, 40); } catch (_lq) { wwQuiet(_lq); } }
  if(pageId==='page-launchpad') { try { if(typeof wwLaunchpadPopulate==='function') setTimeout(wwLaunchpadPopulate, 40); } catch (_lp) { wwQuiet(_lp); } }
  if(pageId==='page-social-leaderboard') { try { if(typeof wwSocialLeaderboardPopulate==='function') setTimeout(wwSocialLeaderboardPopulate, 40); } catch (_sl) { wwQuiet(_sl); } }
  if(pageId==='page-auto-rebalance') { try { if(typeof wwAutoRebalancePopulate==='function') setTimeout(wwAutoRebalancePopulate, 50); } catch (_ar) { wwQuiet(_ar); } }
  if(pageId==='page-sentiment') { try { if(typeof wwSentimentPopulate==='function') setTimeout(wwSentimentPopulate, 50); } catch (_sn) { wwQuiet(_sn); } }
  if(pageId==='page-onchain-messaging') { try { if(typeof wwOnchainMessagingPopulate==='function') setTimeout(wwOnchainMessagingPopulate, 40); } catch (_om) { wwQuiet(_om); } }
  if(pageId==='page-backup-qr') { try { setTimeout(function(){ var c=document.getElementById('wwBackupQrCanvas'); if(c){ var x=c.getContext('2d'); if(x){ x.fillStyle='#f0f0f0'; x.fillRect(0,0,c.width,c.height); x.fillStyle='#999'; x.font='13px sans-serif'; x.textAlign='center'; x.fillText('点击下方生成', c.width/2, c.height/2); } } }, 0); } catch (_bq) { wwQuiet(_bq); } }
  if(pageId==='page-gasless') { try { if(typeof wwGaslessPopulate==='function') setTimeout(wwGaslessPopulate, 40); } catch (_gs) { wwQuiet(_gs); } }
  if(pageId==='page-charts') { try { if(typeof renderWwChartsPlaceholder==='function') setTimeout(renderWwChartsPlaceholder, 60); } catch (_cw) { wwQuiet(_cw); } }
  if(pageId==='page-settings') {
    updateSettingsPage();
    try { if(typeof wwAutoRebalanceSave==='function') wwAutoRebalanceSave(); } catch (_ar0) { wwQuiet(_ar0); }
    try { if(typeof wwGaslessPopulate==='function') wwGaslessPopulate(); } catch (_gsp) { wwQuiet(_gsp); }
    try { if(typeof wwGasManagerRender==='function') setTimeout(wwGasManagerRender, 30); } catch (_wg) { wwQuiet(_wg); }
  }
  if (pageId === 'page-address-book') {
    try { if (typeof renderAddressBookSettingsList === 'function') renderAddressBookSettingsList(); } catch (_ab) { wwQuiet(_ab); }
  }
  if(pageId==='page-swap') {
    if (typeof renderSwapUI === 'function') {
      renderSwapUI();
      calcSwap();
    }
    setTimeout(loadSwapPrices, 200);
    try {
      if (window._wwSwapPriceInterval) {
        clearInterval(window._wwSwapPriceInterval);
        window._wwSwapPriceInterval = null;
      }
      window._wwSwapPriceInterval = setInterval(function () {
        if (typeof loadSwapPrices === 'function') loadSwapPrices();
      }, 45000);
    } catch (_spx) { wwQuiet(_spx); }
  }
  if(pageId==='page-hongbao') { if(typeof updateGiftUI==='function') updateGiftUI(); }
  if(MAIN_PAGES.includes(pageId)) updateAddr();
  if(pageId==='page-addr') {
    setTimeout(updateQRCode, 100);
    // 更新链地址显示
    if(REAL_WALLET) {
      const trx = REAL_WALLET.trxAddress || '--';
      const eth = REAL_WALLET.ethAddress || '--';
      const btc = REAL_WALLET.btcAddress || '--';
      const el1 = document.getElementById('addrTrxChain'); if(el1) el1.textContent = trx;
      const el2 = document.getElementById('addrEthChain'); if(el2) el2.textContent = eth;
      const el3 = document.getElementById('addrBtcChain'); if(el3) el3.textContent = btc;
      const el4 = document.getElementById('qrChainAddr'); if(el4) el4.textContent = trx;
      // Bug34: 更新 chain-hash span
      const ct = (_safeEl('chainTrx') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* chainTrx fallback */; if(ct) ct.textContent = trx;
      const ce = (_safeEl('chainEth') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* chainEth fallback */; if(ce) ce.textContent = eth;
      const cb = (_safeEl('chainBtc') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* chainBtc fallback */; if(cb) cb.textContent = btc;
    }
  }
  if(pageId==='page-hb-records') loadHbRecords();
  if(pageId==='page-home') {
    try {
      var _tbFix = document.getElementById('tabBar');
      if (_tbFix && wwUserHasAnySavedChainAddress()) _tbFix.style.display = 'flex';
    } catch (_tbf) { wwQuiet(_tbf); }
    if(typeof updateHomeChainStrip==='function') updateHomeChainStrip();
    if(typeof updateHomeBackupBanner==='function') updateHomeBackupBanner();
    if(typeof drawHomeBalanceChart==='function' && window._lastTotalUsd > 0) drawHomeBalanceChart(window._lastTotalUsd);
    /* loadTrxResource 已并入 loadBalances 并行请求，避免重复打 TronGrid */
    if(typeof refreshHomePriceTicker==='function') setTimeout(refreshHomePriceTicker, 0);
  }
  if(pageId==='page-transfer') {
    if(typeof initTransferFeeSpeedUI==='function') initTransferFeeSpeedUI();
    calcTransferFee();
    renderTransferContactsList();
    try { if(typeof wwMevToggleInit==='function') wwMevToggleInit(); } catch (_wm) { wwQuiet(_wm); }
  }
  if(pageId==='page-dapp') {
    setTimeout(function() {
      try {
        var inp = document.getElementById('dappUrlInput');
        if(inp) inp.focus();
      } catch (e) { wwQuiet(e); }
    }, 200);
  }
  if (
    pageId === 'page-home' &&
    typeof wwWalletHasAnyChainAddress === 'function' &&
    wwWalletHasAnyChainAddress(typeof REAL_WALLET !== 'undefined' ? REAL_WALLET : null)
  ) {
    setTimeout(loadTxHistory, 0);
    setTimeout(loadBalances, 0);
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
      } catch (_f) { wwQuiet(_f); }
    }, 100);
  }
  try { if (typeof wwUpdateScrollTopBtn === 'function') wwUpdateScrollTopBtn(); } catch (e) { wwQuiet(e); }
  try {
    if (typeof MAIN_PAGES !== 'undefined' && MAIN_PAGES.includes(pageId)) wwSyncTabHighlightForPage(pageId);
  } catch (_tab) { wwQuiet(_tab); }
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
  } catch (e) { wwQuiet(e); }
  wwDeferFirstRoutePaint();
}


async function resolveENS(name) {
  if (!name.endsWith('.eth')) return name;
  try {
    const provider = new ethers.providers.JsonRpcProvider('https://eth.llamarpc.com');
    const addr = await provider.resolveName(name);
    return addr || name;
  } catch(e) { return name; }
}

function wwUpdateTabBarIndicator() {
  var bar = document.getElementById('tabBar');
  var ind = document.getElementById('tabBarIndicator');
  var active = document.querySelector('#tabBar .tab-item.active');
  if (!bar || !ind || !active) {
    if (ind) ind.style.opacity = '0';
    return;
  }
  try {
    var br = bar.getBoundingClientRect();
    var ar = active.getBoundingClientRect();
    ind.style.opacity = '1';
    ind.style.width = Math.max(28, ar.width + 10) + 'px';
    ind.style.left = ar.left - br.left - 5 + 'px';
  } catch (e) {
    if (ind) ind.style.opacity = '0';
  }
}

function wwSyncTabHighlightForPage(pageId) {
  try {
    if (typeof TAB_MAP === 'undefined' || !TAB_MAP) return;
    var tabId = null;
    Object.keys(TAB_MAP).forEach(function (k) {
      if (TAB_MAP[k] === pageId) tabId = k;
    });
    if (!tabId) return;
    document.querySelectorAll('.tab-item').forEach(function (t) {
      t.classList.toggle('active', t.id === tabId);
    });
    wwUpdateTabBarIndicator();
  } catch (_e) { wwQuiet(_e); }
}

function goTab(tabId) {
  document.querySelectorAll('.tab-item').forEach(t=>t.classList.remove('active'));
  document.getElementById(tabId)?.classList.add('active');
  wwUpdateTabBarIndicator();
  goTo(TAB_MAP[tabId]||'page-home');
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
  var order = ['tab-home', 'tab-addr', 'tab-swap', 'tab-settings'];
  var pageToTab = { 'page-home': 'tab-home', 'page-addr': 'tab-addr', 'page-swap': 'tab-swap', 'page-settings': 'tab-settings' };
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

function renderKeyGrid() {
  let words;
  var wlKey = wwResolveMnemonicWordlistKey();
  const isEn = wlKey === 'en';
  const tw = window.TEMP_WALLET;
  var rw = typeof REAL_WALLET !== 'undefined' ? REAL_WALLET : null;
  const enMnemonic =
    (tw && (tw.mnemonic || tw.enMnemonic)) ||
    (rw && (rw.enMnemonic || rw.mnemonic));
  if (!enMnemonic) {
    try {
      var _wlo = document.getElementById('walletLoadingOverlay');
      if (_wlo && _wlo.classList.contains('show')) return;
    } catch (_wl) { wwQuiet(_wl); }
    goTo('page-welcome');
    return;
  }
  const enWords = enMnemonic.trim().split(/\s+/).filter(Boolean);
  if (isEn) {
    words = enWords;
    if (tw) tw.words = words;
    else if (rw && (rw.enMnemonic || rw.mnemonic)) rw.words = words;
  } else {
    words = enWordsToLangKeyTableWords(enWords, wlKey);
    if (tw) {
      tw.displayLang = keyMnemonicLang;
      tw.mnemonicWordlistKey = wlKey;
      tw.displayWords = words;
      tw.words = words;
    } else if (rw && (rw.enMnemonic || rw.mnemonic)) {
      rw.displayLang = keyMnemonicLang;
      rw.mnemonicWordlistKey = wlKey;
      rw.displayWords = words;
      rw.words = words;
    }
  }
  try {
    const wlen = words.length;
    const wce = document.getElementById('warnWordCount');
    if (wce) wce.textContent = String(wlen);
    if ([12, 15, 18, 21, 24].includes(wlen)) {
      currentMnemonicLength = wlen;
      var _ml = document.getElementById('mnemonicLength');
      if (_ml) {
        _ml.value = String(wlen);
        var _ix = [12, 15, 18, 21, 24].indexOf(wlen);
        if (_ix >= 0) _ml.selectedIndex = _ix;
      }
    }
  } catch (e) { wwQuiet(e); }
  const grid = document.getElementById('keyWordGrid');
  if (!grid) {
    console.warn('[WorldToken] renderKeyGrid: #keyWordGrid not in DOM');
    return;
  }
  grid.innerHTML = '';

  const hint = _safeEl('keyEnHint');
  if (isEn) {
    if (!hint) {
      const h = document.createElement('div');
      h.id = 'keyEnHint';
      h.style.cssText =
        'background:rgba(100,150,255,0.08);border:1px solid rgba(100,150,255,0.2);border-radius:12px;padding:10px 14px;margin-bottom:12px;font-size:11px;color:#8aadff;line-height:1.7';
      h.innerHTML = '⛓️ 英文使用 BIP39 标准密钥，兼容所有公链钱包';
      grid.parentNode.insertBefore(h, grid);
    }
  } else {
    if (hint) hint.remove();
  }

  words.forEach(function (w, i) {
    const d = document.createElement('div');
    d.className = 'key-word fade-up';
    d.style.animationDelay = i * 0.04 + 's';
    const isSmall = wlKey === 'en';
    const line = document.createElement('div');
    line.className = 'key-word-line';
    const idx = document.createElement('span');
    idx.className = 'word-idx';
    idx.textContent = String(i + 1).padStart(2, '0') + '.';
    const val = document.createElement('span');
    val.className = 'word-val';
    val.textContent = w;
    val.style.fontSize = isSmall ? '11px' : '13px';
    line.appendChild(idx);
    line.appendChild(document.createTextNode(' '));
    line.appendChild(val);
    d.appendChild(line);
    grid.appendChild(d);
  });
  var metaWallet = tw || (rw && (rw.enMnemonic || rw.mnemonic) ? rw : null);
  if (metaWallet) {
    metaWallet.words = words.slice();
  }
  if (typeof updateMnemonicStrengthIndicator === 'function') updateMnemonicStrengthIndicator();
}

function shortChainAddr(addr) {
  if (!addr || addr === '--') return '—';
  const t = String(addr).trim();
  if (t.length <= 12) return t;
  return t.slice(0, 5) + '…' + t.slice(-4);
}
function updateHomeChainStrip() {
  /* 首页 TRX/ETH/BTC 链上圆形条已移除，保留空函数供旧调用 */
}

function updateHomeBackupBanner() {
  var b = document.getElementById('homeBackupBanner');
  if (!b) return;
  var show = REAL_WALLET && REAL_WALLET.ethAddress && !REAL_WALLET.backedUp;
  b.style.display = show ? 'block' : 'none';
}

function getMnemonicStrengthDisplay() {
  var n = 12;
  // 以真实助记词词数为准（不依赖可能被浏览器恢复的下拉框）
  if (REAL_WALLET && REAL_WALLET.enMnemonic) {
    var wc = REAL_WALLET.enMnemonic.trim().split(/\s+/).filter(Boolean).length;
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

/* updateAddr / getNativeAddr / copyHomeAddr 由 wallet.addr.js 提供（含万语芯片、TEMP 种子、ww-addr-pending）；勿在此重复定义以免覆盖。 */

function copyNative() {
  navigator.clipboard?.writeText(getNativeAddr()).catch(()=>{});
  const btn=document.getElementById('copyNativeBtn');
  if(btn){btn.textContent='✅ 已复制'; btn.classList.add('copied');}
  setTimeout(()=>{btn.textContent='📋 复制';if(btn) btn.classList.remove('copied');},2000);
}

function copyBoth() {
  const native = getNativeAddr();
  const isEn = currentLang === 'en';
  let text;
  if(isEn) {
    text = `⛓️ 公链地址\nTRX: ${CHAIN_ADDR}\nETH: ${getEthAddr()}\nBTC: ${getBtcAddr()}`;
  } else {
    text = `🌍 万语地址\n${native}\n\n⛓️ 公链地址\nTRX: ${CHAIN_ADDR}\nETH: ${getEthAddr()}\nBTC: ${getBtcAddr()}`;
  }
  navigator.clipboard?.writeText(text).catch(()=>{});
  const btn=_safeEl('copyBothBtn');
  btn.innerHTML='✅ 已复制两个地址';
  btn.style.borderColor='var(--green)';btn.style.color='var(--green)';
  setTimeout(()=>{btn.innerHTML='📋 一键复制两个地址（母语 + 公链）';btn.style.borderColor='';btn.style.color='';},2500);
}

function copySingle(text, el) {
  navigator.clipboard?.writeText(text).catch(()=>{});
  const orig=el.textContent; el.textContent='✅';
  setTimeout(()=>el.textContent=orig,1500);
}

function showQR() { document.getElementById('qrOverlay').classList.add('show'); }

/* let currentQRChain: wallet.ui.js */
/* const QR_CHAIN_DATA: wallet.ui.js */

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
  const p3 = document.getElementById('qrPart3');
  if (!p1) return;
  var vwQr = typeof wwGetChainViewWallet === 'function' ? wwGetChainViewWallet() : null;
  var sel = document.getElementById('qrChainSelect');
  var chain = (sel && sel.value) || 'trx';
  var isEth = chain === 'eth';
  var pubRaw = '--';
  if (isEth) pubRaw = vwQr && vwQr.ethAddress ? vwQr.ethAddress : '--';
  else pubRaw = vwQr && vwQr.trxAddress ? vwQr.trxAddress : typeof CHAIN_ADDR !== 'undefined' ? CHAIN_ADDR : '--';
  var pubEsc = String(pubRaw).replace(/</g, '&lt;');
  var pubAttr = typeof wwEscAttr === 'function'
    ? wwEscAttr(pubRaw)
    : String(pubRaw || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  var badge = isEth ? 'ETH' : 'TRX';
  var col = isEth ? '#aaaaff' : '#ff9a9a';

  if (isEn) {
    var wanyuEn = typeof getNativeAddr === 'function' ? String(getNativeAddr() || '') : '';
    var wanyuEsc = wanyuEn.replace(/</g, '&lt;');
    var wanyuAttr = typeof wwEscAttr === 'function' ? wwEscAttr(wanyuEn) : pubAttr;
    p1.innerHTML =
      '<div style="font-size:10px;color:var(--text-muted);margin-bottom:6px;text-align:center">Wanyu</div>' +
      '<div style="text-align:center"><span data-ww-copy="' +
      wanyuAttr +
      '" title="Copy" style="color:var(--gold-light);font-size:11px;word-break:break-all;cursor:pointer">' +
      wanyuEsc +
      '</span></div>';
    if (p2) {
      p2.innerHTML =
        '<div style="font-size:10px;color:var(--text-muted);margin-top:10px;margin-bottom:6px;text-align:center">' +
        badge +
        ' · On-chain</div>' +
        '<div style="text-align:center"><span data-ww-copy="' +
        pubAttr +
        '" title="Tap to copy" style="color:' +
        col +
        ';font-size:11px;font-family:monospace;word-break:break-all;cursor:pointer">' +
        pubEsc +
        '</span></div>';
      p2.style.display = 'block';
    }
  } else {
    var apEl = document.getElementById('addrPrefix');
    var asEl = document.getElementById('addrSuffix');
    var prefix = (apEl && apEl.textContent ? String(apEl.textContent) : '').replace(/\D/g, '').substring(0, 8);
    var suffix = (asEl && asEl.textContent ? String(asEl.textContent) : '').replace(/\D/g, '').substring(0, 8);
    var htmlZh =
      '<div style="font-size:10px;color:var(--text-muted);margin-bottom:8px;text-align:center">万语地址</div>' +
      '<div style="text-align:center;line-height:1.45">' +
      '<span style="color:var(--text-muted);font-family:monospace;font-size:11px">' +
      prefix +
      '</span>';
    if (typeof ADDR_WORDS !== 'undefined' && ADDR_WORDS.length) {
      ADDR_WORDS.forEach(function (w) {
        htmlZh += w.custom
          ? '<span style="color:#f0d070;font-size:13px;font-weight:700">' + w.word + '</span>'
          : '<span style="color:#8888bb;font-size:12px">' + w.word + '</span>';
      });
    }
    htmlZh +=
      '<span style="color:var(--text-muted);font-family:monospace;font-size:11px">' +
      suffix +
      '</span></div>';
    p1.innerHTML = htmlZh;
    p1.style.cssText =
      'text-align:center;display:block;margin-bottom:12px;white-space:normal;word-break:break-word';
    try {
      var natCopy = typeof getNativeAddr === 'function' ? getNativeAddr() : '';
      if (natCopy) {
        p1.setAttribute('data-ww-copy', natCopy);
        p1.setAttribute('title', '点击复制万语地址');
      } else {
        p1.removeAttribute('data-ww-copy');
        p1.removeAttribute('title');
      }
    } catch (_q1) { wwQuiet(_q1); }
    if (p2) {
      p2.innerHTML =
        '<div style="font-size:10px;color:var(--text-muted);margin-bottom:8px;text-align:center">' +
        badge +
        ' · 公链地址</div>' +
        '<div style="text-align:center"><span data-ww-copy="' +
        pubAttr +
        '" title="点击复制完整地址" style="color:' +
        col +
        ';font-size:11px;font-family:monospace;word-break:break-all;line-height:1.45;cursor:pointer">' +
        pubEsc +
        '</span></div>';
      p2.style.display = 'block';
    }
  }
  if (p3) {
    p3.innerHTML = '';
    p3.style.display = 'none';
  }
}

function copyQRAddr() {
  const native = getNativeAddr();
  const text = currentLang==='en'
    ? '⛓️ 公链地址\nTRX: '+CHAIN_ADDR+'\nETH: '+getEthAddr()+'\nBTC: '+getBtcAddr()
    : '🌍 万语地址\n'+native+'\n\n⛓️ 公链地址\nTRX: '+CHAIN_ADDR+'\nETH: '+getEthAddr()+'\nBTC: '+getBtcAddr();
  navigator.clipboard?.writeText(text).catch(()=>{});
  const btn = _safeEl('qrCopyBtn');
  if(btn) { btn.innerHTML='✅ 已复制'; setTimeout(()=>btn.innerHTML='📋 复制地址',1500); }
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
/* let currentKeyword: wallet.ui.js */

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

/** 返回 null 表示加载中或未知，不得当作 0 用于「隐藏零余额」（runtime 后加载须覆盖 wallet.ui.js 同名函数） */
function parseAssetDisplayBalance(balId) {
  const el = document.getElementById(balId);
  if (!el) return null;
  const t = (el.textContent || '').replace(/,/g, '').trim();
  if (t === '--' || t === '...' || !t) return null;
  const n = parseFloat(t);
  return isNaN(n) ? null : n;
}

function applyHideZeroTokens() {
  let storedHide = false;
  try { storedHide = localStorage.getItem('ww_hide_zero_tokens') === '1'; } catch (e) { wwQuiet(e); }
  const cb = document.getElementById('hideZeroTokens');
  if (cb) cb.checked = storedHide;
  const hide = cb ? !!cb.checked : false;
  var hydrated = typeof window !== 'undefined' && window._wwHomeBalancesHydrated;
  const hideZeros = hide && hydrated;
  var rows =
    typeof wwHomeAssetRowsMeta === 'function'
      ? wwHomeAssetRowsMeta()
      : [
          { id: 'assetRowUsdt', balId: 'balUsdt' },
          { id: 'assetRowTrx', balId: 'balTrx' },
          { id: 'assetRowEth', balId: 'balEth' },
          { id: 'assetRowBtc', balId: 'balBtc' },
        ];
  rows.forEach(function (row) {
    const el = document.getElementById(row.id);
    if (!el) return;
    const v = parseAssetDisplayBalance(row.balId);
    if (v === null) {
      el.style.display = '';
      return;
    }
    el.style.display = hideZeros && v <= 1e-12 ? 'none' : '';
  });
}

function onHideZeroTokensChange() {
  const cb = document.getElementById('hideZeroTokens');
  try { localStorage.setItem('ww_hide_zero_tokens', cb && cb.checked ? '1' : '0'); } catch (e) { wwQuiet(e); }
  applyHideZeroTokens();
}

function getMnemonicWordsForDisplay() {
  const words = [];
  const isEn = currentLang === 'en';
  if(isEn) {
    const mn = REAL_WALLET && REAL_WALLET.enMnemonic;
    if(mn) mn.split(' ').forEach(function(w) { words.push(w); });
  } else {
    const wl = WT_WORDLISTS[currentLang];
    const enMn = REAL_WALLET && REAL_WALLET.enMnemonic;
    if(wl && enMn) {
      enMn.split(' ').forEach(function(enW) {
        const enIdx = WT_WORDLISTS.en.indexOf(enW);
        words.push(enIdx >= 0 && wl[enIdx] ? wl[enIdx] : enW);
      });
    }
  }
  return words;
}

function copyMnemonicAsCardImage(btn) {
  const words = getMnemonicWordsForDisplay();
  if(!words.length) { showToast('无可用助记词', 'error'); return; }
  const w = 720;
  const rowH = 42;
  const cols = 3;
  const gridRows = Math.ceil(words.length / cols);
  const h = 120 + gridRows * rowH + 100;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const grd = ctx.createLinearGradient(0, 0, w, h);
  grd.addColorStop(0, '#1a1528');
  grd.addColorStop(1, '#07070e');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(200,168,75,0.45)';
  ctx.lineWidth = 3;
  ctx.strokeRect(18, 18, w - 36, h - 36);
  ctx.fillStyle = 'rgba(200,168,75,0.95)';
  ctx.font = 'bold 28px system-ui,-apple-system,sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('WorldToken', w / 2, 58);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = '14px system-ui,-apple-system,sans-serif';
  ctx.fillText('助记词备份 · 请离线保存，勿分享', w / 2, 88);
  ctx.textAlign = 'left';
  ctx.font = '20px ui-monospace, Menlo, monospace';
  const cellW = (w - 96) / cols;
  words.forEach(function(word, i) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 48 + col * cellW;
    const y = 118 + row * rowH;
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.fillText((i + 1) + '. ' + word, x, y);
  });
  ctx.fillStyle = 'rgba(255,120,100,0.95)';
  ctx.font = '13px system-ui,-apple-system,sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('⚠ 任何获得此图的人可能控制您的资产 · 请妥善保管', w / 2, h - 36);
  canvas.toBlob(function(blob) {
    if(!blob) { showToast('图片生成失败', 'error'); return; }
    try {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'worldtoken-mnemonic-backup.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e1) { wwQuiet(e1); }
    if(navigator.clipboard && navigator.clipboard.write) {
      try {
        navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      } catch (e2) { wwQuiet(e2); }
    }
    if(btn) {
      var prev = btn.textContent;
      btn.textContent = '✅ 已保存';
      setTimeout(function() { btn.textContent = prev; }, 2000);
    }
  }, 'image/png', 0.95);
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
  if(!card || !REAL_WALLET || !REAL_WALLET.trxAddress) { if(card) card.style.display = 'none'; return; }
  try {
    var r = await fetch(TRON_GRID + '/wallet/getaccountresource', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: REAL_WALLET.trxAddress, visible: true })
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
  } catch (e) { wwQuiet(e); }
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
  } catch (e) { wwQuiet(e); }
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
    try { if (typeof wwRefreshAntiPhishOnPinUnlock === 'function') wwRefreshAntiPhishOnPinUnlock(); } catch (_ap3) { wwQuiet(_ap3); }
    setTimeout(function() { try { inp.focus(); } catch (e) { wwQuiet(e); } }, 200);
  }
  wwCleanupMemory();
  try { wwCleanupStorage(); } catch (_wcs2) { wwQuiet(_wcs2); }
  window._wwUnlockPreservePage = true;
  window._wwForceIdleLock = true;
}

/* const TRON_GRID: wallet.ui.js */
/* const USDT_TRC20: wallet.ui.js */
/* const ETH_RPC: wallet.ui.js */

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
  } catch (_e) { wwQuiet(_e); }
}

async function broadcastRealTransfer() {
  if(!REAL_WALLET) { showToast('⚠️ 请先创建或导入钱包', 'warning'); return false; }
  const addr = document.getElementById('transferAddr').value.trim();
  const coin = transferCoin.id;
  if(!addr || addr.length < 26){showToast('地址格式无效','error');return false;}
  if(coin==='eth' && !addr.match(/^0x[a-fA-F0-9]{40}$/)){showToast('以太坊地址格式错误','error');return false;}
  if((coin==='usdt'||coin==='trx') && !addr.match(/^T[a-zA-Z0-9]{33}$/)){showToast('TRON地址格式错误','error');return false;}
  if (typeof wwTransferWhitelistCheck === 'function' && !wwTransferWhitelistCheck(addr)) {
    showToast('❌ 收款地址未通过「转账白名单」校验。请在 设置 → 转账白名单 中添加该地址或关闭白名单。', 'error');
    return false;
  }
  const amt = parseFloat(document.getElementById('transferAmount').value);
  if(!amt || amt<=0 || isNaN(amt)){showToast('金额无效','error');return false;}
  if(amt>10000){showToast('单笔超10000限额','error');return false;}
  const bal = (transferCoin.bal||0);
  if(amt>bal){showToast('余额不足','error');return false;}

  const txkey = Date.now()+Math.random();
  window._wwPendingTxs = window._wwPendingTxs || {};
  window._wwPendingTxs[txkey] = {coin,addr,amt,time:Date.now()};
  try {
    let txHash = '';

    if(coin === 'usdt') {
      // USDT TRC-20 转账
      txHash = await sendUSDT_TRC20(addr, amt);
    } else if(coin === 'trx') {
      // TRX 转账：加载 TronWeb 后用 isAddress 校验（优于纯正则）
      await loadTronWeb();
      if(typeof TronWeb !== 'undefined' && typeof TronWeb.isAddress === 'function') {
        if(!TronWeb.isAddress(addr)) { showToast('TRON地址格式错误','error'); return false; }
      } else if(!addr.match(/^T[a-zA-Z0-9]{33}$/)) {
        showToast('TRON地址格式错误','error'); return false;
      }
      txHash = await sendTRX(addr, amt);
    } else if(coin === 'eth') {
      // ETH 转账
      txHash = await sendETH(addr, amt);
    } else {
      showToast('⚠️ 暂不支持 ' + transferCoin.name + ' 转账', 'warning');
      return false;
    }

    if(txHash) {
      try { if (typeof wwRecordSpendAfterBroadcast === 'function') wwRecordSpendAfterBroadcast(amt); } catch (_rs) { wwQuiet(_rs); }
      _safeEl('successTxHash') && ((_safeEl('successTxHash') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* successTxHash fallback */.textContent = txHash);
      _safeEl('successTxLink') && (_safeEl('successTxLink').href =
        coin==='eth' ? 'https://etherscan.io/tx/'+txHash : 'https://tronscan.org/#/transaction/'+txHash);
      return true;
    }
  } catch(e) {
    console.error('转账失败:', e);
    showToast('❌ 转账失败: ' + wwFmtUserError(e, '未知错误'), 'error');
  } finally {
    try { delete window._wwPendingTxs[txkey]; } catch (_pt) { wwQuiet(_pt); }
  }
  return false;
}

async function sendUSDT_TRC20(toAddr, amount) {
  await loadTronWeb();
  const tw = new TronWeb({ fullHost: TRON_GRID });
  tw.setPrivateKey(REAL_WALLET.trxPrivateKey || REAL_WALLET.privateKey);
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
}

async function sendTRX(toAddr, amount) {
  await loadTronWeb();
  const tw = new TronWeb({ fullHost: TRON_GRID });
  tw.setPrivateKey(REAL_WALLET.trxPrivateKey || REAL_WALLET.privateKey);
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
}

async function sendETH(toAddr, amount) {
  const provider = new ethers.providers.JsonRpcProvider(ETH_RPC);
  if(!ethers.utils.isAddress(toAddr)){throw new Error('以太坊地址无效');}
  toAddr = ethers.utils.getAddress(toAddr);
  const wallet = new ethers.Wallet(REAL_WALLET.privateKey, provider);
  const sp = (typeof getTransferFeeSpeed === 'function') ? getTransferFeeSpeed() : 'normal';
  const mult = sp === 'slow' ? 0.88 : sp === 'fast' ? 1.24 : 1;
  const fd = await provider.getFeeData();
  const txReq = {
    to: toAddr,
    value: ethers.utils.parseEther(amount.toString()),
    gasLimit: ethers.BigNumber.from('21000')
  };
  const est = await provider.estimateGas(txReq).catch(function () { return ethers.BigNumber.from('21000'); });
  txReq.gasLimit = typeof wwBumpEvmNativeGasLimit === 'function' ? wwBumpEvmNativeGasLimit(est, ethers) : est.mul(120).div(100);
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
}

// ══ 转账系统 ══
/* let transferCoin: wallet.ui.js */

/* const WW_RECENT_ADDR_KEY: wallet.ui.js */
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
  try { localStorage.setItem(WW_RECENT_ADDR_KEY, JSON.stringify(list)); } catch (e) { wwQuiet(e); }
}

/* const WW_CONTACTS_KEY: wallet.ui.js */
function getTransferContacts() {
  try {
    const raw = localStorage.getItem(WW_CONTACTS_KEY);
    const a = raw ? JSON.parse(raw) : [];
    return Array.isArray(a) ? a.filter(x => x && typeof x.addr === 'string' && x.addr.trim() && typeof x.nick === 'string') : [];
  } catch(e) { return []; }
}
function setTransferContacts(list) {
  try { localStorage.setItem(WW_CONTACTS_KEY, JSON.stringify(list.slice(0, 48))); } catch (e) { wwQuiet(e); }
}
function saveTransferContact(addr, nick) {
  const a = (addr || '').trim();
  const n = ((nick || '').trim() || '未命名').slice(0, 32);
  if(!a) return;
  let list = getTransferContacts().filter(c => c.addr.trim().toLowerCase() !== a.toLowerCase());
  list.unshift({ addr: a, nick: n });
  setTransferContacts(list);
  if (typeof wwRefreshAddressBookLists === 'function') wwRefreshAddressBookLists();
  else renderTransferContactsList();
  showToast('已保存联系人', 'success');
}
function removeTransferContact(addr) {
  const t = (addr || '').trim().toLowerCase();
  if(!t) return;
  setTransferContacts(getTransferContacts().filter(c => c.addr.trim().toLowerCase() !== t));
  if (typeof wwRefreshAddressBookLists === 'function') wwRefreshAddressBookLists();
  else renderTransferContactsList();
}
function toggleContactAddForm() {
  const f = document.getElementById('transferContactAddForm');
  if(!f) return;
  const open = f.style.display === 'none' || !f.style.display || f.style.display === '';
  f.style.display = open ? 'block' : 'none';
  if(open) {
    const inp = document.getElementById('contactNickInput');
    if(inp) { inp.value = ''; try { inp.focus(); } catch (e) { wwQuiet(e); } }
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
  } catch (e) { wwQuiet(e); }
  return 'normal';
}
function setTransferFeeSpeed(speed) {
  if(speed !== 'slow' && speed !== 'normal' && speed !== 'fast') speed = 'normal';
  try { localStorage.setItem('ww_transfer_fee_speed', speed); } catch (e) { wwQuiet(e); }
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
/* let _wwTickerInterval: wallet.ui.js */
async function refreshHomePriceTicker() {
  try {
    var ustNum = null;
    if (window._wwLastCgUsd && typeof window._wwLastCgUsd.usdt === 'number' && isFinite(window._wwLastCgUsd.usdt)) {
      ustNum = window._wwLastCgUsd.usdt;
    } else {
      const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd');
      const d = await r.json();
      ustNum = d.tether && d.tether.usd;
      try {
        window._wwLastCgUsd = Object.assign({}, window._wwLastCgUsd || {}, {
          usdt: ustNum
        });
      } catch (_cg) { wwQuiet(_cg); }
    }
    const fmt = function(x) {
      if(x === undefined || x === null || !isFinite(x)) return '—';
      return x < 10 ? x.toFixed(4) : x.toLocaleString('en', { maximumFractionDigits: 2 });
    };
    const ust = fmt(ustNum);
    const html = 'TRC USDT <strong>$' + ust + '</strong>';
    const a = document.getElementById('wwTickerTextA');
    const b = document.getElementById('wwTickerTextB');
    if(a) a.innerHTML = html;
    if(b) b.innerHTML = html;
    if(!_wwTickerInterval) {
      _wwTickerInterval = setInterval(function() { refreshHomePriceTicker(); }, 45000);
    }
    try {
      if (typeof wwCheckPriceAlertsAfterTicker === 'function') {
        wwCheckPriceAlertsAfterTicker({ tether: { usd: ustNum } });
      }
    } catch (_pa) { wwQuiet(_pa); }
  } catch (e) { wwQuiet(e); }
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
  } catch (e) { wwQuiet(e); }
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
  try { localStorage.setItem('ww_price_alerts_v1', JSON.stringify(o)); } catch (e) { wwQuiet(e); }
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
      { key: 'usdt', name: 'TRC USDT', get: function (z) { return z.tether && z.tether.usd; } }
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
  } catch (e) { wwQuiet(e); }
}

function updateYieldFarmTracker(parts, total) {
  var el = document.getElementById('wwYieldFarmBody');
  if (!el) return;
  if (!total || total <= 1e-9) {
    el.innerHTML = '<div style="color:var(--text-muted);font-size:11px">暂无持仓估值，无法估算质押收益。</div>';
    return;
  }
  var apy = { 'TRC USDT': 4.2, 'USDT (ERC-20)': 4.2, TRX: 4.8, ETH: 3.6, BTC: 2.9 };
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
  try { localStorage.setItem('ww_transfer_whitelist_v1', JSON.stringify(o)); } catch (e) { wwQuiet(e); }
  if (typeof showToast === 'function') showToast('白名单已保存', 'success', 1800);
}

function wwRecurringLoad() {
  try {
    var j = JSON.parse(localStorage.getItem('ww_recurring_v1') || '[]');
    return Array.isArray(j) ? j : [];
  } catch (e) { return []; }
}

function wwRecurringSave(list) {
  try { localStorage.setItem('ww_recurring_v1', JSON.stringify(list.slice(0, 50))); } catch (e) { wwQuiet(e); }
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
    } catch (e) { wwQuiet(e); }
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
  } catch (e) { wwQuiet(e); }
}

function wwInheritanceSave() {
  var b = document.getElementById('wwInheritanceBeneficiary');
  var n = document.getElementById('wwInheritanceNote');
  var o = {
    beneficiary: b ? String(b.value || '').trim().slice(0, 256) : '',
    note: n ? String(n.value || '').trim().slice(0, 2000) : ''
  };
  try { localStorage.setItem('ww_inheritance_v1', JSON.stringify(o)); } catch (e2) { wwQuiet(e2); }
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
  try { localStorage.setItem('ww_dao_votes_v1', JSON.stringify(v)); } catch (e2) { wwQuiet(e2); }
  wwDaoRender();
  try { if(typeof wwReputationPopulate==='function') wwReputationPopulate(); } catch (_r) { wwQuiet(_r); }
  try { if(typeof updateReputationSettingsRow==='function') updateReputationSettingsRow(); } catch (_s) { wwQuiet(_s); }
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
  } catch (e) { wwQuiet(e); }
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
  try { updateReputationSettingsRow(); } catch (e) { wwQuiet(e); }
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
  var slipPct = typeof wwGetSwapSlippagePct === 'function' ? wwGetSwapSlippagePct() : 0.5;
  if (!isFinite(slipPct) || slipPct <= 0) slipPct = 0.5;
  var slipEth = 1 - slipPct / 100;
  var outTron = (pTo > 0) ? ((amtIn - feeTron) * pFrom / pTo) : 0;
  var outEth = (pTo > 0) ? ((amtIn - feeEth) * pFrom / pTo) * slipEth : 0;
  var ft = swapTo ? swapTo.name : '';
  var sid = swapFrom && swapFrom.id;
  var tid = swapTo && swapTo.id;
  var tronPair = !!(sid && tid && ['trx', 'usdt'].indexOf(sid) >= 0 && ['trx', 'usdt'].indexOf(tid) >= 0);
  var roughEthIds = { eth: 1, btc: 1, bnb: 1, usdt: 1, usdt_eth: 1 };
  var evmRoughPair = !!(sid && tid && roughEthIds[sid] && roughEthIds[tid]);
  var showTron = amtIn > 0 && tronPair;
  var showEth = amtIn > 0 && evmRoughPair;
  var elT = document.getElementById('wwSwapCompareTron');
  var elE = document.getElementById('wwSwapCompareEth');
  var bT = document.getElementById('wwSwapCompareBadgeTron');
  var bE = document.getElementById('wwSwapCompareBadgeEth');
  var best = document.getElementById('wwSwapCompareBest');
  if (elT) elT.textContent = showTron ? (outTron > 1 ? outTron.toFixed(4) : outTron.toFixed(8)) + ' ' + ft : '—';
  if (elE) elE.textContent = showEth ? (outEth > 1 ? outEth.toFixed(4) : outEth.toFixed(8)) + ' ' + ft : '—';
  if (!(showTron && showEth)) {
    if (bT) { bT.textContent = showTron ? '参考' : '—'; bT.style.background = 'var(--bg3)'; bT.style.color = 'var(--text-muted)'; }
    if (bE) { bE.textContent = showEth ? '参考' : '—'; bE.style.background = 'var(--bg3)'; bE.style.color = 'var(--text-muted)'; }
    if (best) best.textContent = '';
    return;
  }
  var better = '相近';
  if (outTron > outEth * 1.0001) { better = 'TRON 路径参考更优（预估多 ' + ((outTron - outEth) > 1 ? (outTron - outEth).toFixed(4) : (outTron - outEth).toFixed(8)) + ' ' + ft + '）'; if (bT) { bT.textContent = '较优'; bT.style.background = 'rgba(38,161,123,0.2)'; bT.style.color = '#26a17b'; } if (bE) { bE.textContent = '参考'; bE.style.background = 'var(--bg3)'; bE.style.color = 'var(--text-muted)'; } }
  else if (outEth > outTron * 1.0001) { better = '以太坊路径参考更优（预估多 ' + ((outEth - outTron) > 1 ? (outEth - outTron).toFixed(4) : (outEth - outTron).toFixed(8)) + ' ' + ft + '）'; if (bE) { bE.textContent = '较优'; bE.style.background = 'rgba(98,126,234,0.2)'; bE.style.color = '#627eea'; } if (bT) { bT.textContent = '参考'; bT.style.background = 'var(--bg3)'; bT.style.color = 'var(--text-muted)'; } }
  else {
    if (bT) { bT.textContent = '参考'; bT.style.background = 'var(--bg3)'; bT.style.color = 'var(--text-muted)'; }
    if (bE) { bE.textContent = '参考'; bE.style.background = 'var(--bg3)'; bE.style.color = 'var(--text-muted)'; }
  }
  if (best) best.textContent = better;
}

var WW_LENDING_MARKETS = [
  { asset: 'TRC USDT', chain: 'TRON', supplyApy: '3.8%', borrowApr: '5.2%', color: '#26a17b' },
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
  try { localStorage.setItem('ww_perp_demo_v1', JSON.stringify(arr)); } catch (e2) { wwQuiet(e2); }
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
    pnlEl.textContent = list.length ? (sum >= 0 ? '+' : '') + sum.toFixed(2) + ' TRC USDT' : '—';
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
      '<br/>未实现 <b style="color:' + col + '">' + (parseFloat(p.uPnl) >= 0 ? '+' : '') + p.uPnl + '</b> TRC USDT</div></div>';
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
  if (prem) prem.textContent = (total < 0.01 ? total.toFixed(6) : total.toFixed(2)) + ' TRC USDT';
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
    { sym: 'TRC USDT', base: 4.2 },
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
  } catch (e) { wwQuiet(e); }
  wwLiquidationPopulate();
}

function wwLiquidationLoad() {
  try {
    var t = localStorage.getItem('ww_liq_threshold');
    var el = document.getElementById('wwLiqThreshold');
    if (el && t) el.value = t;
    var n = document.getElementById('wwLiqNotify');
    if (n) n.checked = localStorage.getItem('ww_liq_notify') === '1';
  } catch (e2) { wwQuiet(e2); }
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
  } catch (e) { wwQuiet(e); }
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
  { name: 'DemoLayer', chain: 'ETH', date: '2026-04-18', allocation: '500 TRC USDT', status: '即将开始' },
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
  } catch (e) { wwQuiet(e); }
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
    return '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:14px">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap">' +
      '<div><div style="font-size:12px;color:var(--text-muted)">#' + (i + 1) + ' · ' + r.label + '</div>' +
      '<div style="font-weight:700;margin-top:4px;color:var(--text)">' + short + '</div></div>' +
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
  } catch (e) { wwQuiet(e); }
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
  } catch (e) { wwQuiet(e); }
}

function wwAutoRebalancePortfolioParts() {
  var u = parseFloat((document.getElementById('valUsdt') || {}).textContent.replace(/[^0-9.\-]/g, '')) || 0;
  var total = u;
  if (total <= 0) return { total: 0, parts: [{ k: 'TRC USDT', p: 0 }] };
  return {
    total: total,
    parts: [
      { k: 'TRC USDT', p: 100 }
    ]
  };
}

function wwAutoRebalancePopulate() {
  wwAutoRebalanceLoad();
  var body = document.getElementById('wwAutoRebalanceBody');
  if (!body) return;
  var th = parseInt((document.getElementById('wwAutoRebalThreshold') || {}).value || '8', 10);
  if (!isFinite(th) || th < 1) th = 8;
  var target = { 'TRC USDT': 100 };
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
  var coins = ['TRC USDT'];
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
    try { localStorage.setItem('ww_onchain_msg_prefill', txt); } catch (e) { wwQuiet(e); }
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
  } catch (e) { wwQuiet(e); }
}

function wwOnchainMsgGoTransfer() {
  try { goTo('page-transfer'); } catch (e) { wwQuiet(e); }
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
  } catch (e) { wwQuiet(e); }
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
  } catch (e) { wwQuiet(e); }
  if (hint) {
    try { hint.textContent = localStorage.getItem('ww_gasless_meta') === '1' ? '已开启示意' : '关闭'; } catch (e2) { wwQuiet(e2); }
  }
  if (typeof showToast === 'function') showToast('已保存免 Gas 偏好（示意）', 'success');
}

function wwRecoveryTestClear() {
  try {
    var t = document.getElementById('recoveryTestInput');
    if (t) t.value = '';
  } catch (e) { wwQuiet(e); }
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
  var lang = typeof currentLang !== 'undefined' ? currentLang : 'en';
  var enStr = raw.trim();
  try {
    if (typeof mnemonicFromLang === 'function') enStr = mnemonicFromLang(raw.trim(), lang);
  } catch (e1) { wwQuiet(e1); }
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

function drawPortfolioPieChart(trcUsdtUsd, ercUsdtUsd, trxUsd, ethUsd, btcUsd) {
  const card = document.getElementById('wwPortfolioPieCard');
  const c = document.getElementById('portfolioPieCanvas');
  const leg = document.getElementById('portfolioPieLegend');
  if(!card || !c || !leg) return;
  const parts = [
    { v: Number(trcUsdtUsd) || 0, c: '#26a17b', l: 'TRC USDT' },
    { v: Number(ercUsdtUsd) || 0, c: '#3d9a72', l: 'USDT (ERC-20)' },
    { v: Number(trxUsd) || 0, c: '#ff4d4d', l: 'TRX' },
    { v: Number(ethUsd) || 0, c: '#627eea', l: 'ETH' },
    { v: Number(btcUsd) || 0, c: '#f7931a', l: 'BTC' }
  ];
  const total = parts.reduce(function(a, p) { return a + p.v; }, 0);
  try { window._wwLastPortfolioParts = parts; window._wwLastPortfolioTotal = total; } catch (_wp) { wwQuiet(_wp); }
  if(total <= 1e-9) { card.style.display = 'none'; try { if(typeof updateRebalanceSuggestion==='function') updateRebalanceSuggestion([], 0); } catch (_r) { wwQuiet(_r); } try { if(typeof updateYieldFarmTracker==='function') updateYieldFarmTracker([], 0); } catch (_y0) { wwQuiet(_y0); } return; }
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
  try { if (typeof updateRebalanceSuggestion === 'function') updateRebalanceSuggestion(parts, total); } catch (_rb) { wwQuiet(_rb); }
  try { if (typeof updateYieldFarmTracker === 'function') updateYieldFarmTracker(parts, total); } catch (_yf) { wwQuiet(_yf); }
}
function getNetworkFeeEstimateLines(coinId) {
  const sp = typeof getTransferFeeSpeed === 'function' ? getTransferFeeSpeed() : 'normal';
  const usdtMap = {
    slow: { line: '≈ 6–8 TRX · 能量上限（经济档）', sub: '确认较慢，费用较低' },
    normal: { line: '≈ 8.5 TRX · 合约能量（示意）', sub: '约 30 秒内确认' },
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
    const al = c.addr.toLowerCase();
    const nl = (c.nick || '').toLowerCase();
    return al.includes(q) || nl.includes(q);
  });
  const matchedRecent = recent.filter(a => {
    const al = a.toLowerCase();
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
      div.appendChild(document.createTextNode(addrBookShort(item.addr)));
      div.title = item.addr;
      div.onmousedown = function(e) { e.preventDefault(); pickTransferAddrFromBookRaw(item.addr); };
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
      div.appendChild(document.createTextNode(addr));
      div.title = '\u6700\u8fd1\u8f6c\u8d26: ' + addr;
      div.onmousedown = function(e) { e.preventDefault(); pickTransferAddrFromBookRaw(addr); };
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

/** 转账页「地址簿」按钮：展示全部联系人 + 最近地址（与输入联想共用 #transferAddrBook） */
function openTransferAddrBookPicker() {
  const box = document.getElementById('transferAddrBook');
  if (!box) return;
  const contacts = getTransferContacts();
  const recent = getRecentTransferAddrs();
  const contactSet = new Set(contacts.map(function (c) { return c.addr.trim().toLowerCase(); }));
  const matchedRecent = recent.filter(function (a) { return !contactSet.has(a.toLowerCase()); });
  box.innerHTML = '';
  const appendHdr = function (lbl) {
    const h = document.createElement('div');
    h.className = 'transfer-addr-dd-hdr';
    h.textContent = lbl;
    box.appendChild(h);
  };
  const addContactItems = function (list) {
    list.forEach(function (item) {
      const div = document.createElement('div');
      div.className = 'transfer-addr-dd-item';
      const span = document.createElement('span');
      span.className = 'contact-nick-mark';
      span.textContent = item.nick + ' · ';
      div.appendChild(span);
      div.appendChild(document.createTextNode(addrBookShort(item.addr)));
      div.title = item.addr;
      div.onmousedown = function (e) { e.preventDefault(); pickTransferAddrFromBookRaw(item.addr); };
      box.appendChild(div);
    });
  };
  const addRecentItems = function (list) {
    list.forEach(function (addr) {
      const div = document.createElement('div');
      div.className = 'transfer-addr-dd-item recent-item';
      const ico = document.createElement('span');
      ico.className = 'recent-ico';
      ico.textContent = '⏳ ';
      div.appendChild(ico);
      div.appendChild(document.createTextNode(addr));
      div.title = '最近转账: ' + addr;
      div.onmousedown = function (e) { e.preventDefault(); pickTransferAddrFromBookRaw(addr); };
      box.appendChild(div);
    });
  };
  if (!contacts.length && !matchedRecent.length) {
    const empty = document.createElement('div');
    empty.className = 'transfer-addr-dd-empty';
    empty.textContent = '暂无地址，请在设置 → 地址簿中添加';
    box.appendChild(empty);
    box.style.display = 'block';
    return;
  }
  if (contacts.length) {
    appendHdr('联系人');
    addContactItems(contacts.slice(0, 24));
  }
  if (matchedRecent.length) {
    appendHdr('最近转账');
    addRecentItems(matchedRecent.slice(0, 12));
  }
  box.style.display = 'block';
}
try { window.openTransferAddrBookPicker = openTransferAddrBookPicker; } catch (_opab) { wwQuiet(_opab); }

function shakeTransferAmountTooHigh() {
  const el = document.getElementById('transferAmountBox');
  if(!el) return;
  el.classList.remove('wt-transfer-shake');
  void el.offsetWidth;
  el.classList.add('wt-transfer-shake');
}
function pinUnlockBackspace() {
  const inp = document.getElementById('pinUnlockInput');
  if(!inp) return;
  inp.value = (inp.value || '').slice(0, -1);
  try { inp.focus(); } catch (e) { wwQuiet(e); }
}
function pinUnlockClear() {
  const inp = document.getElementById('pinUnlockInput');
  if(!inp) return;
  inp.value = '';
  const err = document.getElementById('pinUnlockError');
  if(err) err.style.display = 'none';
  try { inp.focus(); } catch (e) { wwQuiet(e); }
}



function detectAddrType() {
  const ta = document.getElementById('transferAddr');
  const addr = ta ? String(ta.value || '').trim() : '';
  const tag = document.getElementById('addrTypeTag');
  const box = document.getElementById('transferAddrBox');
  const btn = document.getElementById('transferBtn');

  // wallet.html 精简转账页无 addrTypeTag 等节点：仅更新边框并走 calcTransferFee
  if (!tag) {
    if (!addr) {
      if (box) box.style.borderColor = 'var(--border)';
      if (btn) { btn.disabled = true; btn.style.opacity = '0.4'; btn.style.cursor = 'not-allowed'; }
    } else if (box) {
      box.style.borderColor = 'rgba(200,168,75,0.4)';
    }
    calcTransferFee();
    try { if (typeof updateTransferAddrBook === 'function') updateTransferAddrBook(); } catch (_uab) { wwQuiet(_uab); }
    return;
  }

  const icon = document.getElementById('addrTypeIcon');
  const name = document.getElementById('addrTypeName');
  const recipient = document.getElementById('recipientCard');

  if (!addr) {
    tag.style.display = 'none';
    if (recipient) recipient.style.display = 'none';
    if (box) box.style.borderColor = 'var(--border)';
    if (btn) { btn.disabled = true; btn.style.opacity = '0.4'; btn.style.cursor = 'not-allowed'; }
    calcTransferFee();
    try { if (typeof updateTransferAddrBook === 'function') updateTransferAddrBook(); } catch (_uab2) { wwQuiet(_uab2); }
    return;
  }

  let type = '', chainName = '', isWorldToken = false;
  if (addr.includes('·') || addr.length < 30) {
    type = '🌍'; chainName = 'WorldToken 万语地址'; isWorldToken = true;
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
  try { if (typeof updateTransferAddrBook === 'function') updateTransferAddrBook(); } catch (_uab3) { wwQuiet(_uab3); }
}

function checkTransferReady() {
  const addrEl = document.getElementById('transferAddr');
  const amtEl = document.getElementById('transferAmount');
  const addr = addrEl ? addrEl.value.trim() : '';
  const amt = amtEl ? (parseFloat(amtEl.value) || 0) : 0;
  const btn = document.getElementById('transferBtn');
  const feeRow = document.getElementById('transferFeeRow');
  const bal = Number(transferCoin.bal) || 0;
  const over = amt > bal + 1e-10;
  if (feeRow) {
    if (addr || amt > 0) feeRow.style.display = 'block';
    else feeRow.style.display = 'none';
  }
  const offline = (typeof wwIsOnline === 'function') ? !wwIsOnline() : (typeof navigator !== 'undefined' && navigator.onLine === false);
  if (!btn) return;
  if (offline) {
    btn.disabled = true; btn.style.opacity = '0.4'; btn.style.cursor = 'not-allowed';
    return;
  }
  if (addr && amt > 0 && !over) {
    btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer';
  } else {
    btn.disabled = true; btn.style.opacity = '0.4'; btn.style.cursor = 'not-allowed';
  }
}

function calcTransferFee() {
  try {
    var uc = typeof COINS !== 'undefined' && COINS.find && COINS.find(function (c) { return c && c.id === transferCoin.id; });
    if (uc) { transferCoin.bal = uc.bal; transferCoin.price = uc.price; }
  } catch (_e) { wwQuiet(_e); }
  const amtEl = document.getElementById('transferAmount');
  const amt = amtEl ? (parseFloat(amtEl.value) || 0) : 0;
  const coinData = (typeof COINS !== 'undefined' && COINS.find) ? COINS.find(function (c) { return c.id === transferCoin.id; }) : null;
  const price = (coinData && coinData.price) || transferCoin.price || 1;
  const nf = getNetworkFeeEstimateLines(transferCoin.id);
  const hintEl = document.getElementById('transferFeeHint');
  const netEl = document.getElementById('transferNetworkFee');
  const gasLineEl = document.getElementById('transferGasFeeLine');
  if (netEl) netEl.textContent = nf.line + ' · ' + nf.sub;
  if (gasLineEl) gasLineEl.textContent = nf.line + ' · ' + nf.sub;
  const balEl = document.getElementById('transferBal');
  if (balEl) {
    var b = Number(transferCoin.bal) || 0;
    balEl.textContent = (isFinite(b) ? b : 0).toLocaleString(undefined, { maximumFractionDigits: 8 });
  }
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
    if (hintEl) hintEl.textContent = nf.line + ' · ' + nf.sub + ' · TRC-20 需能量/带宽';
  } else {
    const feeNum = amt * 0.003;
    const fee = feeNum.toFixed(4);
    const actual = (amt - feeNum).toFixed(4);
    if (feeEl) feeEl.textContent = fee + ' ' + transferCoin.name;
    if (actEl) actEl.textContent = actual + ' ' + transferCoin.name;
    if (usdEl) usdEl.textContent = '$' + (amt * price).toFixed(2);
    if (cnyEl) cnyEl.textContent = (amt * price * usdToCny).toFixed(2);
    if (hintEl) {
      hintEl.textContent = '约 ' + fee + ' ' + transferCoin.name + ' 费 · 到账约 ' + actual + ' ' + transferCoin.name + ' · ' + nf.sub;
    }
  }
  const _spd = (typeof getTransferFeeSpeed === 'function') ? getTransferFeeSpeed() : 'normal';
  if (chainEl) chainEl.textContent = transferCoin.chain + ' · ' + (typeof transferSpeedHint === 'function' ? transferSpeedHint(transferCoin.id, _spd) : '约30秒');
  const bal = Number(transferCoin.bal) || 0;
  if (amt > bal + 1e-10) shakeTransferAmountTooHigh();
  checkTransferReady();
  try { if (typeof wwUpdateTxSimulation === 'function') wwUpdateTxSimulation(); } catch (_ws) { wwQuiet(_ws); }
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
  try { if(typeof wwUpdateTxSimulation==='function') wwUpdateTxSimulation(); } catch (e) { wwQuiet(e); }
  if(typeof showToast==='function') showToast(c.checked ? '已开启 MEV 保护（示意）' : '已使用公开内存池（示意）', 'info', 2200);
}

function wwGasSaveTargets() {
  var a = document.getElementById('wwGasTrxTarget');
  var b = document.getElementById('wwGasEthTarget');
  if(a && a.value != null) localStorage.setItem('ww_gas_target_trx', String(a.value).trim());
  if(b && b.value != null) localStorage.setItem('ww_gas_target_eth', String(b.value).trim());
  try { wwGasManagerRender(); } catch (e) { wwQuiet(e); }
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
    usdt:{id:'usdt',name:'TRC USDT',chain:'TRC-20 · Tron',icon:'💚',logoUrl:WW_COIN_LOGO_URL.usdt,bg:'rgba(38,161,123,0.15)',bal:coinData&&coinData.id==='usdt'?coinData.bal:0,price:coinData&&coinData.id==='usdt'?coinData.price:1},
    usdt_eth:{id:'usdt_eth',name:'USDT (ERC-20)',chain:'Ethereum',icon:'💚',logoUrl:WW_COIN_LOGO_URL.usdt,bg:'rgba(38,130,90,0.18)',bal:coinData&&coinData.id==='usdt_eth'?coinData.bal:0,price:coinData&&coinData.id==='usdt_eth'?coinData.price:1},
    trx:{id:'trx',name:'TRX',chain:'Tron',icon:'🔴',logoUrl:WW_COIN_LOGO_URL.trx,bg:'rgba(255,80,80,0.12)',bal:coinData&&coinData.id==='trx'?coinData.bal:0,price:coinData&&coinData.id==='trx'?coinData.price:0.12},
    eth:{id:'eth',name:'ETH',chain:'Ethereum',icon:'🔷',logoUrl:WW_COIN_LOGO_URL.eth,bg:'rgba(100,100,255,0.12)',bal:coinData&&coinData.id==='eth'?coinData.bal:0,price:coinData&&coinData.id==='eth'?coinData.price:2500},
    btc:{id:'btc',name:'BTC',chain:'Bitcoin',icon:'🟠',logoUrl:WW_COIN_LOGO_URL.btc,bg:'rgba(255,165,0,0.12)',bal:coinData&&coinData.id==='btc'?coinData.bal:0,price:coinData&&coinData.id==='btc'?coinData.price:60000},
  };
  transferCoin = COINS.find(c=>c.id===id) || map[id] || map.usdt;
  var iconEl = document.getElementById('transferCoinIcon');
  var nameEl = document.getElementById('transferCoinName');
  var balEl = document.getElementById('transferBal');
  if (iconEl) {
    try { iconEl.style.background = transferCoin.bg || ''; } catch (_ib) { wwQuiet(_ib); }
    wwSetCoinIconElement(iconEl, transferCoin);
  }
  if (nameEl) nameEl.textContent = transferCoin.name;
  if (balEl) balEl.textContent = transferCoin.bal.toLocaleString();
  closeTransferCoinPicker();
  // wallet.html 精简版无币种条：跳转转账页（与 wallet.ui.js 行为一致），避免对缺失节点赋值抛错
  if (!iconEl || !nameEl) {
    if (typeof goTo === 'function') goTo('page-transfer');
  }
  calcTransferFee();
}

function openTransferCoinPicker() { _safeEl('transferCoinOverlay').classList.add('show'); }
function closeTransferCoinPicker() { _safeEl('transferCoinOverlay').classList.remove('show'); }

async function doTransfer() {
  var ta = document.getElementById('transferAddr');
  var amtInp = document.getElementById('transferAmount');
  const addr = ta ? String(ta.value || '').trim() : '';
  const amt = amtInp ? String(amtInp.value || '') : '';
  if(!addr) { showToast('❌ 请输入接收地址', 'error'); return; }
  if(!amt || parseFloat(amt) <= 0) { showToast('❌ 请输入有效金额', 'error'); return; }
  const amtNum = parseFloat(amt) || 0;
  const bal = Number(transferCoin.bal) || 0;
  if(amtNum > bal + 1e-10) { showToast('❌ 金额超过可用余额', 'error'); shakeTransferAmountTooHigh(); return; }
  if(!REAL_WALLET) { showToast('⚠️ 请先创建或导入钱包', 'warning'); return; }
  if((typeof wwIsOnline === 'function') ? !wwIsOnline() : (typeof navigator !== 'undefined' && navigator.onLine === false)) {
    showToast('📡 当前无网络，请联网后再发送', 'warning');
    return;
  }
  if (typeof wwSpendGateBeforeConfirm === 'function') {
    var _g = await wwSpendGateBeforeConfirm(amtNum);
    if (_g === false) return;
  }
  const fee = (amtNum*0.003).toFixed(2);
  const actual = (amtNum - amtNum*0.003).toFixed(2);
  var ca = document.getElementById('confirmAmount');
  var cr = document.getElementById('confirmRecipient');
  var cf = document.getElementById('confirmFee');
  var cact = document.getElementById('confirmActual');
  var cch = document.getElementById('confirmChain');
  if (ca) ca.textContent = amt+' '+transferCoin.name;
  if (cr) cr.textContent = addr.length>20 ? addr.slice(0,20)+'...' : addr;
  if (cf) cf.textContent = fee+' '+transferCoin.name;
  if (cact) cact.textContent = actual+' '+transferCoin.name;
  if (cch) cch.textContent = transferCoin.chain;
  var ov = _safeEl('transferConfirmOverlay');
  if (ov && ov.classList) ov.classList.add('show');
}

function closeTransferConfirm() { _safeEl('transferConfirmOverlay').classList.remove('show'); }

function confirmTransfer() {
  if((typeof wwIsOnline === 'function') ? !wwIsOnline() : (typeof navigator !== 'undefined' && navigator.onLine === false)) {
    showToast('📡 当前无网络，无法完成转账', 'warning');
    return;
  }
  closeTransferConfirm();
  // 填充成功页数据
  var _amtEl = document.getElementById('transferAmount');
  var _addrEl = document.getElementById('transferAddr');
  const amt = _amtEl ? String(_amtEl.value || '') : '';
  const addr = _addrEl ? String(_addrEl.value || '').trim() : '';
  saveRecentTransferAddr(addr);
  const amtF = parseFloat(amt)||0;
  const fee = (amtF*0.003).toFixed(2);
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
    _safeEl('successFromPart3').textContent = '';
    _safeEl('successFromLang').textContent = info.flag+' English · BIP39';
  } else {
    const parts = a.main.split(' · ');
    _safeEl('successFromPart1').textContent = parts[0]||'龙凤虎';
    _safeEl('successFromPart2').textContent = parts[1]||'举头望明月';
    _safeEl('successFromPart3').textContent = a.num||'3829461';
    const fromAddr = getNativeAddr(); _safeEl('successFromLang').textContent = fromAddr.substring(0,12)+'...';
  }

  // 收件人 = 输入的对方地址（不同！）
  const isWW = addr.includes('·');
  if(isWW) {
    // WorldToken母语地址，拆解显示
    const parts2 = addr.split('·').map(s=>s.trim());
    _safeEl('successToIcon').textContent = '🌍';
    _safeEl('successToName').textContent = parts2[0]||addr;
    _safeEl('successToAddr').textContent = (parts2[1]||'')+' · '+(parts2[2]||'') + ' · WorldToken';
  } else {
    // 公链地址
    const chainIcon = addr.startsWith('T')?'🔴':addr.startsWith('0x')?'🔷':addr.startsWith('bc')?'🟠':'⛓️';
    _safeEl('successToIcon').textContent = chainIcon;
    _safeEl('successToName').textContent = addr.slice(0,18)+'...'+addr.slice(-6);
    _safeEl('successToAddr').textContent = transferCoin.chain;
  }

  // 详情
  _safeEl('successFee') && ((_safeEl('successFee') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* successFee fallback */.textContent = fee+' '+transferCoin.name);
  const sfi=(_safeEl('successFeeInline') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* successFeeInline fallback */; if(sfi) sfi.textContent='手续费 '+fee+' '+transferCoin.name+' · '+transferCoin.chain;
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
      // wallet.html 精简版无 page-swoosh：直接回首页并刷新余额
      if (document.getElementById('swooshCoin')) {
        goTo('page-swoosh');
      } else {
        if (typeof showToast === 'function') showToast('✅ 转账已提交', 'success');
        goTo('page-home');
        setTimeout(function () { if (typeof loadBalances === 'function') loadBalances(); }, 2000);
      }
    } else {
      showToast('⚠️ 转账广播失败，请检查余额和网络', 'warning');
    }
  }).catch(err => {
    if(sendBtn) { sendBtn.disabled=false; sendBtn.textContent='✅ 确认转账'; }
    showToast('❌ 转账失败：' + wwFmtUserError(err, '网络错误'), 'error');
  });

  // 启动嗖动画（仅当完整版 DOM 存在；否则由上方 then 分支已回首页）
  setTimeout(() => {
    const coin = document.getElementById('swooshCoin');
    if (!coin) return;
    const trail = document.getElementById('swooshTrail');
    const receiver = document.getElementById('swooshReceiver');
    const check = document.getElementById('swooshCheck');
    if(coin) coin.classList.add('swoosh-coin');
    if(trail) trail.classList.add('swoosh-trail');
    setTimeout(()=>{ if(receiver) receiver.classList.add('receiver-glow'); if(check) { check.textContent='✓'; check.style.color='#4ac84a'; check.style.fontSize='20px'; } }, 900);
    setTimeout(()=>{
      if (document.getElementById('page-transfer-success')) {
        goTo('page-transfer-success');
        setTimeout(loadBalances, 2000);
      }
    }, 1800);
  }, 200);
}

function shareSuccess(ev) {
  const amt = _safeEl('successAmount').textContent;
  const coin = _safeEl('successCoin').textContent;
  const from = _safeEl('successFromPart1').textContent+' '+_safeEl('successFromPart2').textContent;
  const txRaw = String(_safeEl('successTxHash').textContent || '').trim();
  let shareBlock = '我刚通过 WorldToken 发送了 '+amt+' '+coin+'\n发款方：'+from+'\nworldtoken.cc';
  if (txRaw) shareBlock += '\n'+txRaw;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(shareBlock).catch(function(){});
  }
  const clickEl = (ev && ev.target) || (typeof window !== 'undefined' && window.event && window.event.target) || (typeof document !== 'undefined' && document.activeElement);
  const btn2 = clickEl && clickEl.closest ? clickEl.closest('div') : null;
  if (btn2) {
    const lc = btn2.querySelector('div:last-child');
    const old2 = lc ? lc.textContent : '';
    if (lc) {
      lc.textContent='✅ 已复制';
      setTimeout(function(){ if (lc) lc.textContent=old2; },1500);
    }
  }
}

// ══ 多文化礼金系统 ══
/* const GIFT_CULTURE: wallet.ui.js */

function getGiftCulture() {
  return GIFT_CULTURE[currentLang] || GIFT_CULTURE.zh;
}

function updateGiftUI() {
  const g = getGiftCulture();
  // 更新礼物页标题
  const title = document.getElementById('giftTitle');
  const subtitle = document.getElementById('giftSubtitle');
  const preview = document.getElementById('giftPreview');
  const icon = document.getElementById('giftIcon');
  const blessingInput = document.getElementById('hbMessage');
  const festivalTag = document.getElementById('giftFestival');
  if(title) title.textContent = g.name;
  if(subtitle) subtitle.textContent = g.festival;
  if(icon) icon.textContent = g.icon;
  if(blessingInput) blessingInput.value = g.desc;
  if(festivalTag) festivalTag.textContent = g.festival;
  if(preview) {
    preview.style.background = `linear-gradient(160deg, ${g.color}dd, ${g.color}88, ${g.color}44)`;
  }
  updateHbPreview();
}

// ══ 礼物口令系统 ══
/* const KW_ZH: wallet.ui.js */
/* const KW_EN: wallet.ui.js */
/* const KW_JA: wallet.ui.js */
/* const KW_AR: wallet.ui.js */
/* const KW_RU: wallet.ui.js */
/* const KW_ES: wallet.ui.js */
/* const KW_FR: wallet.ui.js */

/* const LANG_KW: wallet.ui.js */

/* let hbExpiry: wallet.ui.js */
/* let hbType: wallet.ui.js */

/* const BLESSINGS: wallet.ui.js */

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
  if (!n || !l) {
    updateHbPreview();
    return;
  }
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
  const _hbAmtEl = document.getElementById('hbAmount');
  if (_hbAmtEl) _hbAmtEl.value = v;
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
  const _hbMsgEl = document.getElementById('hbMessage');
  if (_hbMsgEl) _hbMsgEl.value = b;
}

function createHongbao() {
  if(!REAL_WALLET) { showToast('⚠️ 请先创建或导入钱包', 'warning'); return; }
  currentKeyword = genKeyword();
  const _hbAmtEl2 = document.getElementById('hbAmount');
  const _hbMsgEl2 = document.getElementById('hbMessage');
  const amount = parseFloat(_hbAmtEl2 && _hbAmtEl2.value) || 100;
  const blessing = _hbMsgEl2 ? _hbMsgEl2.value : '';
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
    creator: REAL_WALLET.trxAddress
  };
  let allHb = {};
  try {
    allHb = JSON.parse(localStorage.getItem('ww_hongbaos') || '{}') || {};
  } catch (_e) {
    allHb = {};
  }
  if (typeof allHb !== 'object' || allHb === null) allHb = {};
  allHb[currentKeyword] = hbData;
  localStorage.setItem('ww_hongbaos', JSON.stringify(allHb));

  const _kwRoot = document.getElementById('kwKeyword');
  if (!_kwRoot) {
    if (typeof showToast === 'function') showToast('🎁 礼物已创建（精简界面无口令详情页）', 'success');
    goTo('page-hongbao');
    return;
  }

  // 更新UI
  _kwRoot.textContent = currentKeyword;
  document.getElementById('kwBlessingText').textContent = blessing;
  document.getElementById('kwAmtText').textContent = amount + ' TRC USDT';
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
  if (!btn) return;
  const last = btn.querySelector('div:last-child');
  if (!last) return;
  last.textContent = '✅ 已复制';
  setTimeout(()=>{ last.textContent = '复制口令'; }, 2000);
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
  const el = document.getElementById('kwShareText');
  if (!el) return;
  const txt = el.textContent;
  navigator.clipboard?.writeText(txt).catch(()=>{});
  el.style.opacity = '0.6';
  setTimeout(()=>{ el.style.opacity = '1'; }, 800);
}

function onClaimInput() {
  const inp = document.getElementById('claimInput');
  const box = document.getElementById('claimInputBox');
  if (!inp || !box) return;
  const v = String(inp.value || '');
  box.style.borderColor = v.length > 2 ? 'var(--gold)' : 'var(--border)';
}

function fillKeyword(kw) {
  const inp = document.getElementById('claimInput');
  if (!inp) return;
  inp.value = kw;
  onClaimInput();
}

function submitClaim() {
  const claimInp = document.getElementById('claimInput');
  const kw = claimInp ? String(claimInp.value).trim() : '';
  const claimBox = document.getElementById('claimInputBox');
  if (!kw) {
    if (claimBox) claimBox.style.borderColor = 'var(--red)';
    return;
  }

  // 查找礼物（损坏数据不抛错，与 wallet.ui.js 一致）
  let allHb = {};
  try {
    allHb = JSON.parse(localStorage.getItem('ww_hongbaos') || '{}') || {};
  } catch (_e) {
    allHb = {};
  }
  if (typeof allHb !== 'object' || allHb === null) allHb = {};
  const hb = allHb[kw];

  if(!hb) {
    showToast('❌ 未找到此口令，请检查是否输入正确', 'error');
    return;
  }
  // 兼容 wallet.ui.js createGift：claimed 可能为布尔；金额为 amount；缺省 count/expireAt/totalAmount
  if (!Array.isArray(hb.claimed)) {
    hb.claimed = hb.claimed === true ? [{ addr: '', amount: String(hb.amount != null ? hb.amount : ''), time: hb.created || Date.now() }] : [];
  }
  if (hb.expireAt == null) hb.expireAt = Number.MAX_SAFE_INTEGER;
  if (hb.count == null || !(hb.count > 0)) hb.count = 1;
  if (hb.totalAmount == null && hb.amount != null) hb.totalAmount = Number(hb.amount) || 0;
  if (hb.perPerson == null && hb.amount != null) hb.perPerson = String(hb.amount);
  if(Date.now() > hb.expireAt) {
    showToast('⏰ 此礼物已过期', 'warning');
    return;
  }
  if(hb.claimed.length >= hb.count) {
    showToast('😢 礼物已被领完啦', 'warning');
    return;
  }
  if(!REAL_WALLET) {
    showToast('⚠️ 请先创建或导入钱包', 'warning');
    return;
  }
  const myAddr = REAL_WALLET.trxAddress;
  if(hb.claimed.find(x=>x.addr===myAddr)) {
    showToast('ℹ️ 你已经领取过这个礼物了', 'info');
    return;
  }

  // 计算金额（随机或固定）
  let amt;
  if(hb.type === 'lucky') {
    const remaining = hb.totalAmount - hb.claimed.reduce((s,x)=>s+parseFloat(x.amount),0);
    const leftCount = hb.count - hb.claimed.length;
    amt = leftCount === 1 ? remaining.toFixed(2) : (Math.random() * remaining * 2 / leftCount).toFixed(2);
  } else {
    amt = hb.perPerson;
  }

  // 记录领取
  hb.claimed.push({ addr: myAddr, amount: amt, time: Date.now() });
  allHb[kw] = hb;
  localStorage.setItem('ww_hongbaos', JSON.stringify(allHb));

  const rank = hb.claimed.length;
  const elAmt = document.getElementById('claimedAmount');
  if (elAmt) elAmt.textContent = amt;
  const elKw = document.getElementById('claimedKeyword');
  if (elKw) elKw.textContent = kw;
  const elRank = document.getElementById('claimedRank');
  if (elRank) elRank.textContent = '第 ' + rank + ' 个领取 · 共' + hb.count + '份礼物';
  const elMsg = document.getElementById('claimedMessage');
  if (elMsg && (!elKw || !elRank)) {
    const parts = [];
    if (!elKw) parts.push('口令：' + kw);
    if (!elRank) parts.push('第 ' + rank + ' 个领取 · 共 ' + hb.count + ' 份礼物');
    elMsg.textContent = parts.join(' · ');
  }
  goTo('page-claimed');
}

/* let hbCount: wallet.ui.js */
function selectHbType(type) {
  hbType = type;
  const elN = document.getElementById('hbTypeNormal');
  const elL = document.getElementById('hbTypeLucky');
  if (!elN || !elL) {
    updateHbPreview();
    return;
  }
  elN.style.borderColor = type==='normal'?'var(--gold)':'var(--border)';
  elL.style.borderColor = type==='lucky'?'var(--gold)':'var(--border)';
  updateHbPreview();
}
function changeCount(delta) {
  hbCount = Math.max(1, Math.min(100, hbCount+delta));
  const hcv = document.getElementById('hbCountVal');
  if (hcv) hcv.textContent = hbCount;
  const disp = _safeEl('hbCountDisplay') || document.getElementById('hbCountVal');
  if (disp) disp.textContent = hbCount+' 个';
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
  if(per) per.textContent = hbType==='lucky' ? '随机金额' : (hbCount>0?(amount/hbCount).toFixed(2)+' TRC USDT':'- TRC USDT');
  if(tl) tl.textContent = hbType==='lucky' ? '随机金额' : '每人金额';
}
function sendHongbao() {
  const amount = document.getElementById('hbAmount').value;
  document.getElementById('hbSuccessDesc').innerHTML = amount+' TRC USDT · '+hbCount+'份礼物';
  document.getElementById('hbSuccessKeyword').textContent = currentKeyword;
  document.getElementById('hbSuccessOverlay').style.display = 'flex';
}
function hideHbSuccess() { document.getElementById('hbSuccessOverlay').style.display = 'none'; }


/* const CURRENCIES: wallet.ui.js */
/* let currencyIdx: wallet.ui.js */
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
  if (typeof wwDeleteWalletFromSettings === 'function') return wwDeleteWalletFromSettings();
  if (!window.confirm('⚠️ 确认删除钱包？请确保已备份助记词！')) return;
  if (!window.confirm('再次确认：删除后资产将永久丢失！')) return;
  if (typeof wwPurgeLocalWalletStorage === 'function') wwPurgeLocalWalletStorage();
  else {
    try {
      localStorage.removeItem('ww_wallet');
      localStorage.removeItem('ww_hongbaos');
      try {
        localStorage.removeItem('ww_ref_install_credited');
      } catch (_x) { wwQuiet(_x); }
    } catch (_e) { wwQuiet(_e); }
    window.REAL_WALLET = null;
    currentMnemonicLength = 12;
  }
  document.querySelectorAll('.page').forEach(function (p) {
    p.classList.remove('active');
  });
  var _wp = document.getElementById('page-welcome');
  if (_wp) _wp.classList.add('active');
  if (typeof showToast === 'function') showToast('✅ 钱包已删除', 'success');
}

function markBackupDone() {
  let w = {};
  try {
    w = JSON.parse(localStorage.getItem('ww_wallet') || '{}');
  } catch (_e) {
    w = {};
  }
  if (typeof w !== 'object' || w === null) w = {};
  w.backedUp = true;
  localStorage.setItem('ww_wallet', JSON.stringify(w));
  if(REAL_WALLET) REAL_WALLET.backedUp = true;
  const el = document.getElementById('backupStatus');
  if(el) { el.textContent='已备份 ✓'; el.style.color='var(--green,#26a17b)'; }
  if (typeof updateHomeBackupBanner === 'function') updateHomeBackupBanner();
  if (typeof updateWalletSecurityScoreUI === 'function') updateWalletSecurityScoreUI();
  if (typeof wwPopulatePriceAlertForm === 'function') wwPopulatePriceAlertForm();
}

function updateSettingsPage() {
  try {
    if (typeof renderHomeAddrChip === 'function') renderHomeAddrChip();
  } catch (_rh) { wwQuiet(_rh); }
  const info = LANG_INFO[currentLang]||{name:'中文'};
  const sl = (_safeEl('settingsLang') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* settingsLang fallback */;
  if(sl) sl.textContent = info.name;
  const wn = getWalletNickname();
  const wti = document.getElementById('settingsWalletTitle');
  if (wti) wti.textContent = wn || '我的钱包';
  const wni = document.getElementById('walletNicknameInput');
  if (wni && document.activeElement !== wni) wni.value = wn;
  if (typeof applyWwTheme === 'function') applyWwTheme();
  const sa = document.getElementById('settingsAddr');
  if(sa) sa.textContent = getNativeAddr();
  const spv = document.getElementById('settingsPinValue');
  if (spv) {
    var pinSet = false;
    try {
      pinSet = typeof wwHasPinConfigured === 'function' && wwHasPinConfigured();
    } catch (_p0) { pinSet = false; }
    if (!pinSet) {
      try { pinSet = !!(localStorage.getItem('ww_pin') || '').trim(); } catch (_p1) { pinSet = false; }
    }
    spv.textContent = pinSet ? '已设置' : '未设置';
    spv.style.color = pinSet ? 'var(--green,#26a17b)' : 'var(--text-muted)';
  }
  // 实时反映备份状态
  const bs = document.getElementById('backupStatus');
  if(bs) {
    const backed = REAL_WALLET && REAL_WALLET.backedUp;
    bs.textContent = backed ? '已备份 ✓' : '未备份';
    bs.style.color = backed ? 'var(--green,#26a17b)' : 'var(--red,#e74c3c)';
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
    try { aw = localStorage.getItem('ww_antiphish_word') || ''; } catch (e) { wwQuiet(e); }
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
  try { if (typeof updateReputationSettingsRow === 'function') updateReputationSettingsRow(); } catch (_rs) { wwQuiet(_rs); }
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
    try { localStorage.setItem('ww_push_asked', '1'); } catch (x) { wwQuiet(x); }
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
    });
  } catch (e) { wwQuiet(e); }
}


// ══ 兑换系统 ══
/** 币种图标：使用 GitHub Raw 固定标签（spothq/cryptocurrency-icons），避免 assets.coingecko.com 根路径/部分网络返回 AccessDenied 或 403 */
var WW_COIN_LOGO_BASE = 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/v0.18.1/128/color/';
var WW_COIN_LOGO_URL = {
  usdt: WW_COIN_LOGO_BASE + 'usdt.png',
  btc: WW_COIN_LOGO_BASE + 'btc.png',
  eth: WW_COIN_LOGO_BASE + 'eth.png',
  trx: WW_COIN_LOGO_BASE + 'trx.png',
  bnb: WW_COIN_LOGO_BASE + 'bnb.png',
};
function wwEscAttr(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
function wwCoinIconHtml(coin) {
  if (!coin) return '';
  var url = coin.logoUrl;
  if (url) {
    return (
      '<img class="ww-coin-logo-img" src="' +
      wwEscAttr(url) +
      '" alt="" loading="lazy" decoding="async" onerror="this.style.display=\'none\';var n=this.nextElementSibling;if(n)n.style.display=\'flex\';"/>' +
      '<span class="ww-coin-fallback" style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:18px;line-height:1">' +
      wwEscAttr(coin.icon || '') +
      '</span>'
    );
  }
  return String(coin.icon || '');
}
function wwSetCoinIconElement(el, coin) {
  if (!el || !coin) return;
  if (coin.logoUrl) {
    el.innerHTML = wwCoinIconHtml(coin);
    return;
  }
  el.textContent = coin.icon || '';
}

const COINS = [
  {id:'usdt', name:'TRC USDT', chain:'TRC-20 · Tron', icon:'💚', logoUrl: WW_COIN_LOGO_URL.usdt, bg:'rgba(38,161,123,0.15)', bal:0, price:1},
  {id:'usdt_eth', name:'USDT (ERC-20)', chain:'Ethereum', icon:'💚', logoUrl: WW_COIN_LOGO_URL.usdt, bg:'rgba(38,130,90,0.18)', bal:0, price:1},
  {id:'btc',  name:'BTC',  chain:'Bitcoin', icon:'🟠', logoUrl: WW_COIN_LOGO_URL.btc, bg:'rgba(255,165,0,0.12)', bal:0, price:60000},
  {id:'eth',  name:'ETH',  chain:'Ethereum', icon:'🔷', logoUrl: WW_COIN_LOGO_URL.eth, bg:'rgba(100,100,255,0.12)', bal:0, price:2500},
  {id:'trx',  name:'TRX',  chain:'Tron', icon:'🔴', logoUrl: WW_COIN_LOGO_URL.trx, bg:'rgba(255,80,80,0.12)', bal:0, price:0.12},
  {id:'bnb',  name:'BNB',  chain:'BNB Chain', icon:'🟡', logoUrl: WW_COIN_LOGO_URL.bnb, bg:'rgba(255,215,0,0.12)', bal:0, price:312},
];

function wwHomeAssetRowsMeta() {
  return [
    { id: 'assetRowUsdt', balId: 'balUsdt' },
    { id: 'assetRowUsdtErc', balId: 'balUsdtErc' },
    { id: 'assetRowTrx', balId: 'balTrx' },
    { id: 'assetRowEth', balId: 'balEth' },
    { id: 'assetRowBtc', balId: 'balBtc' }
  ];
}

/** 首页 #wwHomeAssetCardsMount 为空时注入 TRC USDT / ERC20 USDT / TRX / ETH / BTC（与 COINS 一致），供余额与「隐藏零余额」使用 */
function wwInitHomeAssetCardsFromCoins() {
  var mount = document.getElementById('wwHomeAssetCardsMount');
  if (!mount || mount.getAttribute('data-ww-asset-cards') === 'v2') return;
  var order = ['usdt', 'usdt_eth', 'trx', 'eth', 'btc'];
  var suf = { usdt: 'Usdt', usdt_eth: 'UsdtErc', trx: 'Trx', eth: 'Eth', btc: 'Btc' };
  var html = '';
  for (var i = 0; i < order.length; i++) {
    var cid = order[i];
    var coin = COINS.find(function (c) { return c.id === cid; });
    if (!coin) continue;
    var s = suf[cid];
    if (!s) continue;
    html +=
      '<div class="asset-item" id="assetRow' +
      s +
      '">' +
      '<div class="asset-icon" style="background:' +
      coin.bg +
      '">' +
      wwCoinIconHtml(coin) +
      '</div>' +
      '<div class="asset-info"><div class="asset-name">' +
      coin.name +
      '</div><div class="asset-chain">' +
      coin.chain +
      '</div></div>' +
      '<div class="asset-right">' +
      '<div class="asset-amount" id="bal' +
      s +
      '">--</div>' +
      '<div class="asset-value" id="val' +
      s +
      '">$--</div>' +
      '<div class="asset-change up" id="chg' +
      s +
      '">--</div>' +
      '</div></div>';
  }
  mount.innerHTML = html;
  mount.setAttribute('data-ww-asset-cards', 'v2');
}

let swapFrom = COINS.find(c => c.id === 'usdt') || COINS[0];
let swapTo   = COINS.find(c => c.id === 'trx') || COINS[0];
let pickerTarget = 'from';

function setSwapCoin(target, coin) {
  if(target==='from') swapFrom=coin;
  else swapTo=coin;
  renderSwapUI();
  calcSwap();
}

function renderSwapUI() {
  const f=swapFrom, t=swapTo;
  var sfi = _safeEl('swapFromIcon');
  if (sfi) {
    try { sfi.style.background = f.bg; } catch (_sfb) { wwQuiet(_sfb); }
    wwSetCoinIconElement(sfi, f);
  }
  (_safeEl('swapFromName') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* swapFromName fallback */.textContent=f.name;
  (_safeEl('swapFromChain') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* swapFromChain fallback */.textContent=f.chain;
  (_safeEl('swapFromBal') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* swapFromBal fallback */.textContent=f.bal.toLocaleString();
  var sti = _safeEl('swapToIcon');
  if (sti) {
    try { sti.style.background = t.bg; } catch (_stb) { wwQuiet(_stb); }
    wwSetCoinIconElement(sti, t);
  }
  (_safeEl('swapToName') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* swapToName fallback */.textContent=t.name;
  (_safeEl('swapToChain') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* swapToChain fallback */.textContent=t.chain;
  const rateRaw = swapFrom.price / swapTo.price;
  const rate = t.id === 'trx' ? rateRaw.toFixed(2) : rateRaw.toFixed(t.price > 100 ? 6 : 4);
  (_safeEl('swapRate') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* swapRate fallback */.textContent=`1 ${f.name} ≈ ${rate} ${t.name}`;
  try {
    var saved = localStorage.getItem('ww_swap_slippage_pct_v1');
    var sel = document.getElementById('swapSlippagePct');
    if (saved != null && saved !== '' && sel) {
      var sv = parseFloat(saved);
      if (isFinite(sv) && sv > 0 && sv <= 50) {
        var want = String(sv);
        for (var si = 0; si < sel.options.length; si++) {
          if (String(sel.options[si].value) === want) {
            sel.value = want;
            break;
          }
        }
      }
    }
  } catch (_rs) { wwQuiet(_rs); }
}

/** 兑换页滑点：下拉 + localStorage，默认 0.5% */
function wwGetSwapSlippagePct() {
  var DEF = 0.5;
  try {
    var sel = document.getElementById('swapSlippagePct');
    if (sel && sel.value != null && sel.value !== '') {
      var n = parseFloat(sel.value);
      if (isFinite(n) && n > 0 && n <= 50) return n;
    }
  } catch (_g) { wwQuiet(_g); }
  try {
    var raw = localStorage.getItem('ww_swap_slippage_pct_v1');
    if (raw != null && raw !== '') {
      var n2 = parseFloat(raw);
      if (isFinite(n2) && n2 > 0 && n2 <= 50) return n2;
    }
  } catch (_g2) { wwQuiet(_g2); }
  return DEF;
}

function wwOnSwapSlippageChange() {
  try {
    var sel = document.getElementById('swapSlippagePct');
    var v = sel ? parseFloat(sel.value) : NaN;
    if (isFinite(v) && v > 0) localStorage.setItem('ww_swap_slippage_pct_v1', String(v));
  } catch (_s) { wwQuiet(_s); }
  calcSwap();
}

function calcSwap() {
  const amtIn = parseFloat(_safeEl('swapAmountIn').value)||0;
  // 用实时价格（已由 loadSwapPrices 更新）
  const pFrom = swapFrom.price || 1;
  const pTo = swapTo.price || 1;
  const fee = amtIn * 0.003;
  const amtOut = ((amtIn - fee) * pFrom / pTo);
  const slipPct = typeof wwGetSwapSlippagePct === 'function' ? wwGetSwapSlippagePct() : 0.5;
  const minOut = amtIn > 0 ? amtOut * (1 - (isFinite(slipPct) && slipPct > 0 ? slipPct : 0.5) / 100) : 0;
  const outDp = swapTo.id === 'trx' ? 2 : (amtOut > 1 ? 4 : 8);
  const minDp = swapTo.id === 'trx' ? 2 : (minOut > 1 ? 4 : 8);
  const fmt = amtOut.toFixed(outDp);
  (_safeEl('swapAmountOut') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* swapAmountOut fallback */.textContent = fmt;
  var minEl = _safeEl('swapMinOut');
  if (minEl) minEl.textContent = amtIn > 0 ? minOut.toFixed(minDp) : '—';
  (_safeEl('swapInUSD') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* swapInUSD fallback */.textContent = '$'+(amtIn*pFrom).toFixed(2);
  (_safeEl('swapOutUSD') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* swapOutUSD fallback */.textContent = '$'+((amtIn-fee)*pFrom).toFixed(2);
  (_safeEl('swapFee') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* swapFee fallback */.textContent = `0.30%（${fee.toFixed(4)} ${swapFrom.name}）`;
  // 更新汇率显示
  const rate = pFrom / pTo;
  const rateEl = (_safeEl('swapRateInfo') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* swapRateInfo fallback */;
  if (rateEl) {
    const rateStr = swapTo.id === 'trx' ? rate.toFixed(2) : (rate > 1 ? rate.toFixed(4) : rate.toFixed(8));
    rateEl.textContent = `1 ${swapFrom.name} ≈ ${rateStr} ${swapTo.name}`;
  }
  try { if(typeof updateCrossChainSwapCompare==='function') updateCrossChainSwapCompare(); } catch (_cc) { wwQuiet(_cc); }
}

// 从 CoinGecko 拉实时价格
const COIN_GECKO_IDS = { usdt:'tether', trx:'tron', eth:'ethereum', btc:'bitcoin', bnb:'binancecoin' };
async function loadSwapPrices() {
  try {
    const ids = ['tether','tron','ethereum','bitcoin','binancecoin'].join(',');
    const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
    const d = await r.json();
    const priceMap = { usdt: d.tether?.usd||1, trx: d.tron?.usd||0.12, eth: d.ethereum?.usd||2500, btc: d.bitcoin?.usd||60000, bnb: d.binancecoin?.usd||400 };
    // 更新 COINS 价格
    COINS.forEach(coin => { if(priceMap[coin.id]) coin.price = priceMap[coin.id]; });
    calcSwap();
    try { if(typeof updateCrossChainSwapCompare==='function') updateCrossChainSwapCompare(); } catch (_cc2) { wwQuiet(_cc2); }
    console.log('兑换价格已更新');
  } catch(e) { console.log('价格加载失败，使用默认'); }
}

function swapCoins() {
  const tmp=swapFrom; swapFrom=swapTo; swapTo=tmp;
  const btn=_safeEl('swapArrowBtn');
  if (btn) {
    btn.style.transform='rotate(180deg)';
    setTimeout(function(){ btn.style.transform=''; },300);
  }
  renderSwapUI(); calcSwap();
}

function setSwapMax() {
  var inp = _safeEl('swapAmountIn');
  if (inp) inp.value = swapFrom.bal != null ? String(swapFrom.bal) : '';
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
    div.innerHTML='<div style="width:36px;height:36px;border-radius:50%;background:'+coin.bg+';display:flex;align-items:center;justify-content:center;font-size:18px;overflow:hidden;flex-shrink:0">'+wwCoinIconHtml(coin)+'</div><div class="u4"><div style="font-size:15px;font-weight:600;color:var(--text)">'+coin.name+'</div><div style="font-size:11px;color:var(--text-muted)">'+coin.chain+'</div></div><div class="u6"><div style="font-size:14px;color:var(--text)">'+coin.bal.toLocaleString()+'</div></div>';
    div.onclick=()=>{setSwapCoin(pickerTarget,coin);closeCoinPicker();};
    list.appendChild(div);
  });
  const _ovcoinPi = document.getElementById('coinPickerOverlay'); if(_ovcoinPi) _ovcoinPi.classList.add('show');
}

function closeCoinPicker() { const _ovcoinPi2 = document.getElementById('coinPickerOverlay'); if(_ovcoinPi2) _ovcoinPi2.classList.remove('show'); }

function wwSwapRecipientModeOn() {
  var row = document.getElementById('swapRecipientRow');
  return !!(row && row.getAttribute('data-open') === '1');
}

function wwValidateTronAddress58(s) {
  return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(String(s || '').trim());
}
function wwValidateEvmSwapRecipient(s) {
  return /^0x[a-fA-F0-9]{40}$/.test(String(s || '').trim());
}

/** 兑换页：将「兑换到他人地址」展开为输入框，再次点击收起 */
function wwSwapToOtherToggle() {
  var row = document.getElementById('swapRecipientRow');
  var btn = document.getElementById('swapToOtherBtn');
  if (!row || !btn) return;
  var on = row.getAttribute('data-open') === '1';
  if (!on) {
    row.setAttribute('data-open', '1');
    row.style.display = 'block';
    btn.textContent = '收起';
    try { btn.setAttribute('aria-expanded', 'true'); } catch (_e) { wwQuiet(_e); }
    var inp = document.getElementById('swapRecipientTrx');
    if (inp) try { inp.focus(); } catch (_e2) { wwQuiet(_e2); }
  } else {
    row.setAttribute('data-open', '0');
    row.style.display = 'none';
    var inp2 = document.getElementById('swapRecipientTrx');
    if (inp2) inp2.value = '';
    btn.textContent = '兑换到他人地址';
    try { btn.setAttribute('aria-expanded', 'false'); } catch (_e3) { wwQuiet(_e3); }
  }
}

function doSwap() {
  const amt = parseFloat(_safeEl('swapAmountIn').value)||0;
  if(!amt) {
    if (typeof showToast === 'function') showToast('请输入兑换金额', 'warning');
    return;
  }
  if (wwSwapRecipientModeOn()) {
    var raw = ((_safeEl('swapRecipientTrx') || {}).value || '').trim();
    var tronPair = ['trx', 'usdt'].includes(swapFrom.id) && ['trx', 'usdt'].includes(swapTo.id);
    if (tronPair) {
      if (!wwValidateTronAddress58(raw)) {
        if (typeof showToast === 'function') showToast('请输入有效的 TRON 收款地址（T 开头 34 位）', 'warning');
        return;
      }
    } else {
      if (!wwValidateEvmSwapRecipient(raw)) {
        if (typeof showToast === 'function') showToast('请输入有效的以太坊收款地址（0x 开头 42 位）', 'warning');
        return;
      }
    }
    try { window._wwSwapRecipientAddr = raw; } catch (_w) { wwQuiet(_w); }
  } else {
    try { window._wwSwapRecipientAddr = ''; } catch (_w2) { wwQuiet(_w2); }
  }
  const out = (_safeEl('swapAmountOut') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* swapAmountOut fallback */.textContent;

  // 显示确认弹窗
  const overlay = document.getElementById('swapConfirmOverlay');
  if(overlay) {
    _safeEl('swapConfirmFrom').textContent = amt + ' ' + swapFrom.name;
    _safeEl('swapConfirmTo').textContent = out + ' ' + swapTo.name;
    var pr = swapTo.price ? (swapFrom.price/swapTo.price) : 0;
    _safeEl('swapConfirmRate').textContent = '1 ' + swapFrom.name + ' ≈ ' + (isFinite(pr) ? (swapTo.id === 'trx' ? pr.toFixed(2) : pr.toFixed(8)) : '—') + ' ' + swapTo.name;
    overlay.classList.add('show');
  } else {
    openDex();
  }
}

function closeSwapConfirm() {
  var o = document.getElementById('swapConfirmOverlay');
  if (o) o.classList.remove('show');
  try { delete window._wwSwapRecipientAddr; } catch (_c) { wwQuiet(_c); }
}

function openDex() {
  const closeOverlay = document.getElementById('swapConfirmOverlay');
  if(closeOverlay) closeOverlay.classList.remove('show');

  try { sessionStorage.setItem('ww_swap_pending', '1'); } catch (_s) { wwQuiet(_s); }

  var recip = '';
  try { recip = String(window._wwSwapRecipientAddr || '').trim(); } catch (_r) { wwQuiet(_r); }
  try { delete window._wwSwapRecipientAddr; } catch (_r2) { wwQuiet(_r2); }

  const isTron = ['trx','usdt'].includes(swapFrom.id) && ['trx','usdt'].includes(swapTo.id);
  const COIN_ADDRS = {
    trx: 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb', // TRX
    usdt: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',  // USDT TRC20
    eth: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // ETH
  };

  if(isTron) {
    // SunSwap (Tron DEX)；recipient 由界面传入时在 URL 中携带（若前端忽略则不影响打开）
    const fromAddr = COIN_ADDRS[swapFrom.id] || '';
    const toAddr = COIN_ADDRS[swapTo.id] || '';
    let url = `https://sunswap.com/#/v3?inputCurrency=${fromAddr}&outputCurrency=${toAddr}`;
    if (recip) url += '&recipient=' + encodeURIComponent(recip);
    window.open(url, '_blank');
  } else {
    // Uniswap
    const UNISWAP_TOKENS = {
      usdt: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      usdt_eth: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      eth: 'ETH',
      btc: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
      bnb: '0xB8c77482e45F1F44dE1745F52C74426C631bDD52',
      usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
    };
    const inToken = UNISWAP_TOKENS[swapFrom.id] || swapFrom.id.toUpperCase();
    const outToken = UNISWAP_TOKENS[swapTo.id] || swapTo.id.toUpperCase();
    let u = `https://app.uniswap.org/swap?inputCurrency=${inToken}&outputCurrency=${outToken}`;
    if (recip) u += '&recipient=' + encodeURIComponent(recip);
    window.open(u, '_blank');
  }
}

(function wwSwapReturnRefresh() {
  try {
    if (window._wwSwapVisBound) return;
    window._wwSwapVisBound = true;
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) return;
      try {
        if (sessionStorage.getItem('ww_swap_pending') !== '1') return;
        sessionStorage.removeItem('ww_swap_pending');
        if (typeof loadBalances === 'function') loadBalances();
        if (typeof showToast === 'function') showToast('已从外链返回，正在同步余额…', 'info', 2600);
      } catch (_e) { wwQuiet(_e); }
    });
  } catch (_e2) { wwQuiet(_e2); }
})();

(function wwTabIndicatorOnResize() {
  try {
    if (window._wwTabIndResize) return;
    window._wwTabIndResize = true;
    window.addEventListener('resize', function () {
      try {
        if (typeof wwUpdateTabBarIndicator === 'function') wwUpdateTabBarIndicator();
      } catch (_e) { wwQuiet(_e); }
    }, { passive: true });
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(function () {
        try {
          if (typeof wwUpdateTabBarIndicator === 'function') wwUpdateTabBarIndicator();
        } catch (_e2) { wwQuiet(_e2); }
      }, 0);
    } else {
      document.addEventListener('DOMContentLoaded', function () {
        setTimeout(function () {
          try {
            if (typeof wwUpdateTabBarIndicator === 'function') wwUpdateTabBarIndicator();
          } catch (_e3) { wwQuiet(_e3); }
        }, 0);
      });
    }
  } catch (_e4) { wwQuiet(_e4); }
})();


// ── 导入钱包 ──────────────────────────────────────────────────
function initImportGrid(count) {
  count = count || 12;
  importGridWordCount = count;
  const grid = document.getElementById('importGrid');
  if(!grid) return;
  grid.innerHTML = '';
  for(let i = 0; i < count; i++) {
    const div = document.createElement('div');
    div.style.cssText = 'background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:8px;display:flex;flex-direction:column;align-items:center;gap:3px';
    div.innerHTML = `
      <span style="font-size:9px;color:var(--text-muted)">${i+1}</span>
      <input id="iw_${i}" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
        style="width:100%;background:none;border:none;outline:none;font-size:12px;color:var(--text);text-align:center;font-family:inherit"
        oninput="syncImportPaste()"
        onkeydown="if(event.key===' '||event.key==='Enter'){event.preventDefault();document.getElementById('iw_${Math.min(i+1,11)}')&&document.getElementById('iw_${Math.min(i+1,11)}').focus();}">
    `;
    grid.appendChild(div);
  }
}

function syncImportGrid(text) {
  const words = text.trim().split(/[\s,]+/).filter(w => w);
  const validLengths = [12, 15, 18, 21, 24];
  // 自动调整格子数
  const targetLen = validLengths.find(l => l >= words.length) || 12;
  initImportGrid(targetLen);
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
  const words = [];
  const syncLen = importGridWordCount || 12;
  for(let i = 0; i < syncLen; i++) {
    const inp = document.getElementById('iw_' + i);
    words.push(inp ? inp.value.trim() : '');
  }
  const paste = document.getElementById('importPaste');
  if(paste) paste.value = words.filter(w=>w).join(' ');
  updateImportWordCount();
}

function copyAllMnemonic(btn) {
  const words = [];
  const isEn = currentLang === 'en';
  if(isEn) {
    const mn = REAL_WALLET && REAL_WALLET.enMnemonic;
    if(mn) mn.split(' ').forEach(w => words.push(w));
  } else {
    const wl = WT_WORDLISTS[currentLang];
    const enMn = REAL_WALLET && REAL_WALLET.enMnemonic;
    if(wl && enMn) {
      enMn.split(' ').forEach(enW => {
        const enIdx = WT_WORDLISTS.en.indexOf(enW);
        words.push(enIdx >= 0 && wl[enIdx] ? wl[enIdx] : enW);
      });
    }
  }
  if(!words.length) return;
  const text = words.join(' ');
  navigator.clipboard.writeText(text).then(() => {
    const prev = btn.textContent;
    btn.textContent = '✅ 已复制';
    setTimeout(() => { btn.textContent = prev; }, 2000);
  }).catch(() => {
    // fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    const prev = btn.textContent;
    btn.textContent = '✅ 已复制';
    setTimeout(() => { btn.textContent = prev; }, 2000);
  });
}



// ── 从导入格子获取助记词 ──────────────────────────────────────────
function getMnemonicFromGrid() {
  const len = importGridWordCount || 12;
  const words = [];
  // 先尝试从 textarea 粘贴区读取
  const paste = document.getElementById('importPaste');
  if(paste && paste.value.trim()) {
    const pasted = paste.value.trim().split(/\s+/);
    if([12,15,18,21,24].includes(pasted.length)) return pasted.join(' ');
  }
  // 从格子读取
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

// ── 二维码生成 ──────────────────────────────────────────────────
function wwDrawQrCanvasPlaceholder(canvas, msg) {
  try {
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#888888';
    ctx.font = '11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(msg || '…', canvas.width / 2, canvas.height / 2);
  } catch (_e) { wwQuiet(_e); }
}

function generateQRCode(text, canvasId) {
  var id = canvasId || 'qrCanvas';
  var container = document.getElementById('qrCodeContainer');
  var canvas = document.getElementById(id);
  if (container && (!canvas || canvas.tagName !== 'CANVAS')) {
    container.innerHTML = '<canvas id="qrCanvas" width="130" height="130"></canvas>';
    canvas = document.getElementById(id);
  }
  if (!canvas || canvas.tagName !== 'CANVAS') return;
  var payload = String(text || '');
  loadQRCodeLib()
    .then(function () {
      if (typeof QRCode !== 'undefined' && QRCode.toCanvas) {
        QRCode.toCanvas(
          canvas,
          payload,
          {
            width: 130,
            margin: 1,
            color: { dark: '#000000', light: '#ffffff' }
          },
          function (err) {
            if (err) {
              console.error('QR error:', err);
              wwDrawQrCanvasPlaceholder(canvas, 'QR');
            }
          }
        );
      } else {
        wwDrawQrCanvasPlaceholder(canvas, 'QR');
      }
    })
    .catch(function (e) {
      console.error('QR lib:', e);
      wwDrawQrCanvasPlaceholder(canvas, 'QR');
    });
}

// 更新二维码（当地址改变时调用）
function ethFloatToWeiString(v) {
  if (!isFinite(v) || v <= 0) return '0';
  const s = v.toFixed(18);
  const i = s.indexOf('.');
  const whole = i < 0 ? s : s.slice(0, i);
  const frac = i < 0 ? '' : s.slice(i + 1, i + 1 + 18);
  const w = (whole.replace(/^0+/, '') || '0') + frac.padEnd(18, '0').slice(0, 18);
  return w.replace(/^0+/, '') || '0';
}
function buildReceiveQrPayload(chain, addr, amountRaw) {
  if (!addr) return '';
  const raw = (document.getElementById('qrReceiveAmount') && document.getElementById('qrReceiveAmount').value) || amountRaw || '';
  const amt = parseFloat(String(raw).replace(',', '.'));
  const hasAmt = !isNaN(amt) && amt > 0;
  if (!hasAmt) return addr;
  if (chain === 'trx') {
    const sun = Math.round(amt * 1e6);
    if (!isFinite(sun) || sun <= 0) return addr;
    return 'tron:' + addr + '?amount=' + sun;
  }
  if (chain === 'eth') {
    const wei = ethFloatToWeiString(amt);
    return 'ethereum:' + addr + '?value=' + wei;
  }
  return addr;
}
function updateQRCode() {
  var vwQ = typeof wwGetChainViewWallet === 'function' ? wwGetChainViewWallet() : null;
  if (!vwQ && typeof REAL_WALLET !== 'undefined') vwQ = REAL_WALLET;
  if (!vwQ) return;
  if (typeof wwWalletHasAnyChainAddress === 'function' && !wwWalletHasAnyChainAddress(vwQ)) return;
  var sel = document.getElementById('qrChainSelect');
  var chain = sel ? sel.value || 'trx' : 'trx';
  var addr = '';
  if (chain === 'trx') addr = vwQ.trxAddress || '';
  else if (chain === 'eth') addr = vwQ.ethAddress || '';
  if (addr) generateQRCode(buildReceiveQrPayload(chain, addr), 'qrCanvas');
  else {
    var c = document.getElementById('qrCanvas');
    if (c) wwDrawQrCanvasPlaceholder(c, '…');
  }
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
  var col = (typeof wwTxSanitizeColor === 'function' ? wwTxSanitizeColor(tx.color) : 'inherit');
  return (
    '<div class="ww-tx-history-row" role="button" tabindex="0" data-coin="' + coinAttr + '" data-hash="' + hashAttr + '"' +
    ' style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:12px 14px;margin-bottom:8px;display:flex;align-items:center;gap:12px;cursor:pointer;transition:opacity 0.2s">' +
    '<div style="width:36px;height:36px;border-radius:50%;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">' + iconEscaped + '</div>' +
    '<div style="flex:1;min-width:0">' +
    '<div style="font-size:13px;font-weight:600;color:var(--text)">' + typeEscaped + ' ' + coinEscaped + '</div>' +
    '<div style="font-size:11px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + addrEscaped + '</div>' +
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
  try { if(typeof updateReputationSettingsRow==='function') updateReputationSettingsRow(); } catch (_rep2) { wwQuiet(_rep2); }
}

function applyTxHistoryFilter() {
  renderTxHistoryFromCache();
}

function getWalletSecurityBreakdown() {
  var pinOk = false;
  try {
    pinOk = wwHasPinConfigured();
  } catch (e) { wwQuiet(e); }
  var backed = false;
  try {
    if (REAL_WALLET && REAL_WALLET.backedUp) backed = true;
    else {
      var w = JSON.parse(localStorage.getItem('ww_wallet') || '{}');
      backed = !!w.backedUp;
    }
  } catch (e) { wwQuiet(e); }
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
  if (c === 'USDT' || c === 'TRC USDT') return amtN * (parseFloat(cg.usdt) || 1);
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
  try { if (REAL_WALLET && REAL_WALLET.trxAddress) selfTron = wwNormAddr(REAL_WALLET.trxAddress); } catch (e3) { wwQuiet(e3); }
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
    } catch (e4) { wwQuiet(e4); }
  });
  try { localStorage.setItem('ww_whale_seen_v1', JSON.stringify(seen)); } catch (e5) { wwQuiet(e5); }
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
  if (cfg.day !== d) { cfg.day = d; cfg.usedUsd = 0; try { localStorage.setItem('ww_spend_limit_v1', JSON.stringify(cfg)); } catch (e2) { wwQuiet(e2); } }
  var lim = parseFloat(cfg.dailyUsd) || 0;
  if (!(lim > 0)) return true;
  var est = wwEstUsdForTransfer(amtNum);
  var used = parseFloat(cfg.usedUsd) || 0;
  if (used + est <= lim + 1e-6) return true;
  var pin = prompt('本笔约 $' + est.toFixed(2) + '，今日已累计约 $' + used.toFixed(2) + '，已超过每日限额 $' + lim.toFixed(2) + '。输入 6 位 PIN 以本次继续');
  if (pin === null) return false;
  if (typeof verifyPin === 'function') {
    var ok = await verifyPin(pin);
    if (ok) { wwSetSessionPin(pin); return true; }
    if (typeof showToast === 'function') showToast('PIN 不正确或未设置 PIN', 'error');
    return false;
  }
  var saved = wwGetSessionPin();
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
  try { localStorage.setItem('ww_spend_limit_v1', JSON.stringify(cfg)); } catch (e2) { wwQuiet(e2); }
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
  try { localStorage.setItem('ww_spend_limit_v1', JSON.stringify(o)); } catch (e2) { wwQuiet(e2); }
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
  try { localStorage.setItem('ww_whale_v1', JSON.stringify(o)); } catch (e) { wwQuiet(e); }
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
  } catch (e) { wwQuiet(e); }
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
  } catch (e) { wwQuiet(e); }
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
  } catch (e2) { wwQuiet(e2); }
}

function wwBridgeOpenStargate() {
  try {
    if (typeof window !== 'undefined' && window.open) window.open('https://www.stargate.finance/', '_blank', 'noopener,noreferrer');
    else location.href = 'https://www.stargate.finance/';
  } catch (e) { wwQuiet(e); }
  if (typeof showToast === 'function') showToast('请在桥接站点选择网络与代币，并核对合约', 'info', 3200);
}

function wwBridgeOpenTronDocs() {
  try {
    if (typeof window !== 'undefined' && window.open) window.open('https://developers.tron.network/', '_blank', 'noopener,noreferrer');
    else location.href = 'https://developers.tron.network/';
  } catch (e) { wwQuiet(e); }
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
  try { localStorage.removeItem('ww_vesting_demo_v1'); } catch (e) { wwQuiet(e); }
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
  try { if (window.open) window.open('https://support.ledger.com/', '_blank', 'noopener,noreferrer'); } catch (e) { wwQuiet(e); }
  if (typeof showToast === 'function') showToast('请在官方支持页查看设备与链兼容说明', 'info', 2800);
}

function wwOpenTrezorSupport() {
  try { if (window.open) window.open('https://trezor.io/learn/', '_blank', 'noopener,noreferrer'); } catch (e) { wwQuiet(e); }
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
  setTimeout(function () { try { URL.revokeObjectURL(a.href); document.body.removeChild(a); } catch (e2) { wwQuiet(e2); } }, 800);
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
  } catch (e2) { wwQuiet(e2); }
  wwCopyTradingRenderList();
}

function wwCopyTradingSave() {
  var ta = document.getElementById('wwCopyWatchInput');
  if (!ta) return;
  var lines = String(ta.value || '').split(/[\n,;\s]+/).map(function (s) { return s.trim(); }).filter(Boolean);
  var ar = lines.map(function (addr) { return { addr: addr }; });
  try { localStorage.setItem('ww_copy_watch_v1', JSON.stringify(ar)); } catch (e) { wwQuiet(e); }
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
  try { localStorage.setItem('ww_copy_watch_v1', JSON.stringify(ar)); } catch (e2) { wwQuiet(e2); }
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
      '<button type="button" class="btn-secondary" style="align-self:flex-start;padding:8px 14px;font-size:12px" onclick="try{window.open(\'' + it.u + '\',\'_blank\',\'noopener,noreferrer\');}catch (e) { wwQuiet(e); }">了解详情</button></div>';
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
  var apy = { 'TRC USDT': 4.2, 'USDT (ERC-20)': 4.2, TRX: 4.8, ETH: 3.6, BTC: 2.9 };
  var top = null;
  var bestA = 0;
  parts.forEach(function (p) {
    var a = apy[p.l] != null ? apy[p.l] : 3.5;
    if (a > bestA && p.v > 0) { bestA = a; top = p.l; }
  });
  hint.innerHTML = '当前组合参考总市值约 <b style="color:var(--text)">$' + total.toFixed(2) + '</b>。' +
    (top ? ' 占比最高的可优化资产侧重：<b style="color:var(--gold)">' + top + '</b>（参考 APY ' + bestA.toFixed(1) + '%）。' : '');
  var strategies = [
    { n: '稳定币理财 / 货币市场', apy: '3.5–5%', fit: 'TRC USDT', note: '适合大额 TRC USDT，注意合约与平台信用风险' },
    { n: '原生链质押（ETH / TRX）', apy: '3–6%', fit: 'ETH,TRX', note: '流动性质押或节点委托，需解锁期与罚没规则' },
    { n: '流动性挖矿（AMM）', apy: '变动大', fit: 'TRC USDT,ETH', note: '无常损失与智能合约风险较高' }
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
  try { localStorage.setItem('ww_identity_v1', JSON.stringify(o)); } catch (e2) { wwQuiet(e2); }
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
  } catch (e) { wwQuiet(e); }
  if (typeof showToast === 'function') showToast('在 Uniswap 使用 WalletConnect 连接与上述相同的地址', 'info', 3600);
}

function wwOpenDexSunswap() {
  try {
    if (typeof window !== 'undefined' && window.open) window.open('https://sunswap.com/#/home', '_blank', 'noopener,noreferrer');
    else location.href = 'https://sunswap.com/#/home';
  } catch (e) { wwQuiet(e); }
  if (typeof showToast === 'function') showToast('在 SunSwap 使用 TronLink / WalletConnect', 'info', 3200);
}

function wwOpenDexOneinch() {
  try {
    if (typeof window !== 'undefined' && window.open) window.open('https://app.1inch.io/', '_blank', 'noopener,noreferrer');
    else location.href = 'https://app.1inch.io/';
  } catch (e) { wwQuiet(e); }
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
  try { localStorage.setItem('ww_social_contacts_v1', JSON.stringify(ar)); } catch (e2) { wwQuiet(e2); }
  wwSocialRecoveryRender();
  if (typeof updateSettingsPage === 'function') updateSettingsPage();
}
function wwSocialRemoveContact(idx) {
  var ar = [];
  try { ar = JSON.parse(localStorage.getItem('ww_social_contacts_v1') || '[]'); } catch (e) { ar = []; }
  if (!Array.isArray(ar) || idx < 0 || idx >= ar.length) return;
  ar.splice(idx, 1);
  try { localStorage.setItem('ww_social_contacts_v1', JSON.stringify(ar)); } catch (e2) { wwQuiet(e2); }
  wwSocialRecoveryRender();
  if (typeof updateSettingsPage === 'function') updateSettingsPage();
}
function wwSocialSaveFromUI() {
  if (typeof showToast === 'function') showToast('联系人已保存在本机', 'success');
  if (typeof updateSettingsPage === 'function') updateSettingsPage();
}

// ── 交易历史 ──────────────────────────────────────────────────
async function loadTxHistory() {
  if(!REAL_WALLET) return;
  const el = document.getElementById('txHistoryList');
  if(!el) return;
  el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px">⏳ 加载中...</div>';

  try {
    const txs = [];

    // TRX 转账记录
    const trxAddr = REAL_WALLET.trxAddress;
    if(trxAddr && trxAddr.startsWith('T')) {
      const r1 = await fetch(`https://api.trongrid.io/v1/accounts/${trxAddr}/transactions/trc20?limit=10&contract_address=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`);
      const d1 = await r1.json();
      if(d1.data) {
        for(const tx of d1.data.slice(0,5)) {
          const isOut = tx.from === trxAddr;
          const amt = (parseInt(tx.value) / 1e6).toFixed(2);
          txs.push({
            icon: isOut ? '📤' : '📥',
            type: isOut ? '转出' : '转入',
            coin: 'TRC USDT',
            amount: (isOut?'-':'+') + amt,
            addr: isOut ? tx.to : tx.from,
            time: new Date(tx.block_timestamp).toLocaleDateString('zh-CN'),
            hash: tx.transaction_id,
            color: isOut ? '#e05c5c' : '#26a17b'
          });
        }
      }

      // TRX 原生交易
      const r2 = await fetch(`https://api.trongrid.io/v1/accounts/${trxAddr}/transactions?limit=5&only_confirmed=true`);
      const d2 = await r2.json();
      if(d2.data) {
        for(const tx of d2.data.slice(0,3)) {
          const contract = tx.raw_data?.contract?.[0];
          if(contract?.type !== 'TransferContract') continue;
          const val = contract.parameter?.value;
          if(!val) continue;
          const isOut = val.owner_address && TronWeb?.address?.fromHex(val.owner_address) === trxAddr;
          const amt = ((val.amount||0) / 1e6).toFixed(2);
          txs.push({
            icon: isOut ? '📤' : '📥',
            type: isOut ? '转出' : '转入',
            coin: 'TRX',
            amount: (isOut?'-':'+') + amt,
            addr: val.to_address ? (typeof TronWeb!=='undefined'?TronWeb.address.fromHex(val.to_address):val.to_address) : '',
            time: new Date(tx.raw_data.timestamp).toLocaleDateString('zh-CN'),
            hash: tx.txID,
            color: isOut ? '#e05c5c' : '#e84142'
          });
        }
      }
    }

    if(txs.length === 0) {
      try { window._wwTxHistoryCache = []; } catch (_c) { wwQuiet(_c); }
      el.innerHTML = txHistoryEmptyHtml();
      return;
    }
    try { window._wwTxHistoryCache = txs; } catch (_c2) { wwQuiet(_c2); }
    try { if (typeof wwCheckWhaleTxHistory === 'function') wwCheckWhaleTxHistory(txs); } catch (_wh) { wwQuiet(_wh); }
    renderTxHistoryFromCache();

  } catch(e) {
    console.error('加载交易记录失败:', e);
    const en = (typeof currentLang !== 'undefined' && currentLang === 'en');
    el.innerHTML = txHistoryFriendlyHtml(
      '📡',
      en ? 'Couldn\'t load activity' : '暂时无法加载记录',
      en ? 'Check your connection and tap Refresh above to try again.' : '请检查网络后点上方「刷新」重试。若网络正常仍无记录，稍等片刻再试。'
    );
  }
}


// ── 礼物记录 ──────────────────────────────────────────────────
function loadHbRecords() {
  const el = document.getElementById('hbRecordsList');
  if(!el) return;

  const allHb = JSON.parse(localStorage.getItem('ww_hongbaos') || '{}');
  const list = Object.values(allHb).sort((a,b) => b.createdAt - a.createdAt);

  if(list.length === 0) {
    el.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);font-size:13px"><div class="u10">🎁</div>暂无礼物记录</div>';
    return;
  }

  const now = Date.now();
  el.innerHTML = list.map(hb => {
    const claimed = hb.claimed?.length || 0;
    const total = hb.count || 1;
    const pct = Math.round(claimed / total * 100);
    const expired = now > hb.expireAt;
    const fullyClaimed = claimed >= total;
    const timeAgo = formatTimeAgo(hb.createdAt);
    const statusText = fullyClaimed ? '🏆 已领完' : expired ? '⏰ 已过期' : `${claimed}/${total} 已领取`;
    const statusColor = fullyClaimed ? 'var(--gold)' : expired ? 'var(--text-muted)' : 'var(--green,#26a17b)';
    const opacity = (expired || fullyClaimed) ? '0.7' : '1';
    const typeLabel = hb.type === 'lucky' ? '随机礼物' : '普通礼物';

    return `
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:14px 16px;margin-bottom:10px;opacity:${opacity}">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:${fullyClaimed||expired?'0':'10px'}">
          <span style="font-size:28px">🎁</span>
          <div class="u4">
            <div style="font-size:14px;font-weight:600;color:var(--text)">${hb.keyword}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${typeLabel} · ${timeAgo}${expired?' · 已过期':''}</div>
          </div>
          <div class="u6">
            <div style="font-size:14px;font-weight:600;color:var(--gold)">${hb.totalAmount} TRC USDT</div>
            <div style="font-size:11px;color:${statusColor}">${statusText}</div>
          </div>
        </div>
        ${!fullyClaimed && !expired ? `
        <div style="background:var(--bg3);border-radius:6px;height:4px;overflow:hidden">
          <div style="background:linear-gradient(90deg,#c8a84b,#f0d070);height:100%;width:${pct}%;border-radius:6px;transition:width 0.5s"></div>
        </div>` : ''}
        ${hb.claimed && hb.claimed.length > 0 ? `
        <div style="margin-top:10px;border-top:1px solid var(--border);padding-top:8px">
          ${hb.claimed.map((cl, i) => `
          <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);padding:2px 0">
            <span>第 ${i+1} 个：${cl.addr.slice(0,8)}...${cl.addr.slice(-4)}</span>
            <span style="color:var(--gold)">+${parseFloat(cl.amount).toFixed(2)} TRC USDT</span>
          </div>`).join('')}
        </div>` : ''}
      </div>
    `;
  }).join('');

  el.innerHTML += '<div style="text-align:center;font-size:12px;color:var(--text-muted);margin-top:10px;padding-bottom:20px">· 共 ' + list.length + ' 条记录 ·</div>';
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



// ── 安全 getElementById（防止 null 导致崩溃）──────────────────────
/* const _origGetEl: wallet.ui.js */
document.getElementById = function(id) {
  const el = _origGetEl(id);
  return el; // 返回真实元素或 null，调用处自行处理
};

// 批量修复：确保所有已知缺失 id 有默认处理
// _safeEl moved to top of script

// ── Toast 提示系统（替换 alert）──────────────────────────────
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
/* let priceCache: wallet.ui.js */
/* let priceCacheTime: wallet.ui.js */

function drawHomeBalanceChart(totalUsd) {
  const wrap = document.getElementById('homeBalanceChartWrap');
  const svg = document.getElementById('homeBalanceChartSvg');
  const foot = document.getElementById('homeBalanceChartFoot');
  if(!wrap || !svg) return;
  const t = Number(totalUsd);
  if(!t || t <= 0 || !isFinite(t)) {
    try { window._wwHomeChartLastUsd = null; } catch (_z) { wwQuiet(_z); }
    wrap.style.display = 'none';
    return;
  }
  try {
    if (window._wwHomeChartLastUsd != null && Math.abs(t - window._wwHomeChartLastUsd) < 1e-6) return;
    window._wwHomeChartLastUsd = t;
  } catch (_ch) { wwQuiet(_ch); }
  wrap.style.display = 'block';
  const days = ['6天前','5天前','4天前','3天前','2天前','昨天','今天'];
  const seed = Math.abs(Math.sin((t % 1000) * 13.37));
  const pts = [];
  for(let i = 0; i < 7; i++) {
    const wobble = (i - 3) * 0.014 + (seed - 0.5) * 0.045;
    pts.push(Math.max(0, t * (1 + wobble)));
  }
  pts[6] = t;
  const min = Math.min.apply(null, pts) * 0.997;
  const max = Math.max.apply(null, pts) * 1.003;
  const W = 320, H = 72, padY = 8;
  const range = max - min || 1;
  const coords = pts.map(function(p, i) {
    const x = (i / (pts.length - 1)) * (W - 8) + 4;
    const y = padY + (1 - (p - min) / range) * (H - padY * 2);
    return [x, y];
  });
  let d = 'M ' + coords[0][0] + ',' + coords[0][1];
  for(let i = 1; i < coords.length; i++) d += ' L ' + coords[i][0] + ',' + coords[i][1];
  const area = 'M' + coords[0][0] + ',' + H + ' ' + coords.map(function(c) { return c[0] + ',' + c[1]; }).join(' ') + ' L' + coords[coords.length - 1][0] + ',' + H + ' Z';
  svg.innerHTML = '<defs><linearGradient id="hmChartGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(200,168,75,0.38)"/><stop offset="100%" stop-color="rgba(200,168,75,0)"/></linearGradient></defs><path d="' + area + '" fill="url(#hmChartGrad)"/><path d="' + d + '" fill="none" stroke="rgba(232,200,80,0.95)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
  if(foot) foot.innerHTML = '<span>' + days[0] + '</span><span>' + days[6] + '</span>';
}

function wwPricesFallbackFromCache() {
  if (priceCache) return priceCache;
  return { usdt: 1, trx: 0.12, eth: 3200, btc: 60000 };
}

async function getPrices() {
  /* 延长缓存：减少冷启动时 CoinGecko 往返 */
  if (priceCache && Date.now() - priceCacheTime < 15 * 60 * 1000) return priceCache;
  try {
    /* 一次请求含 24h 涨跌，供首页同步（避免 loadBalances 再打第二遍 CoinGecko） */
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=tether,tron,ethereum,bitcoin&vs_currencies=usd&include_24hr_change=true'
    );
    const data = await res.json();
    priceCache = {
      usdt: data.tether?.usd || 1,
      trx: data.tron?.usd || 0.12,
      eth: data.ethereum?.usd || 3200,
      btc: data.bitcoin?.usd || 60000,
      chgUsdt: data.tether && data.tether.usd_24h_change,
      chgTrx: data.tron && data.tron.usd_24h_change,
      chgEth: data.ethereum && data.ethereum.usd_24h_change,
      chgBtc: data.bitcoin && data.bitcoin.usd_24h_change
    };
    priceCacheTime = Date.now();
    return priceCache;
  } catch(e) {
    return { usdt: 1, trx: 0.12, eth: 3200, btc: 60000 };
  }
}

/** 首页并行拉取：TRX 账户 + USDT TRC20 */
async function wwFetchTrxAccountBalancesForHome(trxAddr) {
  var out = { trxBal: 0, usdtBal: 0 };
  if (!trxAddr) return out;
  try {
    var base = typeof wwTronGridBase === 'function' ? wwTronGridBase() : 'https://api.trongrid.io';
    var hdr = typeof wwTronHeaders === 'function' ? wwTronHeaders() : {};
    var trxRes = await fetch(base + '/v1/accounts/' + encodeURIComponent(trxAddr), { headers: hdr });
    var trxData = await trxRes.json();
    if (trxData.data && trxData.data[0]) {
      out.trxBal = (trxData.data[0].balance || 0) / 1e6;
      var trc20 = trxData.data[0].trc20 || [];
      var usdtToken = trc20.find(function (t) {
        return Object.keys(t)[0] === 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
      });
      if (usdtToken) out.usdtBal = parseInt(Object.values(usdtToken)[0], 10) / 1e6;
    }
  } catch (e) {
    console.log('TRX query failed:', e);
  }
  return out;
}

async function wwFetchEthBalanceForHome(ethAddr) {
  if (!ethAddr) return 0;
  try {
    if (typeof wwFetchEthJsonRpc === 'function') {
      var ethRes = await wwFetchEthJsonRpc({
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: [ethAddr, 'latest'],
        id: 1
      });
      var ethData = await ethRes.json();
      if (ethData.result) return parseInt(ethData.result, 16) / 1e18;
    } else {
      var ethRes2 = await fetch('https://eth.llamarpc.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_getBalance', params: [ethAddr, 'latest'], id: 1 })
      });
      var ethData2 = await ethRes2.json();
      if (ethData2.result) return parseInt(ethData2.result, 16) / 1e18;
    }
  } catch (e) {
    console.log('ETH query failed:', e);
  }
  return 0;
}

/** 主网 ERC-20 USDT（Tether）余额，与万语绑定的 ethAddress 对应 */
async function wwFetchErc20UsdtBalanceForHome(ethAddr) {
  if (!ethAddr || !/^0x[a-fA-F0-9]{40}$/.test(String(ethAddr).trim())) return 0;
  var contract = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
  var addr = String(ethAddr).trim();
  var data = '0x70a08231000000000000000000000000' + addr.slice(2).toLowerCase();
  try {
    var req = {
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [{ to: contract, data: data }, 'latest'],
      id: 1
    };
    if (typeof wwFetchEthJsonRpc === 'function') {
      var res = await wwFetchEthJsonRpc(req);
      var j = await res.json();
      if (j && j.result && j.result !== '0x') return parseInt(j.result, 16) / 1e6;
    } else {
      var res2 = await fetch('https://eth.llamarpc.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req)
      });
      var j2 = await res2.json();
      if (j2 && j2.result && j2.result !== '0x') return parseInt(j2.result, 16) / 1e6;
    }
  } catch (e) {
    console.log('ERC20 USDT query failed:', e);
  }
  return 0;
}

async function wwFetchBtcBalanceForHome(btcAddr) {
  if (!btcAddr) return 0;
  try {
    var btcRes = await fetch('https://mempool.space/api/address/' + encodeURIComponent(btcAddr));
    var btcData = await btcRes.json();
    var funded = (btcData.chain_stats && btcData.chain_stats.funded_txo_sum) || 0;
    var spent = (btcData.chain_stats && btcData.chain_stats.spent_txo_sum) || 0;
    return (funded - spent) / 1e8;
  } catch (e) {
    console.log('BTC query skipped');
  }
  return 0;
}

/** 与 wallet.html 内联首屏脚本共用：上次成功拉取的余额快照，避免每次进首页先被「同步中…」清空 */
var WW_HOME_BALANCE_SNAP_KEY = 'ww_home_balance_snap_v1';
function wwHomeBalanceSnapWalletId() {
  try {
    var w = REAL_WALLET;
    if (!w) return '';
    return String(w.trxAddress || '') + '|' + String(w.ethAddress || '');
  } catch (e) {
    return '';
  }
}
function wwReadHomeBalanceSnapRecord() {
  var wid = wwHomeBalanceSnapWalletId();
  if (!wid || wid === '|') return null;
  try {
    var raw = localStorage.getItem(WW_HOME_BALANCE_SNAP_KEY);
    if (!raw) return null;
    var h = JSON.parse(raw);
    if (!h || h.wid !== wid) return null;
    return h;
  } catch (e) {
    return null;
  }
}
function wwApplyHomeBalanceSnapRecord(h) {
  if (!h) return false;
  var tbd = document.getElementById('totalBalanceDisplay');
  var tbs = document.getElementById('totalBalanceSub');
  if (tbd) {
    tbd.classList.remove('home-balance--loading');
    if (h.totalTxt != null) tbd.textContent = h.totalTxt;
  }
  if (tbs && h.subTxt != null) tbs.textContent = h.subTxt;
  function setEl(id, v) {
    var el = document.getElementById(id);
    if (el && v != null) el.textContent = v;
  }
  setEl('balUsdt', h.balUsdt);
  setEl('valUsdt', h.valUsdt);
  setEl('balUsdtErc', h.balUsdtErc);
  setEl('valUsdtErc', h.valUsdtErc);
  setEl('balTrx', h.balTrx);
  setEl('valTrx', h.valTrx);
  setEl('balEth', h.balEth);
  setEl('valEth', h.valEth);
  setEl('balBtc', h.balBtc);
  setEl('valBtc', h.valBtc);
  function pinSnapChg(chgId, txt) {
    if (txt == null) return;
    setEl(chgId, txt);
    var chgEl = document.getElementById(chgId);
    if (chgEl) {
      if (String(txt).indexOf('-') === 0) {
        chgEl.classList.remove('up');
        chgEl.classList.add('down');
      } else {
        chgEl.classList.remove('down');
        chgEl.classList.add('up');
      }
    }
  }
  pinSnapChg('chgUsdt', h.chgUsdt);
  pinSnapChg('chgUsdtErc', h.chgUsdtErc != null ? h.chgUsdtErc : h.chgUsdt);
  pinSnapChg('chgTrx', h.chgTrx);
  pinSnapChg('chgEth', h.chgEth);
  pinSnapChg('chgBtc', h.chgBtc);
  if (typeof h.totalUsd === 'number' && isFinite(h.totalUsd)) {
    window._lastTotalUsd = h.totalUsd;
    if (typeof drawHomeBalanceChart === 'function' && h.totalUsd > 0) drawHomeBalanceChart(h.totalUsd);
  }
  if (typeof drawPortfolioPieChart === 'function' && h.totalUsd != null && isFinite(h.totalUsd) && h.totalUsd > 0) {
    drawPortfolioPieChart(
      h.usdtUsd || 0,
      h.usdtErcUsd != null && isFinite(h.usdtErcUsd) ? h.usdtErcUsd : 0,
      h.trxUsd || 0,
      h.ethUsd || 0,
      h.btcUsd || 0
    );
  }
  return true;
}
function wwPersistHomeBalanceSnapRecord(payload) {
  var wid = wwHomeBalanceSnapWalletId();
  if (!wid || wid === '|' || !payload) return;
  try {
    var o = Object.assign({ wid: wid, savedAt: Date.now() }, payload);
    localStorage.setItem(WW_HOME_BALANCE_SNAP_KEY, JSON.stringify(o));
    window._lastHomeBalSnap = o;
  } catch (e) { wwQuiet(e); }
}

async function loadBalances() {
  if (!REAL_WALLET) return;
  if (!REAL_WALLET.ethAddress && !REAL_WALLET.trxAddress && !REAL_WALLET.btcAddress) return;
  const tbd = document.getElementById('totalBalanceDisplay');
  const tbs = document.getElementById('totalBalanceSub');
  const btn = _safeEl('balRefreshBtn');
  window._wwHomeBalancesHydrated = false;
  try {
    if (typeof wwInitHomeAssetCardsFromCoins === 'function') wwInitHomeAssetCardsFromCoins();
  } catch (_wwi) { wwQuiet(_wwi); }
  var widSnap = wwHomeBalanceSnapWalletId();
  var snap =
    window._lastHomeBalSnap && window._lastHomeBalSnap.wid === widSnap
      ? window._lastHomeBalSnap
      : wwReadHomeBalanceSnapRecord();
  var hadSnap = snap && wwApplyHomeBalanceSnapRecord(snap);
  if (hadSnap) {
    window._wwHomeBalancesHydrated = true;
    if (typeof applyHideZeroTokens === 'function') applyHideZeroTokens();
  }

  if (!hadSnap) {
    if (tbd) tbd.classList.add('home-balance--loading');
    if (tbs) tbs.textContent = '同步中…';
    if (btn) btn.textContent = '查询中...';
    ['balUsdt', 'balUsdtErc', 'balTrx', 'balEth', 'balBtc'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = '...';
    });
  } else if (btn) {
    btn.textContent = '刷新';
  }

  try {
    const trxAddr = REAL_WALLET.trxAddress;
    const ethAddr = REAL_WALLET.ethAddress;
    const btcAddr = REAL_WALLET.btcAddress || '';

    /* 价格 + TRC / ETH 原生 / BTC / 主网 ERC20 USDT 并行 + 单路超时 */
    const [pricesRaw, trxRaw, ethRaw, btcRaw, usdtErcRaw] = await Promise.all([
      wwRaceMs(getPrices(), WW_HOME_NET_MS, wwPricesFallbackFromCache()),
      wwRaceMs(wwFetchTrxAccountBalancesForHome(trxAddr), WW_HOME_NET_MS_TRX, null),
      wwRaceMs(wwFetchEthBalanceForHome(ethAddr), WW_HOME_NET_MS, null),
      wwRaceMs(wwFetchBtcBalanceForHome(btcAddr), WW_HOME_NET_MS_BTC, null),
      wwRaceMs(wwFetchErc20UsdtBalanceForHome(ethAddr), WW_HOME_NET_MS, null)
    ]);
    const prices = pricesRaw || wwPricesFallbackFromCache();
    const trxPack =
      trxRaw === null ? window._wwLastTrxPack || { trxBal: 0, usdtBal: 0 } : trxRaw;
    let ethBal = ethRaw === null ? (typeof window._wwLastKnownEthBal === 'number' ? window._wwLastKnownEthBal : 0) : ethRaw;
    let btcBal = btcRaw === null ? (typeof window._wwLastKnownBtcBal === 'number' ? window._wwLastKnownBtcBal : 0) : btcRaw;
    let usdtErcBal =
      usdtErcRaw === null ? (typeof window._wwLastKnownUsdtErcBal === 'number' ? window._wwLastKnownUsdtErcBal : 0) : usdtErcRaw;
    try {
      window._wwLastTrxPack = { trxBal: trxPack.trxBal, usdtBal: trxPack.usdtBal };
      window._wwLastKnownEthBal = ethBal;
      window._wwLastKnownBtcBal = btcBal;
      window._wwLastKnownUsdtErcBal = usdtErcBal;
    } catch (_k) { wwQuiet(_k); }
    if (btcRaw === null && btcAddr) {
      setTimeout(function () {
        wwFetchBtcBalanceForHome(btcAddr).then(function (b) {
          try {
            window._wwLastKnownBtcBal = b;
            var fmt = function (n) {
              return n >= 1 ? n.toLocaleString('en', { maximumFractionDigits: 2 }) : n.toFixed(4);
            };
            var el = document.getElementById('balBtc');
            if (el) el.textContent = fmt(b);
          } catch (_b2) { wwQuiet(_b2); }
        });
      }, 0);
    }

    try {
      window._wwLastCgUsd = Object.assign({}, window._wwLastCgUsd || {}, {
        usdt: prices.usdt,
        trx: prices.trx,
        eth: prices.eth,
        btc: prices.btc
      });
    } catch (_cgusd) { wwQuiet(_cgusd); }

    let usdtBal = trxPack.usdtBal;
    let trxBal = trxPack.trxBal;

    // 更新UI
    const fmt = (n) => n >= 1 ? n.toLocaleString('en',{maximumFractionDigits:2}) : n.toFixed(4);
    const fmtUsd = (n) => '$' + (n >= 1 ? n.toLocaleString('en',{maximumFractionDigits:2}) : n.toFixed(2));

    const usdtUsd = usdtBal * prices.usdt;
    const usdtErcUsd = usdtErcBal * prices.usdt;
    const trxUsd = trxBal * prices.trx;
    const ethUsd = ethBal * prices.eth;
    const btcUsd = btcBal * (prices.btc || 60000);
    const total = usdtUsd + usdtErcUsd + trxUsd + ethUsd + btcUsd;

    const set = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
    set('balUsdt', fmt(usdtBal));
    set('valUsdt', fmtUsd(usdtUsd));
    set('balUsdtErc', fmt(usdtErcBal));
    set('valUsdtErc', fmtUsd(usdtErcUsd));
    set('balTrx', fmt(trxBal));
    set('valTrx', fmtUsd(trxUsd));
    set('balEth', fmt(ethBal));
    set('valEth', fmtUsd(ethUsd));
    set('balBtc', fmt(btcBal));
    set('valBtc', fmtUsd(btcUsd));
    try {
      const fmtChg = (v) => (v > 0 ? '+' : '') + Number(v).toFixed(2) + '%';
      function applyChgLine(chgId, changeVal) {
        if (changeVal === undefined || changeVal === null || !isFinite(Number(changeVal))) return;
        const txt = fmtChg(changeVal);
        const el = document.getElementById(chgId);
        if (!el) return;
        el.textContent = txt;
        if (String(txt).indexOf('-') === 0) {
          el.classList.remove('up');
          el.classList.add('down');
        } else {
          el.classList.remove('down');
          el.classList.add('up');
        }
      }
      applyChgLine('chgUsdt', prices.chgUsdt);
      applyChgLine('chgUsdtErc', prices.chgUsdt);
      applyChgLine('chgTrx', prices.chgTrx);
      applyChgLine('chgEth', prices.chgEth);
      applyChgLine('chgBtc', prices.chgBtc);
    } catch (e) { wwQuiet(e); }
    if(tbd) tbd.classList.remove('home-balance--loading');
    animateHomeUsdTo(total, fmtUsd);
    window._lastTotalUsd = total;
    drawHomeBalanceChart(total);
    // 动态汇率（从价格接口获取，fallback 7.2）
    const cnyRate = window._cnyRate || 7.2;
    set('totalBalanceSub', '≈ ' + (total * cnyRate).toFixed(0) + ' CNY · 实时价格');
    if (!window._cnyRate) {
      fetch('https://api.exchangerate-api.com/v4/latest/USD')
        .then(function (r) {
          return r.json();
        })
        .then(function (d) {
          window._cnyRate = d.rates && d.rates.CNY ? d.rates.CNY : 7.2;
        })
        .catch(function () {});
    }

    // ── 同步 COINS 余额（兑换页使用）──
    COINS.forEach(coin => {
      if(coin.id === 'usdt') { coin.bal = usdtBal; coin.price = prices.usdt || 1; }
      else if(coin.id === 'usdt_eth') { coin.bal = usdtErcBal; coin.price = prices.usdt || 1; }
      else if(coin.id === 'trx') { coin.bal = trxBal; coin.price = prices.trx || 0.12; }
      else if(coin.id === 'eth') { coin.bal = ethBal; coin.price = prices.eth || 2500; }
      else if(coin.id === 'btc') { coin.bal = btcBal; coin.price = prices.btc || 60000; }
    });
    /* 饼图/行情条/兑换 UI 延后一帧，避免阻塞首屏 commit */
    var _u = usdtUsd, _ue = usdtErcUsd, _t = trxUsd, _e = ethUsd, _b = btcUsd;
    requestAnimationFrame(function () {
      try {
        if (typeof drawPortfolioPieChart === 'function') drawPortfolioPieChart(_u, _ue, _t, _e, _b);
      } catch (_p) { wwQuiet(_p); }
      try {
        if (typeof refreshHomePriceTicker === 'function') refreshHomePriceTicker();
      } catch (_r) { wwQuiet(_r); }
      try {
        renderSwapUI();
        calcSwap();
      } catch (_s) { wwQuiet(_s); }
    });
    setTimeout(function () {
      try {
        if (typeof loadTrxResource === 'function') loadTrxResource();
      } catch (_tr) { wwQuiet(_tr); }
    }, 0);

    try {
      var chgU = document.getElementById('chgUsdt');
      var chgUe = document.getElementById('chgUsdtErc');
      var chgT = document.getElementById('chgTrx');
      var chgE = document.getElementById('chgEth');
      var chgB = document.getElementById('chgBtc');
      var cnyR = window._cnyRate || 7.2;
      wwPersistHomeBalanceSnapRecord({
        totalTxt: fmtUsd(total),
        subTxt: '≈ ' + (total * cnyR).toFixed(0) + ' CNY · 实时价格',
        balUsdt: fmt(usdtBal),
        valUsdt: fmtUsd(usdtUsd),
        chgUsdt: chgU ? chgU.textContent : null,
        balUsdtErc: fmt(usdtErcBal),
        valUsdtErc: fmtUsd(usdtErcUsd),
        chgUsdtErc: chgUe ? chgUe.textContent : null,
        balTrx: fmt(trxBal),
        valTrx: fmtUsd(trxUsd),
        chgTrx: chgT ? chgT.textContent : null,
        balEth: fmt(ethBal),
        valEth: fmtUsd(ethUsd),
        chgEth: chgE ? chgE.textContent : null,
        balBtc: fmt(btcBal),
        valBtc: fmtUsd(btcUsd),
        chgBtc: chgB ? chgB.textContent : null,
        totalUsd: total,
        usdtUsd: usdtUsd,
        usdtErcUsd: usdtErcUsd,
        trxUsd: trxUsd,
        ethUsd: ethUsd,
        btcUsd: btcUsd
      });
    } catch (_snap) { wwQuiet(_snap); }

    if(btn) btn.textContent = '刷新';
    window._wwHomeBalancesHydrated = true;
    if(typeof applyHideZeroTokens==='function') applyHideZeroTokens();
  } catch(e) {
    console.error('Balance load error:', e);
    window._wwHomeBalancesHydrated = false;
    if(tbd) tbd.classList.remove('home-balance--loading');
    if(btn) btn.textContent = '刷新';
  }
}


// ── 加密资讯 ──────────────────────────────────────────────────
/* let newsLoading: wallet.ui.js */
/* let newsCache: wallet.ui.js */
/* let newsCacheTime: wallet.ui.js */

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

// 切换助记词词数（#mnemonicLength）：实现仅在 wallet.ui.js（TEMP_WALLET / _wwTempWalletByWordCount + createWallet）。
// 切勿在此再定义 async function changeMnemonicLength，否则会覆盖 UI 版本并错误调用 createRealWallet（已保存钱包场景）。

// ── 助记词验证 ──────────────────────────────────────────────
var verifyAnswers = {}; // {position: correctWord}

function startVerify() {
  var tw = window.TEMP_WALLET;
  var rw = typeof REAL_WALLET !== 'undefined' ? REAL_WALLET : null;
  const enMnemonic =
    (tw && (tw.mnemonic || tw.enMnemonic)) ||
    (rw && (rw.enMnemonic || rw.mnemonic));
  if (!enMnemonic) {
    if (typeof showToast === 'function') {
      showToast('无法读取有效助记词，请返回密钥页确认已展示助记词，或解锁钱包后再试', 'error', 3200);
    }
    return;
  }
  const enWords = enMnemonic.trim().split(/\s+/).filter(Boolean);
  if (!enWords.length || ![12, 15, 18, 21, 24].includes(enWords.length)) {
    if (typeof showToast === 'function') {
      showToast('无法读取有效助记词，请返回密钥页确认已展示助记词，或解锁钱包后再试', 'error', 3200);
    }
    return;
  }
  var wlKey = wwResolveMnemonicWordlistKey();
  var words =
    wlKey === 'en'
      ? enWords.slice()
      : typeof enWordsToLangKeyTableWords === 'function'
        ? enWordsToLangKeyTableWords(enWords, wlKey)
        : enWords.slice();
  if (window.TEMP_WALLET && window.TEMP_WALLET.mnemonic) {
    wwEnsureRealWalletFromTempForVerify(window.TEMP_WALLET, enMnemonic, words);
  }
  verifyAnswers = {};
  const wc = words.length;
  const positions = [];
  while (positions.length < 3) {
    const p = Math.floor(Math.random() * wc);
    if (!positions.includes(p)) positions.push(p);
  }
  positions.sort((a, b) => a - b);
  const container = _safeEl('verifyQuestions');
  container.innerHTML = '';
  positions.forEach(function (pos) {
    verifyAnswers[pos] = words[pos];
    const div = document.createElement('div');
    div.style.cssText =
      'background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:14px 16px;display:flex;align-items:center;gap:10px';
    div.innerHTML =
      '<div style="font-size:12px;color:var(--text-muted);width:28px;flex-shrink:0">第 ' +
      (pos + 1) +
      ' 词</div>' +
      '<input type="text" id="verify_' +
      pos +
      '" placeholder="请输入第 ' +
      (pos + 1) +
      ' 个词" autocomplete="off" autocorrect="off" autocapitalize="off"' +
      ' style="flex:1;background:none;border:none;outline:none;font-size:14px;color:var(--text);font-family:inherit"' +
      ' onkeydown="if(event.key===\'Enter\')checkVerify()">';
    container.appendChild(div);
  });
  _safeEl('verifyError').style.display = 'none';
  goTo('page-key-verify');
  setTimeout(function () {
    const first = document.querySelector('#verifyQuestions input');
    if (first) first.focus();
  }, 300);
}

function checkVerify() {
  let allCorrect = true;
  Object.keys(verifyAnswers).forEach(function (pos) {
    const input = document.getElementById('verify_' + pos);
    const val = _wwNormalizeVerifyWord(input ? input.value : '');
    const correct = _wwNormalizeVerifyWord(verifyAnswers[pos]);
    if (val !== correct) {
      allCorrect = false;
      if (input) input.style.color = '#ff6060';
    } else {
      if (input) input.style.color = '#4ac84a';
    }
  });
  if (allCorrect) {
    _safeEl('verifyError').style.display = 'none';
    var hasPin = false;
    try {
      hasPin = !!(typeof Store !== 'undefined' && Store.getPin ? Store.getPin() : localStorage.getItem('ww_pin'));
    } catch (_p0) { wwQuiet(_p0); }
    if (hasPin) {
      try {
        window._wwInFirstRun = false;
      } catch (_frV) { wwQuiet(_frV); }
    }
    try {
      if (
        typeof wwWalletHasAnyChainAddress === 'function' &&
        !wwWalletHasAnyChainAddress(typeof REAL_WALLET !== 'undefined' ? REAL_WALLET : null) &&
        window.TEMP_WALLET &&
        window.TEMP_WALLET.mnemonic
      ) {
        var twF = window.TEMP_WALLET;
        var enM = String(twF.mnemonic || twF.enMnemonic || '')
          .trim()
          .split(/\s+/)
          .filter(Boolean);
        if (enM.length && [12, 15, 18, 21, 24].indexOf(enM.length) >= 0) {
          var wlKeyF = typeof wwResolveMnemonicWordlistKey === 'function' ? wwResolveMnemonicWordlistKey() : 'en';
          var dispF =
            wlKeyF === 'en'
              ? enM.slice()
              : typeof enWordsToLangKeyTableWords === 'function'
                ? enWordsToLangKeyTableWords(enM.slice(), wlKeyF)
                : enM.slice();
          wwEnsureRealWalletFromTempForVerify(twF, enM.join(' '), dispF);
        }
      }
    } catch (_fv) { wwQuiet(_fv); }
    if (typeof wwAfterMnemonicVerifiedNavigate === 'function') {
      wwAfterMnemonicVerifiedNavigate('page-home');
    }
    setTimeout(function () {
      if (typeof showToast === 'function') showToast('✅ 验证通过！钱包已安全创建', 'success');
    }, 0);
  } else {
    _safeEl('verifyError').style.display = 'block';
    const vroot = document.getElementById('verifyShakeRoot');
    if (vroot) {
      vroot.classList.remove('wt-shake-wrong');
      void vroot.offsetWidth;
      vroot.classList.add('wt-shake-wrong');
    }
  }
}


async function _resumeWalletAfterUnlock() {
  // 解密敏感数据并临时注入 REAL_WALLET（须在进入首页 / 拉余额前完成，避免竞态）
  var pin = (typeof wwGetSessionPin === 'function' ? wwGetSessionPin() : '') || '';
  try {
    if (!pin) pin = localStorage.getItem('ww_pin') || localStorage.getItem('ww_unlock_pin') || '';
  } catch (_e) { wwQuiet(_e); }
  if (pin && REAL_WALLET && REAL_WALLET.hasEncrypted && !REAL_WALLET.privateKey) {
    try {
      var sensitive = await decryptSensitive(pin);
      if (sensitive && REAL_WALLET) {
        REAL_WALLET.privateKey = sensitive.privateKey;
        REAL_WALLET.trxPrivateKey = sensitive.trxPrivateKey;
        REAL_WALLET.mnemonic = sensitive.mnemonic;
        REAL_WALLET.enMnemonic = sensitive.enMnemonic;
        REAL_WALLET.words = sensitive.words;
      }
    } catch (e) {
      console.error('[unlock decrypt]', e);
    }
  }
  updateAddr();
  const tb = document.getElementById('tabBar');
  if(tb) tb.style.display = 'flex';
  setTimeout(loadBalances, 0);
  if(window._wwUnlockPreservePage) {
    window._wwUnlockPreservePage = false;
    window._wwForceIdleLock = false;
    try { wwResetActivityClock(); } catch (e) { wwQuiet(e); }
    return;
  }
  var _pinCont = null;
  try {
    _pinCont = window._wwAfterPinUnlockContinue;
    window._wwAfterPinUnlockContinue = null;
  } catch (_pc0) { wwQuiet(_pc0); }
  window._wwForceIdleLock = false;
  if (typeof _pinCont === 'function') {
    try {
      await _pinCont();
    } catch (_pc1) {
      console.error('[after PIN continue]', _pc1);
    }
    return;
  }
  goTo('page-home');
}
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
  try { w = localStorage.getItem('ww_antiphish_word') || ''; } catch (e) { wwQuiet(e); }
  var el = document.getElementById('wwAntiPhishBadge');
  if (!el) return;
  if (!w) { el.style.display = 'none'; el.textContent = ''; return; }
  el.style.display = 'block';
  el.textContent = '防钓鱼口令：' + w;
}
function wwOpenAntiPhishDialog() {
  var cur = '';
  try { cur = localStorage.getItem('ww_antiphish_word') || ''; } catch (e) { wwQuiet(e); }
  var t = prompt('设置防钓鱼口令（解锁界面会显示，用于识别仿冒应用）\n留空则清除', cur);
  if (t === null) return;
  t = String(t).trim();
  if (t === '') {
    try { localStorage.removeItem('ww_antiphish_word'); } catch (e) { wwQuiet(e); }
    if (typeof showToast === 'function') showToast('已清除防钓鱼口令', 'info');
  } else {
    try { localStorage.setItem('ww_antiphish_word', t.slice(0, 32)); } catch (e) { wwQuiet(e); }
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
  if (!REAL_WALLET || !REAL_WALLET.enMnemonic) { if (typeof showToast === 'function') showToast('请先创建或导入钱包', 'warning'); return; }
  if (!window.confirm('将导出含助记词的加密文本。若密码泄露，资产将面临风险。仅保存到可信位置，切勿与密码同存一处。确定继续？')) return;
  var pass = prompt('设置加密密码（请牢记，用于在其他设备解密此备份）');
  if (!pass) return;
  if (String(pass).length < 4) { if (typeof showToast === 'function') showToast('请输入至少 4 位密码', 'warning'); return; }
  var enc = new TextEncoder();
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
    try { if (typeof wwRefreshAntiPhishOnPinUnlock === 'function') wwRefreshAntiPhishOnPinUnlock(); } catch (_ap) { wwQuiet(_ap); }
    setTimeout(() => { try { inp.focus(); } catch (e) { wwQuiet(e); } }, 200);
  } else {
    void _resumeWalletAfterUnlock();
  }
}
async function submitPageRestorePin() {
  const inp = document.getElementById('pinRestorePageInput');
  const err = document.getElementById('pageRestorePinError');
  const panel = document.getElementById('pageRestorePinPanel');
  if (!wwHasPinConfigured()) {
    if (err) { err.textContent = '尚未在本机设置 PIN，请先创建或导入钱包并完成 PIN 设置'; err.style.display = 'block'; }
    if (inp) inp.value = '';
    if (panel) { panel.classList.remove('wt-shake-wrong'); void panel.offsetWidth; panel.classList.add('wt-shake-wrong'); }
    return;
  }
  const got = inp ? String(inp.value).trim() : '';
  var ok = typeof verifyPin === 'function' ? await verifyPin(got) : false;
  if (ok) {
    wwSetSessionPin(got);
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
    wwSetSessionPin(got);
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
  const ov = document.getElementById('pinUnlockOverlay');
  if(ov) ov.classList.remove('show');
  try {
    var tov = document.getElementById('totpUnlockOverlay');
    if (!tov || !tov.classList.contains('show')) window._wwAfterPinUnlockContinue = null;
  } catch (_cp) { wwQuiet(_cp); }
}
function checkWwAirdrop() {
  try {
    var u = 'https://worldtoken.cc/';
    if (typeof window !== 'undefined' && window.open) {
      window.open(u, '_blank', 'noopener,noreferrer');
    } else {
      location.href = u;
    }
  } catch (e) { wwQuiet(e); }
  if (typeof showToast === 'function') showToast('已在浏览器打开官网，可在站内查看活动与公告', 'info', 2800);
}

/**
 * 修改 PIN：须已通过当前 PIN 验证（会话中有旧 PIN）。更新 hash、钱包密文与 TOTP 密文。
 */
async function wwFinalizePinChange(newPin) {
  var p = String(newPin || '');
  if (!/^\d{6}$/.test(p)) throw new Error('PIN 须为 6 位数字');
  var oldPin = typeof wwGetSessionPin === 'function' ? wwGetSessionPin() : '';
  if (!oldPin || !/^\d{6}$/.test(oldPin)) throw new Error('请先验证当前 PIN');
  if (oldPin === p) {
    if (typeof showToast === 'function') showToast('新 PIN 不能与当前 PIN 相同', 'warning');
    throw new Error('SAME_PIN');
  }
  if (typeof savePinSecure !== 'function') throw new Error('无法保存 PIN');
  await savePinSecure(p);
  if (window.wwSessionPinBridge && typeof window.wwSessionPinBridge.set === 'function') {
    window.wwSessionPinBridge.set(p);
  }
  wwSetSessionPin(p);
  try { localStorage.setItem('ww_pin_set', '1'); } catch (e0) { wwQuiet(e0); }

  if (REAL_WALLET && typeof saveWalletSecure === 'function') {
    try {
      var raw = JSON.parse(localStorage.getItem('ww_wallet') || '{}');
      var w = REAL_WALLET;
      if (raw.encrypted || w.mnemonic || w.privateKey) {
        await saveWalletSecure(w, p);
      }
    } catch (e1) {
      console.error('[wwFinalizePinChange wallet]', e1);
      try {
        await saveWalletSecure(REAL_WALLET, p);
      } catch (e1b) {
        console.error(e1b);
      }
    }
  }

  if (typeof wwTotpEnabled === 'function' && wwTotpEnabled()) {
    try {
      var encT = localStorage.getItem('ww_totp_secret');
      if (encT && typeof decryptTotpSecret === 'function' && typeof encryptTotpSecret === 'function') {
        var sec = await decryptTotpSecret(encT, oldPin);
        if (sec) {
          localStorage.setItem('ww_totp_secret', await encryptTotpSecret(sec, p));
        }
      }
    } catch (e2) {
      console.error('[wwFinalizePinChange totp]', e2);
    }
  }

  if (typeof showToast === 'function') showToast('PIN 已更新', 'success');
  if (typeof updateSettingsPage === 'function') updateSettingsPage();
  if (typeof updateWalletSecurityScoreUI === 'function') updateWalletSecurityScoreUI();
}
try { window.wwFinalizePinChange = wwFinalizePinChange; } catch (_wff) { wwQuiet(_wff); }

async function openPinSettingsDialog() {
  if (!wwHasPinConfigured()) {
    if (typeof openPinSetupOverlay !== 'function') {
      if (typeof showToast === 'function') showToast('无法打开 PIN 设置', 'warning');
      return;
    }
    openPinSetupOverlay({ skipFirstRunLock: true });
    return;
  }
  if (typeof wwEnsurePinThenForced !== 'function') {
    if (typeof showToast === 'function') showToast('无法验证 PIN', 'warning');
    return;
  }
  wwEnsurePinThenForced(function () {
    if (typeof openPinChangeOverlay === 'function') {
      openPinChangeOverlay();
    } else if (typeof showToast === 'function') {
      showToast('无法打开修改 PIN 界面', 'warning');
    }
  });
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
  setInterval(function() { try { wwTickIdleLock(); } catch (e) { wwQuiet(e); } }, 15000);
  setInterval(function() { try { if (typeof wwRecurringTick === 'function') wwRecurringTick(); } catch (e) { wwQuiet(e); } }, 60000);
  wwApplyIdleLockLabel();
} catch (e) { wwQuiet(e); }
const lg=document.getElementById("welcomeLangGrid"); if(lg) lg.scrollTop=0;
try { var _ap0 = document.querySelector('.page.active'); applySeoForPage(_ap0 && _ap0.id ? _ap0.id : 'page-welcome'); applyOfflineState(); window.addEventListener('online', applyOfflineState); window.addEventListener('offline', applyOfflineState); } catch (e) { wwQuiet(e); }
try { initBalancePrivacyToggle(); initScrollTopBtn(); initTabSwipeGesture(); } catch (e) { wwQuiet(e); }

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
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        try { if(typeof updateHomeChainStrip==='function') updateHomeChainStrip(); } catch (e) { wwQuiet(e); }
      });
    });
  }
  if(document.readyState==='complete') run();
  else window.addEventListener('load', run);
})();



// ── 刷新恢复当前页 ────────────────────────────────────────────────
(function() {
  // 只有主要 Tab 页面才恢复；且必须已有本地钱包地址。
  // 否则 goTo 会盖住默认的欢迎页、底栏隐藏，体感像「按钮全点不动」（sessionStorage 在 ?v= 测缓存时仍存在）。
  var ALLOW_RESTORE = ['page-home','page-addr','page-swap','page-settings'];
  try {
    if (typeof window !== 'undefined' && window._WW_HARD_RELOAD) return;
    var last = sessionStorage.getItem('ww_last_page');
    if (!last || !ALLOW_RESTORE.includes(last) || !document.getElementById(last)) return;
    var hasWallet = typeof wwUserHasAnySavedChainAddress === 'function' && wwUserHasAnySavedChainAddress();
    if (!hasWallet) {
      try { sessionStorage.removeItem('ww_last_page'); } catch (_r) { wwQuiet(_r); }
      return;
    }
    function wwDoRestoreLastPage() {
      setTimeout(function () {
        goTo(last);
      }, 50);
    }
    if (typeof window.wwWhenWalletCssReady === 'function') {
      window.wwWhenWalletCssReady(wwDoRestoreLastPage);
    } else {
      wwDoRestoreLastPage();
    }
  } catch (_) { wwQuiet(_); }
})();

(function wwClearStaleServiceWorkerCaches() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.getRegistrations().then(function(regs) {
    regs.forEach(function(r) { r.update(); });
  });
  if (typeof caches === 'undefined' || !caches.keys) return;
  caches.keys().then(function(names) {
    names.forEach(function(name) {
      if (name !== 'worldtoken-static-v202604091300') caches.delete(name);
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
    if (typeof confirmPin === 'function') window.confirmPin = confirmPin;
    if (typeof claimGift === 'function') window.claimGift = claimGift;
    if (typeof copyHbCreatedKeyword === 'function') window.copyHbCreatedKeyword = copyHbCreatedKeyword;
    if (typeof copyHomeAddr === 'function') window.copyHomeAddr = copyHomeAddr;
    if (typeof copyNative === 'function') window.copyNative = copyNative;
    if (typeof createGift === 'function') window.createGift = createGift;
    if (typeof createNewWallet === 'function') window.createNewWallet = createNewWallet;
    if (typeof doImportWallet === 'function') window.doImportWallet = doImportWallet;
    if (typeof doSwap === 'function') window.doSwap = doSwap;
    if (typeof closeSwapConfirm === 'function') window.closeSwapConfirm = closeSwapConfirm;
    if (typeof openDex === 'function') window.openDex = openDex;
    if (typeof openCoinPicker === 'function') window.openCoinPicker = openCoinPicker;
    if (typeof closeCoinPicker === 'function') window.closeCoinPicker = closeCoinPicker;
    if (typeof swapCoins === 'function') window.swapCoins = swapCoins;
    if (typeof doTransfer === 'function') window.doTransfer = doTransfer;
    if (typeof editHomeAddr === 'function') window.editHomeAddr = editHomeAddr;
    if (typeof goToPinConfirm === 'function') window.goToPinConfirm = goToPinConfirm;
    if (typeof hideQR === 'function') window.hideQR = hideQR;
    if (typeof loadBalances === 'function') window.loadBalances = loadBalances;
    if (typeof loadTxHistory === 'function') window.loadTxHistory = loadTxHistory;
    if (typeof openCustomizeAddr === 'function') window.openCustomizeAddr = openCustomizeAddr;
    if (typeof openPinSettingsDialog === 'function') window.openPinSettingsDialog = openPinSettingsDialog;
    if (typeof openReceive === 'function') window.openReceive = openReceive;
    if (typeof openSend === 'function') window.openSend = openSend;
    if (typeof pinUnlockBackspace === 'function') window.pinUnlockBackspace = pinUnlockBackspace;
    if (typeof pinUnlockClear === 'function') window.pinUnlockClear = pinUnlockClear;
    if (typeof pinVerifyEnterWallet === 'function') window.pinVerifyEnterWallet = pinVerifyEnterWallet;
    if (typeof promptWalletNotifications === 'function') window.promptWalletNotifications = promptWalletNotifications;
    if (typeof selectTransferCoin === 'function') window.selectTransferCoin = selectTransferCoin;
    if (typeof sendTransfer === 'function') window.sendTransfer = sendTransfer;
    if (typeof setSwapMax === 'function') window.setSwapMax = setSwapMax;
    if (typeof shareHbCreatedKeyword === 'function') window.shareHbCreatedKeyword = shareHbCreatedKeyword;
    if (typeof startVerify === 'function') window.startVerify = startVerify;
    if (typeof submitClaim === 'function') window.submitClaim = submitClaim;
    if (typeof submitPageRestorePin === 'function') window.submitPageRestorePin = submitPageRestorePin;
    if (typeof submitPinUnlock === 'function') window.submitPinUnlock = submitPinUnlock;
    if (typeof submitTotpUnlock === 'function') window.submitTotpUnlock = submitTotpUnlock;
  } catch (_ww) { wwQuiet(_ww); }
})();
