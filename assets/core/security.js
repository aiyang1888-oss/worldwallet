/**
 * WorldWallet Security Layer
 * PIN 管理 + AES-GCM 加密 + 安全存储
 */

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
    // 兼容新旧格式
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

/**
 * PIN 转 SHA-256 hash（加盐）
 * @param {string} pin
 * @returns {Promise<string>}
 */
/** 旧版全局固定盐（仅用于校验历史哈希并迁移） */
function _wwLegacyPinSaltSuffix() {
  return 'ww_salt_v1_2026';
}

/**
 * 本机唯一 PIN 盐（16 字节 Base64），首次使用时生成并持久化
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

/** 新版：PIN + 每设备随机盐 */
async function hashPin(pin) {
  var enc = new TextEncoder();
  var saltB64 = getOrCreateDevicePinSaltB64();
  var data = enc.encode('ww_pin_v2|' + String(pin) + '|' + saltB64);
  var hashBuffer = await crypto.subtle.digest('SHA-256', data);
  var hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
}

/** 旧版固定盐 SHA-256（与历史 ww_pin_hash 兼容） */
async function hashPinLegacy(pin) {
  var enc = new TextEncoder();
  var data = enc.encode(String(pin) + _wwLegacyPinSaltSuffix());
  var hashBuffer = await crypto.subtle.digest('SHA-256', data);
  var hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
}

/**
 * 验证 PIN 是否正确
 * @param {string} pin
 * @returns {Promise<boolean>}
 */
async function verifyPin(pin) {
  var stored = Store.get('ww_pin_hash');
  if (!stored) {
    // 兼容旧版本：如果没有 hash，检查是否有明文 PIN
    var oldPin = Store.getPin();
    if (oldPin) {
      // 首次升级，自动迁移
      await savePinSecure(oldPin);
      console.log('[PIN 迁移] 已转为 hash 存储');
      return pin === oldPin;
    }
    return false;
  }
  var computed = await hashPin(pin);
  if (computed === stored) return true;
  var legacy = await hashPinLegacy(pin);
  if (legacy === stored) {
    await savePinSecure(pin);
    console.log('[PIN 迁移] 已升级为每设备盐哈希');
    return true;
  }
  try {
    if (window.wwKeyDerivationCache && typeof window.wwKeyDerivationCache.clearPin === 'function') {
      window.wwKeyDerivationCache.clearPin(String(pin));
    }
  } catch (e) {}
  return false;
}

/**
 * 安全保存 PIN（hash 存储）
 * @param {string} pin
 * @returns {Promise<void>}
 */
async function savePinSecure(pin) {
  var hash = await hashPin(pin);
  Store.set('ww_pin_hash', hash);
  // 清理旧的明文 PIN
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

// ── 会话私钥管理（闭包保护）──
var _sessionPrivateKeys = null;
var _keysClearTimer = null;

/**
 * 设置会话私钥（5分钟后自动清除）
 * @param {{mnemonic:string, ethKey:string, trxKey:string, btcKey:string}} keys
 */
function setSessionKeys(keys) {
  _sessionPrivateKeys = keys;
  // 清除旧定时器
  if (_keysClearTimer) clearTimeout(_keysClearTimer);
  // 5分钟后自动清除
  _keysClearTimer = setTimeout(function() {
    _sessionPrivateKeys = null;
    console.log('[安全] 会话私钥已自动清除');
  }, 300000);
}

/**
 * 获取会话私钥
 * @returns {{mnemonic:string, ethKey:string, trxKey:string, btcKey:string}|null}
 */
function getSessionKeys() {
  return _sessionPrivateKeys;
}

/**
 * 手动清除会话私钥
 */
function clearSessionKeys() {
  _sessionPrivateKeys = null;
  if (_keysClearTimer) {
    clearTimeout(_keysClearTimer);
    _keysClearTimer = null;
  }
  console.log('[安全] 会话私钥已清除');
}

/**
 * 检查会话是否已解锁
 * @returns {boolean}
 */
function isSessionUnlocked() {
  return _sessionPrivateKeys !== null;
}

/** 页面关闭或离开时立即清除会话私钥（不依赖 5 分钟定时器） */
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
