// api-config.js — 可选第三方 API 密钥（仅通过部署时注入的 meta，禁止在源码中写真实 Key）
(function (global) {
  'use strict';

  function wtResolveTronApiKey() {
    try {
      var m = document.querySelector('meta[name="wt-tron-api-key"]');
      var v = m && m.getAttribute('content') != null ? String(m.getAttribute('content')).trim() : '';
      if (!v) return '';
      if (/^YOUR_/i.test(v) || v === 'YOUR_API_KEY') return '';
      return v;
    } catch (e) {
      return '';
    }
  }

  /** TronGrid REST 可选请求头（有 Key 时附加 TRON-PRO-API-KEY） */
  global.wtTronGridHeaders = function () {
    var k = wtResolveTronApiKey();
    return k ? { 'TRON-PRO-API-KEY': k } : {};
  };

  /** 合并 fetch init.headers，供 TronGrid 请求使用 */
  global.wtTronGridFetchInit = function (init) {
    init = init || {};
    var headers = Object.assign({}, global.wtTronGridHeaders(), init.headers || {});
    init.headers = headers;
    return init;
  };
})(typeof window !== 'undefined' ? window : this);
