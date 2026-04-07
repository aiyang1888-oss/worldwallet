/**
 * WorldWallet Security Layer
 * PIN 管理 + AES-GCM 加密 + 安全存储
 */

/**
 * 从 PIN 派生 AES-256-GCM 密钥
 * @param {string} pin
 * @param {Uint8Array} salt - 16字节
 * @returns {Promise<CryptoKey>}
 */
async function deriveKeyFromPin(pin, salt) {
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
    salt: btoa(String.fromCharCode.apply(null, salt)),
    iv: btoa(String.fromCharCode.apply(null, iv)),
    data: btoa(String.fromCharCode.apply(null, new Uint8Array(encrypted)))
  };
}

/**
 * AES-GCM 解密
 * @param {{salt:string, iv:string, data:string}} bundle
 * @param {string} pin
 * @returns {Promise<string>}
 */
async function decryptWithPin(bundle, pin) {
  var salt = Uint8Array.from(atob(bundle.salt), function(c) { return c.charCodeAt(0); });
  var iv = Uint8Array.from(atob(bundle.iv), function(c) { return c.charCodeAt(0); });
  var data = Uint8Array.from(atob(bundle.data), function(c) { return c.charCodeAt(0); });
  var key = await deriveKeyFromPin(pin, salt);
  var decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv }, key, data
  );
  return new TextDecoder().decode(decrypted);
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
async function hashPin(pin) {
  var enc = new TextEncoder();
  var data = enc.encode(pin + 'ww_salt_v1_2026');
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
  return computed === stored;
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
