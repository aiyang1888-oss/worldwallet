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
