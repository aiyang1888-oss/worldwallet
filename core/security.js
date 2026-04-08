/**
 * WorldWallet Security Layer
 * - 钱包加密：scrypt-js → AES-256-GCM（新数据）；旧数据 PBKDF2 仅用于解密
 * - 敏感会话：仅内存保存助记词会话，不长期挂 REAL_WALLET
 */

(function () {
  'use strict';

var WW_ENCRYPT_PAYLOAD_VERSION = 2;

/** 创建流程中的临时钱包（不挂 window，避免控制台直接读取） */
var __ww_temp_wallet = null;
function wwGetTempWallet() {
  return __ww_temp_wallet;
}
function wwSetTempWallet(w) {
  __ww_temp_wallet = w;
}

/** 导入流程在设置 PIN 前的待持久化数据（仅内存；禁止写入 ww_import_pending 明文） */
var __ww_import_pending = null;
function wwPeekImportPending() {
  return __ww_import_pending;
}
function wwSetImportPending(flat) {
  __ww_import_pending = flat;
}
function wwTakeImportPending() {
  var x = __ww_import_pending;
  __ww_import_pending = null;
  return x;
}
(function wwMigrateImportPendingFromStorageOnce() {
  try {
    var raw = localStorage.getItem('ww_import_pending');
    if (!raw) return;
    if (!__ww_import_pending) {
      var o = JSON.parse(raw);
      if (o && typeof o === 'object' && o.mnemonic) __ww_import_pending = o;
    }
    localStorage.removeItem('ww_import_pending');
  } catch (e) {
    try { localStorage.removeItem('ww_import_pending'); } catch (e2) {}
  }
})();

function wwBytesToB64(u8) {
  var s = '';
  var chunk = 8192;
  for (var i = 0; i < u8.length; i += chunk) {
    s += String.fromCharCode.apply(null, u8.subarray(i, Math.min(i + chunk, u8.length)));
  }
  return btoa(s);
}

function wwB64ToBytes(s) {
  var bin = atob(s);
  var out = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function wwDeriveKeyPbkdf2Legacy(pin, salt) {
  var enc = new TextEncoder();
  var material = await crypto.subtle.importKey(
    'raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function wwRawKeyScrypt(pin, salt, params) {
  var N = params && params.N != null ? params.N : 32768;
  var r = params && params.r != null ? params.r : 8;
  var p = params && params.p != null ? params.p : 1;
  var enc = new TextEncoder();
  var pass = enc.encode(pin);
  if (typeof scrypt === 'function') {
    var out1 = await scrypt(pass, salt, N, r, p, 32);
    return new Uint8Array(out1);
  }
  if (typeof scrypt !== 'undefined' && scrypt.scrypt) {
    var out2 = await scrypt.scrypt(pass, salt, N, r, p, 32);
    return new Uint8Array(out2);
  }
  if (typeof scryptjs !== 'undefined' && scryptjs.scrypt) {
    var out3 = await scryptjs.scrypt(pass, salt, N, r, p, 32);
    return new Uint8Array(out3);
  }
  throw new Error('scrypt unavailable');
}

async function wwImportAesGcmKeyFromRaw(raw32) {
  return crypto.subtle.importKey('raw', raw32, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function encryptWithPin(plaintext, pin) {
  var salt = crypto.getRandomValues(new Uint8Array(16));
  var iv = crypto.getRandomValues(new Uint8Array(12));
  var kdfName = 'scrypt';
  var kdfParams = { N: 32768, r: 8, p: 1 };
  var rawKey = await wwRawKeyScrypt(pin, salt, kdfParams);
  var key = await wwImportAesGcmKeyFromRaw(rawKey);
  rawKey.fill(0);
  var enc = new TextEncoder();
  var ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    enc.encode(plaintext)
  );
  return {
    v: WW_ENCRYPT_PAYLOAD_VERSION,
    kdf: kdfName,
    kdfParams: kdfParams,
    salt: wwBytesToB64(salt),
    iv: wwBytesToB64(iv),
    ct: wwBytesToB64(new Uint8Array(ciphertext)),
    createdAt: Date.now()
  };
}

function wwIsLegacyEncryptedBundle(bundle) {
  if (!bundle || typeof bundle !== 'object') return false;
  if (bundle.v === WW_ENCRYPT_PAYLOAD_VERSION || bundle.v === 2) return false;
  return typeof bundle.salt === 'string' && typeof bundle.iv === 'string' &&
    typeof bundle.data === 'string';
}

/** 历史 argon2id 密文（当前运行时已移除 Argon2，无法解密，仅用于识别与提示） */
function wwIsArgon2idEncryptedBundle(bundle) {
  return !!(bundle && typeof bundle === 'object' && bundle.kdf === 'argon2id');
}

async function decryptWithPin(bundle, pin) {
  if (wwIsLegacyEncryptedBundle(bundle)) {
    var saltL = wwB64ToBytes(bundle.salt);
    var ivL = wwB64ToBytes(bundle.iv);
    var dataL = wwB64ToBytes(bundle.data);
    var keyL = await wwDeriveKeyPbkdf2Legacy(pin, saltL);
    var dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivL }, keyL, dataL);
    return new TextDecoder().decode(dec);
  }
  var salt = wwB64ToBytes(bundle.salt);
  var iv = wwB64ToBytes(bundle.iv);
  var ct = wwB64ToBytes(bundle.ct);
  var rawKey;
  if (wwIsArgon2idEncryptedBundle(bundle)) {
    throw new Error('WW_LEGACY_ARGON2ID_UNSUPPORTED');
  }
  if (bundle.kdf === 'scrypt') {
    rawKey = await wwRawKeyScrypt(pin, salt, bundle.kdfParams || {});
  } else {
    throw new Error('unknown kdf');
  }
  var key = await wwImportAesGcmKeyFromRaw(rawKey);
  rawKey.fill(0);
  var plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, ct);
  return new TextDecoder().decode(plain);
}

function wwNormalizeDecryptedSensitive(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  var m = parsed.mnemonic || parsed.enMnemonic;
  if (typeof m !== 'string' || !m.trim()) return null;
  var norm = m.trim().replace(/\s+/g, ' ');
  return { mnemonic: norm };
}

var _wwSessionMnemonic = null;
var _wwSessionMnemonicTimer = null;
var WW_SESSION_MNEMONIC_TTL_MS = 30 * 1000;

function wwSetSessionMnemonic(mnemonic) {
  _wwSessionMnemonic = mnemonic ? String(mnemonic) : null;
  if (_wwSessionMnemonicTimer) clearTimeout(_wwSessionMnemonicTimer);
  _wwSessionMnemonicTimer = null;
  if (_wwSessionMnemonic) {
    _wwSessionMnemonicTimer = setTimeout(function () {
      _wwSessionMnemonic = null;
      _wwSessionMnemonicTimer = null;
    }, WW_SESSION_MNEMONIC_TTL_MS);
  }
}

function wwGetSessionMnemonic() {
  return _wwSessionMnemonic || '';
}

function wwClearSessionMnemonic() {
  _wwSessionMnemonic = null;
  if (_wwSessionMnemonicTimer) {
    clearTimeout(_wwSessionMnemonicTimer);
    _wwSessionMnemonicTimer = null;
  }
}

function setSessionKeys(keys) {
  if (keys && keys.mnemonic) wwSetSessionMnemonic(keys.mnemonic);
  else wwClearSessionMnemonic();
}

function getSessionKeys() {
  var m = wwGetSessionMnemonic();
  if (!m) return null;
  return { mnemonic: m };
}

function isSessionUnlocked() {
  return !!wwGetSessionMnemonic();
}

function wwClearSensitiveSession() {
  wwClearSessionMnemonic();
  try {
    if (typeof REAL_WALLET !== 'undefined' && REAL_WALLET) {
      try { delete REAL_WALLET.mnemonic; } catch (_m) {}
      try { delete REAL_WALLET.enMnemonic; } catch (_e2) {}
      try { delete REAL_WALLET.words; } catch (_w) {}
      try { delete REAL_WALLET.privateKey; } catch (_p) {}
      try { delete REAL_WALLET.trxPrivateKey; } catch (_t) {}
    }
  } catch (_rw) {}
  try {
    var _tw = wwGetTempWallet();
    if (_tw) {
      try { delete _tw.mnemonic; } catch (_tm) {}
      try { delete _tw.enMnemonic; } catch (_te) {}
      try { delete _tw.privateKey; } catch (_tp) {}
      try { delete _tw.trxPrivateKey; } catch (_tt) {}
      try { delete _tw.words; } catch (_tw2) {}
    }
  } catch (_tw) {}
}

function wwSafeAddr(s) {
  if (s == null || typeof s !== 'string') return '';
  if (s.length <= 10) return '***';
  return s.slice(0, 6) + '…' + s.slice(-4);
}

function wwSafeLog() {
  if (typeof safeLog === 'function') return safeLog.apply(null, arguments);
}

/** 旧版全局盐 SHA-256，仅用于验证已存哈希与迁移 */
async function hashPinLegacyGlobalSalt(pin) {
  var enc = new TextEncoder();
  var data = enc.encode(pin + 'ww_salt_v1_2026');
  var hashBuffer = await crypto.subtle.digest('SHA-256', data);
  var hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
}

async function hashPinPbkdf2PerUser(pin, saltBytes) {
  var enc = new TextEncoder();
  var material = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  var bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations: 100000, hash: 'SHA-256' },
    material,
    256
  );
  return Array.from(new Uint8Array(bits)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
}

/** 将 64 位十六进制摘要转为 32 字节；格式非法时返回 null */
function wwDigestHexToBytes32(hex) {
  var t = String(hex || '').toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(t)) return null;
  var out = new Uint8Array(32);
  for (var i = 0; i < 32; i++) {
    out[i] = parseInt(t.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/** 等长字符串常量时间比较（用于迁移期明文 PIN 与任意等长 ASCII） */
function wwTimingSafeEqualAsciiSameLen(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  var d = 0;
  for (var i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/** 两条 64 字符十六进制摘要常量时间比较（PIN 哈希 / 旧版哈希） */
function wwTimingSafeEqualDigestHex(ha, hb) {
  var ba = wwDigestHexToBytes32(ha);
  var bb = wwDigestHexToBytes32(hb);
  if (!ba || !bb) return false;
  var diff = 0;
  for (var j = 0; j < 32; j++) diff |= ba[j] ^ bb[j];
  return diff === 0;
}

function wwParseStoredPinHash(stored) {
  if (stored == null || stored === '') return { kind: 'empty' };
  if (typeof stored === 'object' && stored && stored.v === 2 && stored.s && stored.h) {
    return { kind: 'v2', s: stored.s, h: String(stored.h).toLowerCase() };
  }
  if (typeof stored === 'string') {
    var t = stored.trim();
    if (/^\{/.test(t)) {
      try {
        var o = JSON.parse(t);
        if (o && o.v === 2 && o.s && o.h) return { kind: 'v2', s: o.s, h: String(o.h).toLowerCase() };
      } catch (e) {}
    }
    if (/^[0-9a-f]{64}$/i.test(t)) return { kind: 'legacy_hex', h: t.toLowerCase() };
  }
  return { kind: 'unknown' };
}

async function verifyPin(pin) {
  var stored = Store.get('ww_pin_hash');
  var parsed = wwParseStoredPinHash(stored);
  if (parsed.kind === 'empty' || parsed.kind === 'unknown') {
    var oldPin = Store.getPin();
    if (oldPin) {
      await savePinSecure(oldPin);
      return wwTimingSafeEqualAsciiSameLen(pin, oldPin);
    }
    return false;
  }
  if (parsed.kind === 'legacy_hex') {
    var computedLegacy = await hashPinLegacyGlobalSalt(pin);
    return wwTimingSafeEqualDigestHex(computedLegacy, parsed.h);
  }
  if (parsed.kind === 'v2') {
    var saltU8 = wwB64ToBytes(parsed.s);
    var h = await hashPinPbkdf2PerUser(pin, saltU8);
    return wwTimingSafeEqualDigestHex(h, parsed.h);
  }
  return false;
}

/**
 * 持久化 PIN：crypto.getRandomValues 生成每用户唯一盐（16 字节），
 * PBKDF2-SHA-256（100000 次）派生摘要；与盐一并存入 ww_pin_hash（v2）。
 */
async function savePinSecure(pin) {
  var salt = crypto.getRandomValues(new Uint8Array(16));
  var h = await hashPinPbkdf2PerUser(pin, salt);
  Store.set('ww_pin_hash', { v: 2, s: wwBytesToB64(salt), h: h });
  Store.remove('ww_pin');
  Store.remove('ww_unlock_pin');
}

async function encryptTotpSecret(sec, pin) {
  var salt = crypto.getRandomValues(new Uint8Array(16));
  var key = await wwDeriveKeyPbkdf2Legacy(pin, salt);
  var enc = new TextEncoder();
  var iv = crypto.getRandomValues(new Uint8Array(12));
  var ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, enc.encode(sec));
  var data = {
    v: 1,
    s: wwBytesToB64(salt),
    iv: wwBytesToB64(iv),
    c: wwBytesToB64(new Uint8Array(ciphertext))
  };
  return JSON.stringify(data);
}

async function decryptTotpSecret(encrypted, pin) {
  try {
    var data = JSON.parse(encrypted);
    var salt = wwB64ToBytes(data.s);
    var iv = wwB64ToBytes(data.iv);
    var ct = wwB64ToBytes(data.c);
    var key = await wwDeriveKeyPbkdf2Legacy(pin, salt);
    var plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, ct);
    return new TextDecoder().decode(plaintext);
  } catch (e) {
    return null;
  }
}

async function decryptWalletSensitive(pin) {
  try {
    var d = localStorage.getItem('ww_wallet');
    if (!d) return { ok: false, reason: 'no_wallet' };
    var parsed = JSON.parse(d);
    if (!parsed.encrypted) return { ok: false, reason: 'not_encrypted' };
    var text;
    try {
      text = await decryptWithPin(parsed.encrypted, pin);
    } catch (e) {
      var msg = String((e && e.message) || e || '');
      if (/WW_LEGACY_ARGON2ID_UNSUPPORTED|argon2id/i.test(msg)) return { ok: false, reason: 'unsupported_legacy' };
      return { ok: false, reason: 'wrong_pin_or_corrupt' };
    }
    var obj = JSON.parse(text);
    var norm = wwNormalizeDecryptedSensitive(obj);
    if (!norm) return { ok: false, reason: 'corrupt' };
    return { ok: true, data: norm };
  } catch (e) {
    return { ok: false, reason: 'unknown' };
  }
}

  window.WW_ENCRYPT_PAYLOAD_VERSION = WW_ENCRYPT_PAYLOAD_VERSION;
  window.encryptWithPin = encryptWithPin;
  window.decryptWithPin = decryptWithPin;
  window.verifyPin = verifyPin;
  window.savePinSecure = savePinSecure;
  window.decryptWalletSensitive = decryptWalletSensitive;
  window.wwGetTempWallet = wwGetTempWallet;
  window.wwSetTempWallet = wwSetTempWallet;
  window.wwPeekImportPending = wwPeekImportPending;
  window.wwSetImportPending = wwSetImportPending;
  window.wwTakeImportPending = wwTakeImportPending;
  window.wwClearSensitiveSession = wwClearSensitiveSession;
  window.wwGetSessionMnemonic = wwGetSessionMnemonic;
  window.wwClearSessionMnemonic = wwClearSessionMnemonic;
  window.wwNormalizeDecryptedSensitive = wwNormalizeDecryptedSensitive;
  window.wwApplySessionKeys = setSessionKeys;
  window.wwGetSessionKeys = getSessionKeys;
  window.encryptTotpSecret = encryptTotpSecret;
  window.decryptTotpSecret = decryptTotpSecret;
})();
