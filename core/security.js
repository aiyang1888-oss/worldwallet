/**
 * WorldWallet Security Layer
 * PIN 管理 + AES-GCM 加密 + 安全存储
 * 整文件 IIFE：仅白名单挂到 window，会话私钥 API 不导出
 */
(function () {
  'use strict';

  if (typeof Store === 'undefined') {
    throw new Error('[安全初始化失败] Store 未定义，请确保 js/storage.js 先于 core/security.js 加载');
  }

  /**
   * 标准 Base64 → Uint8Array；非法输入返回 null（避免 atob 抛错导致未捕获异常）
   * @param {string} s
   * @returns {Uint8Array|null}
   */
  function wwB64StdToUint8Array(s) {
    if (s == null || typeof s !== 'string') return null;
    try {
      var bin = atob(s);
      var out = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      return out;
    } catch (e) {
      return null;
    }
  }

  /** Uint8Array → 标准 Base64；分块避免 String.fromCharCode.apply 在超大数组上爆栈 */
  function wwUint8ArrayToBase64Std(u8) {
    if (!u8 || !(u8 instanceof Uint8Array)) return '';
    var CHUNK = 0x8000;
    var str = '';
    for (var i = 0; i < u8.length; i += CHUNK) {
      var sub = u8.subarray(i, Math.min(i + CHUNK, u8.length));
      str += String.fromCharCode.apply(null, sub);
    }
    return btoa(str);
  }

  /**
   * 从 PIN 派生 AES-256-GCM 密钥
   * @param {string} pin
   * @param {Uint8Array} salt - 16字节
   * @returns {Promise<CryptoKey>}
   */
  async function deriveKeyFromPin(pin, salt) {
    if (typeof deriveKeyFromPinOptimized === 'function') {
      return deriveKeyFromPinOptimized(pin, salt);
    }
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

  /**
   * AES-GCM 加密
   * @param {string} plaintext
   * @param {string} pin
   * @returns {Promise<{salt:string, iv:string, data:string}>}
   */
  async function encryptWithPin(plaintext, pin) {
    var salt = crypto.getRandomValues(new Uint8Array(16));
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var key = await deriveKeyFromPin(pin, salt);
    var enc = new TextEncoder();
    var encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv }, key, enc.encode(plaintext)
    );
    return {
      salt: wwUint8ArrayToBase64Std(salt),
      iv: wwUint8ArrayToBase64Std(iv),
      data: wwUint8ArrayToBase64Std(new Uint8Array(encrypted))
    };
  }

  /**
   * AES-GCM 解密
   * @param {{salt:string, iv:string, data:string}} bundle
   * @param {string} pin
   * @returns {Promise<string>}
   */
  async function decryptWithPin(bundle, pin) {
    var salt = wwB64StdToUint8Array(bundle.salt);
    var iv = wwB64StdToUint8Array(bundle.iv);
    var data = wwB64StdToUint8Array(bundle.data);
    if (!salt || !iv || !data) throw new Error('Invalid encrypted payload');
    var key = await deriveKeyFromPin(pin, salt);
    try {
      var decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv }, key, data
      );
      return new TextDecoder().decode(decrypted);
    } catch (_e) {
      throw new Error('解密失败：PIN 不正确或数据已损坏');
    }
  }

  /**
   * 加密保存钱包（敏感数据用 PIN 加密）
   * @param {object} wallet - 完整钱包对象
   * @param {string} pin
   */
  async function saveWalletSecure(wallet, pin) {
    var safe = {
      ethAddress: wallet.eth.address,
      trxAddress: wallet.trx.address,
      btcAddress: wallet.btc.address,
      wordCount: wallet.wordCount,
      createdAt: wallet.createdAt
    };
    if (pin) {
      var sensitive = JSON.stringify({
        mnemonic: wallet.mnemonic,
        ethKey: wallet.eth.privateKey,
        trxKey: wallet.trx.privateKey,
        btcKey: wallet.btc.privateKey
      });
      safe.encrypted = await encryptWithPin(sensitive, pin);
    }
    Store.setWallet(safe);
  }

  /**
   * 加载钱包公开信息（不含私钥）
   * @returns {object|null}
   */
  function loadWalletPublic() {
    var d = Store.getWallet();
    if (!d || !d.ethAddress) return null;
    return {
      ethAddress: d.ethAddress,
      trxAddress: d.trxAddress,
      btcAddress: d.btcAddress || '',
      wordCount: d.wordCount || 12,
      createdAt: d.createdAt,
      hasEncrypted: !!d.encrypted
    };
  }

  /**
   * 解密钱包敏感数据
   * @param {string} pin
   * @returns {Promise<{mnemonic,ethKey,trxKey,btcKey}|null>}
   */
  async function decryptWalletSensitive(pin) {
    try {
      var d = localStorage.getItem('ww_wallet');
      if (!d) return null;
      var parsed = JSON.parse(d);
      if (!parsed.encrypted) return null;
      var text = await decryptWithPin(parsed.encrypted, pin);
      var obj = JSON.parse(text);
      return {
        mnemonic: obj.mnemonic || obj.enMnemonic,
        ethKey: obj.ethKey || obj.privateKey,
        trxKey: obj.trxKey || obj.trxPrivateKey || obj.privateKey,
        btcKey: obj.btcKey || ''
      };
    } catch (e) {
      console.error('[decryptWalletSensitive]', e.message);
      return null;
    }
  }

  /** 旧版全局固定盐（仅用于校验历史哈希并迁移） */
  function _wwLegacyPinSaltSuffix() {
    return 'ww_salt_v1_2026';
  }

  /**
   * 本机唯一 PIN 盐（16 字节 Base64），首次使用时生成并持久化（旧版 v2 设备盐路径）
   * @returns {string}
   */
  function getOrCreateDevicePinSaltB64() {
    try {
      var existing = localStorage.getItem('ww_pin_device_salt_v1');
      if (existing && typeof existing === 'string' && existing.length >= 8) return existing;
      var raw = new Uint8Array(16);
      crypto.getRandomValues(raw);
      var b64 = btoa(String.fromCharCode.apply(null, Array.from(raw)));
      try { localStorage.setItem('ww_pin_device_salt_v1', b64); } catch (e) {}
      return b64;
    } catch (e) {
      return 'ww_fallback_salt_' + String(Date.now()).slice(-8);
    }
  }

  /**
   * PIN → PBKDF2 派生哈希（每用户独立盐，存 ww_pin_salt）
   * @param {string} pin
   * @param {Uint8Array} salt 16 bytes
   */
  async function hashPinPbkdf2(pin, salt) {
    var enc = new TextEncoder();
    var material = await crypto.subtle.importKey(
      'raw', enc.encode(String(pin)), 'PBKDF2', false, ['deriveBits']
    );
    var bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' },
      material,
      256
    );
    var arr = new Uint8Array(bits);
    return Array.from(arr).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  /** 新版：PIN + 每设备随机盐（SHA-256 直哈希，兼容已存 ww_pin_hash） */
  async function hashPinDeviceSalt(pin) {
    var enc = new TextEncoder();
    var saltB64 = getOrCreateDevicePinSaltB64();
    var data = enc.encode('ww_pin_v2|' + String(pin) + '|' + saltB64);
    var hashBuffer = await crypto.subtle.digest('SHA-256', data);
    var hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  /** 旧版固定盐 SHA-256（与历史 ww_pin_hash 兼容） */
  async function hashPinLegacy(pin) {
    var enc = new TextEncoder();
    var data = enc.encode(String(pin) + _wwLegacyPinSaltSuffix());
    var hashBuffer = await crypto.subtle.digest('SHA-256', data);
    var hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  /**
   * 验证 PIN 是否正确
   * @param {string} pin
   * @returns {Promise<boolean>}
   */
  async function verifyPin(pin) {
    var stored = Store.get('ww_pin_hash');
    if (!stored) {
      var oldPin = Store.getPin();
      if (oldPin) {
        await savePinSecure(oldPin);
        console.log('[PIN 迁移] 已转为 hash 存储');
        return pin === oldPin;
      }
      return false;
    }
    var saltStored = Store.get('ww_pin_salt');
    if (saltStored && typeof saltStored === 'string' && saltStored.length >= 8) {
      var su = wwB64StdToUint8Array(saltStored);
      if (su && su.length) {
        var pb = await hashPinPbkdf2(pin, su);
        if (pb === stored) return true;
      }
    }
    var computed = await hashPinDeviceSalt(pin);
    if (computed === stored) {
      await upgradePinToPbkdf2Salt(pin);
      return true;
    }
    var legacy = await hashPinLegacy(pin);
    if (legacy === stored) {
      await savePinSecure(pin);
      console.log('[PIN 迁移] 已升级为 PBKDF2 + 独立盐');
      return true;
    }
    try {
      if (window.wwKeyDerivationCache && typeof window.wwKeyDerivationCache.clearPin === 'function') {
        window.wwKeyDerivationCache.clearPin(String(pin));
      }
    } catch (e) {}
    return false;
  }

  /** 从设备盐哈希迁移到 PBKDF2 + ww_pin_salt */
  async function upgradePinToPbkdf2Salt(pin) {
    var raw = crypto.getRandomValues(new Uint8Array(16));
    Store.set('ww_pin_salt', wwUint8ArrayToBase64Std(raw));
    var h = await hashPinPbkdf2(pin, raw);
    Store.set('ww_pin_hash', h);
  }

  /**
   * 安全保存 PIN（hash 存储）
   * @param {string} pin
   * @returns {Promise<void>}
   */
  async function savePinSecure(pin) {
    var raw = crypto.getRandomValues(new Uint8Array(16));
    Store.set('ww_pin_salt', wwUint8ArrayToBase64Std(raw));
    var hash = await hashPinPbkdf2(pin, raw);
    Store.set('ww_pin_hash', hash);
    Store.remove('ww_pin');
    Store.remove('ww_unlock_pin');
    try {
      if (window.wwKeyDerivationCache && typeof window.wwKeyDerivationCache.clear === 'function') {
        window.wwKeyDerivationCache.clear();
      }
      if (window.wwSessionKeyCache && typeof window.wwSessionKeyCache.clear === 'function') {
        window.wwSessionKeyCache.clear();
      }
    } catch (e) {}
  }

  // ── 会话私钥管理（闭包保护，不挂 window）──
  var _sessionPrivateKeys = null;
  var _keysClearTimer = null;

  function setSessionKeys(keys) {
    _sessionPrivateKeys = keys;
    if (_keysClearTimer) clearTimeout(_keysClearTimer);
    _keysClearTimer = setTimeout(function () {
      _sessionPrivateKeys = null;
      console.log('[安全] 会话私钥已自动清除');
    }, 300000);
  }

  function getSessionKeys() {
    return _sessionPrivateKeys;
  }

  function clearSessionKeys() {
    _sessionPrivateKeys = null;
    if (_keysClearTimer) {
      clearTimeout(_keysClearTimer);
      _keysClearTimer = null;
    }
    console.log('[安全] 会话私钥已清除');
  }

  function isSessionUnlocked() {
    return _sessionPrivateKeys !== null;
  }

  (function wwRegisterSessionKeyPageLifecycle() {
    if (typeof window === 'undefined') return;
    function wipe() {
      try {
        clearSessionKeys();
      } catch (_e) {}
    }
    window.addEventListener('pagehide', wipe);
    try {
      window.addEventListener('beforeunload', wipe);
    } catch (_e2) {}
  })();

  // 白名单导出（仅此等可从其他脚本 / 控制台预期访问）
  window.verifyPin = verifyPin;
  window.savePinSecure = savePinSecure;
  window.decryptWalletSensitive = decryptWalletSensitive;
  window.loadWalletPublic = loadWalletPublic;
  window.saveWalletSecure = saveWalletSecure;
  window.wwB64StdToUint8Array = wwB64StdToUint8Array;
  window.wwUint8ArrayToBase64Std = wwUint8ArrayToBase64Std;
})();
