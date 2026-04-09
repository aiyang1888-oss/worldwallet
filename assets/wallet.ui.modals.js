/**
 * 通用弹层：转账/兑换进度、轻量确认（依赖 wallet.html 已有 overlay / loading）
 */
(function (global) {
  'use strict';

  function _ensureProgressOverlay() {
    var el = document.getElementById('wwModalProgressOverlay');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'wwModalProgressOverlay';
    el.className = 'qr-overlay';
    el.setAttribute('role', 'alertdialog');
    el.setAttribute('aria-live', 'assertive');
    el.style.zIndex = '12000';
    el.innerHTML =
      '<div class="qr-card" onclick="event.stopPropagation()" style="max-width:300px;text-align:center;padding:24px 20px">' +
      '<div id="wwModalProgressText" style="font-size:14px;color:var(--text);line-height:1.55">处理中…</div>' +
      '<div style="margin-top:14px;font-size:12px;color:var(--text-muted)" id="wwModalProgressSub"></div>' +
      '</div>';
    el.addEventListener('click', function (e) {
      if (e.target === el) global.wwModalHideProgress();
    });
    document.body.appendChild(el);
    return el;
  }

  global.wwModalShowProgress = function (mainText, subText) {
    var ov = _ensureProgressOverlay();
    var m = document.getElementById('wwModalProgressText');
    var s = document.getElementById('wwModalProgressSub');
    if (m) m.textContent = mainText || '处理中…';
    if (s) s.textContent = subText || '';
    ov.classList.add('show');
  };

  global.wwModalHideProgress = function () {
    var ov = document.getElementById('wwModalProgressOverlay');
    if (ov) ov.classList.remove('show');
  };

  /** 与首屏 loading 协调：短时间操作用 progress，长流程可叠用 showWalletLoading */
  global.wwModalWithProgress = async function (mainText, asyncFn) {
    global.wwModalShowProgress(mainText || '处理中…', '');
    try {
      return await asyncFn();
    } finally {
      global.wwModalHideProgress();
    }
  };
})(typeof window !== 'undefined' ? window : global);
