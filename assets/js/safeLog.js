(function (g) {
  function maskAddr(s) {
    if (s == null || typeof s !== 'string') return s;
    var t = s.trim();
    if (t.length <= 10) return '***';
    return t.slice(0, 6) + '…' + t.slice(-4);
  }
  var SENS = ['mnemonic', 'privateKey', 'trxPrivateKey', 'seed', 'decrypted', 'enMnemonic', 'words', 'ethKey', 'trxKey', 'btcKey', 'xprv'];
  var ADDR_KEYS = ['ethAddress', 'trxAddress', 'btcAddress', 'address', 'from', 'to'];
  function sanitize(obj) {
    if (obj == null || typeof obj !== 'object') return obj;
    try {
      if (typeof REAL_WALLET !== 'undefined' && obj === REAL_WALLET) return '[REAL_WALLET]';
      if (typeof wwGetTempWallet === 'function' && obj === wwGetTempWallet()) return '[TEMP_WALLET]';
    } catch (e) {}
    try {
      var o = JSON.parse(JSON.stringify(obj));
      SENS.forEach(function (k) {
        if (Object.prototype.hasOwnProperty.call(o, k)) o[k] = '[redacted]';
      });
      ADDR_KEYS.forEach(function (k) {
        if (typeof o[k] === 'string') o[k] = maskAddr(o[k]);
      });
      return o;
    } catch (e) {
      return '[object]';
    }
  }
  g.safeLog = function () {
    var parts = [];
    for (var i = 0; i < arguments.length; i++) {
      var a = arguments[i];
      if (a && typeof a === 'object') parts.push(JSON.stringify(sanitize(a)));
      else parts.push(String(a));
    }
    console.log.apply(console, parts);
  };
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);
