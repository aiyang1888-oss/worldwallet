// storage.js — localStorage 统一存取层
// 所有 localStorage 操作通过 Store 对象

var Store = {
  /** 读取（自动 JSON 解析） */
  get: function(key) {
    try { return JSON.parse(localStorage.getItem(key)); }
    catch(e) { return localStorage.getItem(key); }
  },

  /** 写入（自动 JSON 序列化） */
  set: function(key, val) {
    try { localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val)); }
    catch(e) { console.warn('[Store.set]', key, e); }
  },

  /** 删除 */
  remove: function(key) {
    try { localStorage.removeItem(key); } catch(e) {}
  },

  /** 检查是否存在 */
  has: function(key) {
    return localStorage.getItem(key) !== null;
  },

  // ── 快捷方法 ──

  getPin: function() { return this.get('ww_pin') || ''; },
  setPin: function(v) { this.set('ww_pin', v); },
  clearPin: function() { this.remove('ww_pin'); },

  getTheme: function() { return this.get('ww_theme') || 'dark'; },
  setTheme: function(v) { this.set('ww_theme', v); },

  getWallet: function() { return this.get('ww_wallet'); },
  setWallet: function(v) { this.set('ww_wallet', v); },

  getNickname: function() { return this.get('ww_wallet_nickname') || ''; },
  setNickname: function(v) { this.set('ww_wallet_nickname', (v||'').trim().slice(0,32)); },
};
