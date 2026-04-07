// storage.js — localStorage 统一存取层
// 所有 localStorage 操作通过 Store 对象

var Store = {
  /** 读取（JSON 值解析为对象；缺失键返回 null；非 JSON 原样返回字符串） */
  get: function(key) {
    var raw = localStorage.getItem(key);
    if (raw === null) return null;
    try { return JSON.parse(raw); }
    catch (e) { return raw; }
  },

  /** 写入（自动 JSON 序列化） */
  set: function(key, val) {
    try { localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val)); }
    catch(e) { safeLog('[Store.set]', key, e); }
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

  /**
   * 始终返回字符串，避免 JSON.parse 把纯数字 PIN 变成 number 导致与输入比较失败。
   * 兼容旧键名 ww_unlock_pin（与 ww_pin 不一致时迁移到 ww_pin）。
   */
  getPin: function() {
    var raw = localStorage.getItem('ww_pin');
    if (raw === null || raw === '') {
      var leg = localStorage.getItem('ww_unlock_pin');
      if (leg !== null && leg !== '') {
        try {
          localStorage.setItem('ww_pin', leg);
          localStorage.removeItem('ww_unlock_pin');
        } catch (e) {}
        raw = leg;
      }
    }
    return raw === null || raw === '' ? '' : String(raw);
  },
  setPin: function(v) { this.set('ww_pin', v); },
  clearPin: function() { this.remove('ww_pin'); },

  getTheme: function() { return this.get('ww_theme') || 'dark'; },
  setTheme: function(v) { this.set('ww_theme', v); },

  getWallet: function() { return this.get('ww_wallet'); },
  setWallet: function(v) { this.set('ww_wallet', v); },

  getNickname: function() { return this.get('ww_wallet_nickname') || ''; },
  setNickname: function(v) { this.set('ww_wallet_nickname', (v||'').trim().slice(0,32)); },
};
