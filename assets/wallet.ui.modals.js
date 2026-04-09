/**
 * 通用弹层：转账/兑换进度、轻量确认（依赖 wallet.html 已有 overlay / loading）
 */
(function (global) {
  'use strict';

  var _wwModalLastFocus = null;
  var _wwModalConfirmPrevFocus = null;

  function _wwModalTrapFocus(overlay) {
    try {
      var card = overlay && overlay.querySelector ? overlay.querySelector('.qr-card') : null;
      if (!card) return;
      var focusables = card.querySelectorAll('a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])');
      if (focusables.length) focusables[0].focus();
    } catch (_e) { wwQuiet(_e); }
  }

  function _ensureProgressOverlay() {
    var el = document.getElementById('wwModalProgressOverlay');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'wwModalProgressOverlay';
    el.className = 'qr-overlay';
    el.setAttribute('role', 'alertdialog');
    el.setAttribute('aria-modal', 'true');
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

  function _wwModalOnKeydown(ev) {
    if (ev.key === 'Escape' || ev.key === 'Esc') {
      if (typeof global.wwModalHideProgress === 'function') global.wwModalHideProgress();
    }
  }

  global.wwModalShowProgress = function (mainText, subText) {
    var ov = _ensureProgressOverlay();
    var m = document.getElementById('wwModalProgressText');
    var s = document.getElementById('wwModalProgressSub');
    if (m) m.textContent = mainText || '处理中…';
    if (s) s.textContent = subText || '';
    try {
      _wwModalLastFocus = document.activeElement;
    } catch (_f) {
      _wwModalLastFocus = null;
    }
    ov.classList.add('show');
    _wwModalTrapFocus(ov);
    document.addEventListener('keydown', _wwModalOnKeydown, true);
  };

  global.wwModalHideProgress = function () {
    var ov = document.getElementById('wwModalProgressOverlay');
    if (ov) ov.classList.remove('show');
    document.removeEventListener('keydown', _wwModalOnKeydown, true);
    try {
      if (_wwModalLastFocus && _wwModalLastFocus.focus) _wwModalLastFocus.focus();
    } catch (_e) { wwQuiet(_e); }
    _wwModalLastFocus = null;
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

  /**
   * 轻量确认（Promise）；用于需要用户点确定的场景
   * @returns {Promise<boolean>}
   */
  global.wwModalConfirm = function (message, okText, cancelText) {
    return new Promise(function (resolve) {
      var ov = document.getElementById('wwModalConfirmOverlay');
      if (!ov) {
        ov = document.createElement('div');
        ov.id = 'wwModalConfirmOverlay';
        ov.className = 'qr-overlay';
        ov.setAttribute('role', 'dialog');
        ov.setAttribute('aria-modal', 'true');
        ov.style.zIndex = '12001';
        ov.innerHTML =
          '<div class="qr-card" onclick="event.stopPropagation()" style="max-width:320px;padding:20px 18px">' +
          '<div id="wwModalConfirmMsg" style="font-size:14px;color:var(--text);line-height:1.55;margin-bottom:16px"></div>' +
          '<div style="display:flex;gap:10px;justify-content:flex-end">' +
          '<button type="button" class="btn-secondary" id="wwModalConfirmCancel" style="padding:10px 14px">取消</button>' +
          '<button type="button" class="btn-primary" id="wwModalConfirmOk" style="padding:10px 14px">确定</button>' +
          '</div></div>';
        document.body.appendChild(ov);
        ov.addEventListener('click', function (e) {
          if (e.target === ov) finish(false);
        });
      }
      var msgEl = document.getElementById('wwModalConfirmMsg');
      var okBtn = document.getElementById('wwModalConfirmOk');
      var cancelB = document.getElementById('wwModalConfirmCancel');
      if (msgEl) msgEl.textContent = message || '确认？';
      if (okBtn) okBtn.textContent = okText || '确定';
      if (cancelB) cancelB.textContent = cancelText || '取消';
      try {
        _wwModalConfirmPrevFocus = document.activeElement;
      } catch (_fp) {
        _wwModalConfirmPrevFocus = null;
      }
      function cleanup() {
        document.removeEventListener('keydown', onKey, true);
        if (okBtn) okBtn.onclick = null;
        if (cancelB) cancelB.onclick = null;
      }
      function finish(ok) {
        cleanup();
        ov.classList.remove('show');
        try {
          if (_wwModalConfirmPrevFocus && _wwModalConfirmPrevFocus.focus) _wwModalConfirmPrevFocus.focus();
        } catch (_rf) { wwQuiet(_rf); }
        _wwModalConfirmPrevFocus = null;
        resolve(!!ok);
      }
      function onKey(ev) {
        if (ev.key === 'Escape' || ev.key === 'Esc') finish(false);
      }
      document.addEventListener('keydown', onKey, true);
      if (okBtn)
        okBtn.onclick = function () {
          finish(true);
        };
      if (cancelB)
        cancelB.onclick = function () {
          finish(false);
        };
      ov.classList.add('show');
      try {
        (okBtn || cancelB).focus();
      } catch (_ff) { wwQuiet(_ff); }
    });
  };
})(typeof window !== 'undefined' ? window : global);
