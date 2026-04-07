// wallet.core.js — 钱包核心：创建/加密/存储/派生

/** 全局钱包状态；与 wallet.runtime.js 共用，勿在 wallet.ui.js 重复声明 */
var REAL_WALLET = null;
/** TRX 公链展示地址；wallet.addr.js 早于 runtime 加载，须在 core 声明并由 loadWallet 同步 */
var CHAIN_ADDR = '--';

function tapHaptic(ms) {
  try { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(ms === undefined ? 12 : ms); } catch (e) {}
}

function loadTronWeb(){return new Promise(r=>{if(window.TronWeb){r();return;}const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/tronweb@5.3.2/dist/TronWeb.js';s.onload=r;document.head.appendChild(s);});}

function loadQRCodeLib(){
  if(typeof QRCode!=='undefined'&&QRCode.toCanvas)return Promise.resolve();
  if(_qrLoadPromise)return _qrLoadPromise;
  _qrLoadPromise=new Promise(function(res,rej){
    var s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js';
    s.async=true;
    s.onload=function(){res();};
    s.onerror=function(){_qrLoadPromise=null;rej(new Error('qrcode load failed'));};
    document.head.appendChild(s);
  });
  return _qrLoadPromise;
}

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

function loadWalletPublic() {
  try {
    var d = localStorage.getItem('ww_wallet');
    if (d) {
      var parsed = JSON.parse(d);
      // 只加载公开信息，不加载敏感数据
      window.REAL_WALLET = {
        ethAddress: parsed.ethAddress,
        trxAddress: parsed.trxAddress,
        btcAddress: parsed.btcAddress || '',
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

function saveWallet(w) {
  // 如果有 PIN，使用加密存储；否则只存公开信息
  var pin = '';
  try { pin = localStorage.getItem('ww_pin') || ''; } catch(e) {}
  if (pin) {
    saveWalletSecure(w, pin).catch(function(e) {
      console.error('[saveWallet] 加密存储失败，降级明文:', e);
      _saveWalletPlainPublicOnly(w);
    });
  } else {
    // 无 PIN：只存公开信息，不存敏感数据
    _saveWalletPlainPublicOnly(w);
  }
}

function loadWallet() {
  loadWalletPublic();
  // 万语地址：先于其他 UI，统一从 localStorage 载入 ADDR_WORDS 并一次性刷新各展示位
  try {
    if (typeof ensureNativeAddrInitialized === 'function') ensureNativeAddrInitialized();
  } catch (_na) {}
  try {
    if (typeof updateAddr === 'function') updateAddr();
  } catch (_ua) {}
  function _wwRevealAddrAfterPaint() {
    try {
      document.documentElement.classList.remove('ww-addr-pending');
    } catch (_c) {}
  }
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(function () {
      requestAnimationFrame(_wwRevealAddrAfterPaint);
    });
  } else {
    setTimeout(_wwRevealAddrAfterPaint, 0);
  }
  if (REAL_WALLET && REAL_WALLET.ethAddress) {
    try { sessionStorage.removeItem('ww_ref_pending'); } catch (_r) {}
  }
  try { if (typeof updateHomeBackupBanner === 'function') updateHomeBackupBanner(); } catch (_hb) {}
  try { if (typeof updateWalletSecurityScoreUI === 'function') updateWalletSecurityScoreUI(); } catch (_ws) {}
  try { if (typeof hideWalletLoading === 'function') hideWalletLoading(); } catch (_hl) {}
}

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
  REAL_WALLET = w;
  CHAIN_ADDR = w.trxAddress || '--';
  saveWallet(w);
  applyReferralCredit();
  try { if (typeof ensureNativeAddrInitialized === 'function') ensureNativeAddrInitialized(); } catch (_na) {}
  return w;
}

/**
 * 恢复/导入钱包：与 core/wallet.js 的 importWallet 一致；REAL_WALLET 仅公开地址；有 PIN 则加密保存。
 */
async function restoreWallet(mnemonic) {
  var raw = String(mnemonic || '').trim().replace(/\s+/g, ' ');
  if (!raw) {
    showToast('❌ 请输入助记词', 'error');
    return null;
  }
  if (typeof importWallet !== 'function') {
    showToast('❌ 钱包核心未加载', 'error');
    return null;
  }
  var result = importWalletFlexible(raw);
  if (!result) {
    showToast('❌ 助记词无效，请检查后重试', 'error');
    return null;
  }
  var pin = '';
  try { pin = (localStorage.getItem('ww_pin') || '').trim(); } catch (e) {}
  var pub = {
    ethAddress: result.eth.address,
    trxAddress: result.trx.address,
    btcAddress: result.btc.address,
    createdAt: result.createdAt,
    hasEncrypted: !!pin,
    backedUp: false
  };
  REAL_WALLET = pub;
  window.REAL_WALLET = pub;
  CHAIN_ADDR = (pub && pub.trxAddress) ? pub.trxAddress : '--';
  if (pin) {
    var flatForStore = {
      mnemonic: result.mnemonic,
      enMnemonic: result.mnemonic,
      words: result.mnemonic.trim().split(/\s+/).filter(Boolean),
      ethAddress: result.eth.address,
      trxAddress: result.trx.address,
      btcAddress: result.btc.address,
      privateKey: result.eth.privateKey,
      trxPrivateKey: result.trx.privateKey,
      createdAt: result.createdAt,
      backedUp: false
    };
    await saveWalletSecure(flatForStore, pin);
  } else {
    _saveWalletPlainPublicOnly({
      ethAddress: result.eth.address,
      trxAddress: result.trx.address,
      btcAddress: result.btc.address,
      createdAt: result.createdAt,
      backedUp: false
    });
  }
  try { applyReferralCredit(); } catch (e2) {}
  try { if (typeof updateAddr === 'function') updateAddr(); } catch (e3) {}
  return pub;
}

function mnemonicToLang(mnemonic, lang) {
  if (!lang || lang === "en" || !WT_WORDLISTS[lang]) return mnemonic;
  const words = mnemonic.trim().split(/\s+/);
  return words.map(w => {
    const idx = EN_WORD_INDEX[w];
    if (idx === undefined) return w; // 未知词保持原样
    return WT_WORDLISTS[lang][idx] || w;
  }).join(" ");
}

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

/**
 * 界面语言 → 助记词展示用词库键：仅英文用 BIP39 英文词；中文及其他语言统一用中文地名词库（WT_WORDLISTS.zh，来自 zh-cn.json）
 */
function getMnemonicWordlistLang(uiLang) {
  if (!uiLang || uiLang === 'en') return 'en';
  return 'zh';
}

/**
 * 导入：先按标准英文 BIP39 解析；失败则按中文地名词库转为英文再解析（与「非英文界面展示中文地名」一致）。
 */
function importWalletFlexible(raw) {
  var norm = String(raw || '').trim().replace(/\s+/g, ' ');
  if (!norm) return null;
  var r = importWallet(norm);
  if (r) return r;
  if (typeof mnemonicFromLang !== 'function' || !WT_WORDLISTS || !WT_WORDLISTS.zh) return null;
  var en = mnemonicFromLang(norm, 'zh');
  return importWallet(en);
}

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

function syncMnemonicLengthChoice(v) {
  const n = parseInt(v, 10) || 12;
  if (![12, 15, 18, 21, 24].includes(n)) return;
  currentMnemonicLength = n;
  try {
    const mk = document.getElementById('mnemonicLength');
    if (mk) mk.value = String(n);
  } catch (e) {}
}

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

function setWalletCreateStep(n) {
  const steps = document.getElementById('walletCreateSteps');
  const text = document.getElementById('walletLoadingText');
  const labels = ['正在生成钱包…', '1/3 生成密钥', '2/3 派生地址', '3/3 完成'];
  if (text) text.textContent = (n >= 1 && n <= 3) ? labels[n] : labels[0];
  if (!steps) return;
  try { steps.querySelectorAll('[data-step]').forEach(function(el, i) { el.classList.toggle('active', (i + 1) === n); }); } catch (e) {}
}

function countMnemonicWords(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length;
}

function getWalletNickname() { try { return localStorage.getItem('ww_wallet_nickname') || ''; } catch (e) { return ''; } }

function setWalletNickname(s) { try { localStorage.setItem('ww_wallet_nickname', (s || '').trim().slice(0, 32)); } catch (e) {} }

function captureReferralFromUrl() {
  try {
    var u = new URL(location.href);
    var r = u.searchParams.get('ref');
    if (r) {
      r = normalizeRefCode(r);
      if (r.length >= 6) {
        sessionStorage.setItem('ww_ref_pending', r);
        u.searchParams.delete('ref');
        history.replaceState({}, '', u.pathname + (u.search || '') + (u.hash || ''));
      }
    }
  } catch (e) {}
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

function wwGenerateTotpSecretB32() {
  const u = new Uint8Array(20);
  crypto.getRandomValues(u);
  return wwBase32Encode(u);
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

async function confirmTotpSetup() {
  if (window._wwInFirstRun) { showToast('请先完成钱包引导', 'warning'); return; }
  const sec = window._wwTotpPendingSecret;
  const inputEl = document.getElementById('totpSetupVerifyInput');
  const input = inputEl ? inputEl.value.trim() : '';
  if (!/^\d{6}$/.test(input)) { showToast('请输入 6 位验证码', 'error'); return; }
  if (!sec) { showToast('会话已过期，请重试', 'error'); return; }
  const ok = await wwVerifyTotpCode(sec, input);
  if (!ok) { showToast('验证码不正确', 'error'); return; }
  try {
    if (typeof encryptTotpSecret === 'function' && typeof wwGetSessionPin === 'function') {
      const pin = wwGetSessionPin();
      if (pin) {
        localStorage.setItem('ww_totp_secret', await encryptTotpSecret(sec, pin));
      } else {
        localStorage.setItem('ww_totp_secret', sec);
      }
    } else {
      localStorage.setItem('ww_totp_secret', sec);
    }
  } catch (e) {
    console.error('[TOTP]', e);
    showToast('保存失败', 'error');
    return;
  }
  localStorage.setItem('ww_totp_enabled', '1');
  window._wwTotpPendingSecret = null;
  closeTotpSetup();
  showToast('两步验证已启用', 'success');
  if (typeof updateSettingsPage === 'function') updateSettingsPage();
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

function markBackupDone() {
  const w = JSON.parse(localStorage.getItem('ww_wallet')||'{}');
  w.backedUp = true;
  localStorage.setItem('ww_wallet', JSON.stringify(w));
  if(REAL_WALLET) REAL_WALLET.backedUp = true;
  const el = document.getElementById('backupStatus');
  if(el) { el.textContent='已备份 ✓'; el.style.color='var(--green,#26a17b)'; }
  if (typeof updateHomeBackupBanner === 'function') updateHomeBackupBanner();
  if (typeof updateWalletSecurityScoreUI === 'function') updateWalletSecurityScoreUI();
  if (typeof wwPopulatePriceAlertForm === 'function') wwPopulatePriceAlertForm();
}
