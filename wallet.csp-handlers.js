/**
 * CSP: 替代 wallet.html 内联 onclick/oninput 等，事件由外部脚本绑定。
 * 须在 wallet.ui.js / wallet.runtime.js 之后加载。
 */
(function () {
  'use strict';

  function callGlobal(name) {
    var fn = typeof window[name] === 'function' ? window[name] : null;
    if (fn) fn();
  }

  function goKeyBack(fallbackPage) {
    var p = window._keyBackPage || fallbackPage;
    if (typeof goTo === 'function') goTo(p);
  }

  function goImportBack(fallbackPage) {
    var p = window._importBackTarget || fallbackPage;
    if (typeof goTo === 'function') goTo(p);
  }

  function wwOpenBackupFromSettings() {
    window._keyBackPage = 'page-settings';
    if (typeof goTo === 'function') goTo('page-key');
  }

  function wwSwapRecordsToast() {
    if (typeof showToast === 'function') {
      showToast('兑换在 SunSwap 完成，本页不保存历史记录', 'info');
    }
  }

  function wwDeleteLocalWallet() {
    if (!confirm('确定删除本机钱包？此操作会清空本地数据。')) return;
    try {
      localStorage.removeItem('ww_wallet');
      localStorage.removeItem('ww_pin');
      localStorage.removeItem('ww_hongbaos');
      if (typeof REAL_WALLET !== 'undefined') REAL_WALLET = null;
    } catch (e) {}
    if (typeof goTo === 'function') goTo('page-welcome');
    if (typeof showToast === 'function') showToast('钱包已删除', 'success');
  }

  function wwHideHbSuccessOverlay() {
    var o = document.getElementById('hbSuccessOverlay');
    if (o) o.style.display = 'none';
  }

  window.wwOpenBackupFromSettings = wwOpenBackupFromSettings;
  window.wwSwapRecordsToast = wwSwapRecordsToast;
  window.wwDeleteLocalWallet = wwDeleteLocalWallet;
  window.wwHideHbSuccessOverlay = wwHideHbSuccessOverlay;

  function onClickDelegated(ev) {
    var el = ev.target.closest(
      '[data-ww-go],[data-ww-go-keyback],[data-ww-go-import-back],[data-ww-go-tab],[data-ww-go-opts],[data-ww-fn],[data-ww-copy-from],[data-ww-load-trx]'
    );
    if (!el) return;

    if (el.hasAttribute('data-ww-go')) {
      var page = el.getAttribute('data-ww-go');
      if (page && typeof goTo === 'function') goTo(page);
      return;
    }
    if (el.hasAttribute('data-ww-go-with-opts')) {
      var pg = el.getAttribute('data-ww-go-with-opts');
      var raw = el.getAttribute('data-ww-go-opts') || '{}';
      var opts = {};
      try {
        opts = JSON.parse(raw);
      } catch (e) {}
      if (pg && typeof goTo === 'function') goTo(pg, opts);
      return;
    }
    if (el.hasAttribute('data-ww-go-keyback')) {
      goKeyBack(el.getAttribute('data-ww-go-keyback') || 'page-create');
      return;
    }
    if (el.hasAttribute('data-ww-go-import-back')) {
      goImportBack(el.getAttribute('data-ww-go-import-back') || 'page-welcome');
      return;
    }
    if (el.hasAttribute('data-ww-go-tab')) {
      var tab = el.getAttribute('data-ww-go-tab');
      if (tab && typeof goTab === 'function') goTab(tab);
      return;
    }
    if (el.hasAttribute('data-ww-copy-from')) {
      var id = el.getAttribute('data-ww-copy-from');
      var node = id ? document.getElementById(id) : null;
      if (node && typeof copySingle === 'function') copySingle(node.textContent, el);
      return;
    }
    if (el.hasAttribute('data-ww-load-trx')) {
      if (typeof loadTrxResource === 'function') loadTrxResource();
      return;
    }
    if (el.hasAttribute('data-ww-fn')) {
      var fn = el.getAttribute('data-ww-fn');
      if (fn === 'wwOpenBackupFromSettings') wwOpenBackupFromSettings();
      else if (fn === 'wwSwapRecordsToast') wwSwapRecordsToast();
      else if (fn === 'wwDeleteLocalWallet') wwDeleteLocalWallet();
      else if (fn === 'wwHideHbSuccessOverlay') wwHideHbSuccessOverlay();
      else callGlobal(fn);
    }
  }

  function bindOverlayBackdrop(id, fnName) {
    var o = document.getElementById(id);
    if (!o || !fnName) return;
    o.addEventListener('click', function (e) {
      if (e.target !== o) return;
      callGlobal(fnName);
    });
  }

  function bindStopClick() {
    document.querySelectorAll('[data-ww-stop]').forEach(function (node) {
      node.addEventListener('click', function (e) {
        e.stopPropagation();
      });
    });
  }

  function bindById(id, event, handler) {
    var n = document.getElementById(id);
    if (n) n.addEventListener(event, handler);
  }

  function initForms() {
    bindById('pageRestorePinForm', 'submit', function (e) {
      e.preventDefault();
      callGlobal('submitPageRestorePin');
    });
    bindById('pinUnlockForm', 'submit', function (e) {
      e.preventDefault();
      callGlobal('submitPinUnlock');
    });
  }

  function initInputs() {
    bindById('keyPageLang', 'change', function () {
      if (typeof switchLang === 'function') switchLang(this.value);
    });
    bindById('mnemonicLength', 'change', function () {
      if (typeof changeMnemonicLength === 'function') changeMnemonicLength(this.value);
    });
    bindById('hideZeroTokens', 'change', function () {
      callGlobal('onHideZeroTokensChange');
    });
    bindById('txHistoryFilter', 'input', function () {
      callGlobal('applyTxHistoryFilter');
    });
    bindById('qrChainSelect', 'change', function () {
      callGlobal('updateQRCode');
    });
    bindById('qrReceiveAmount', 'input', function () {
      callGlobal('updateQRCode');
    });
    bindById('transferAddr', 'input', function () {
      callGlobal('detectAddrType');
    });
    bindById('transferAmount', 'input', function () {
      callGlobal('calcTransferFee');
    });
    bindById('swapAmountIn', 'input', function () {
      callGlobal('calcSwap');
    });
    bindById('importPaste', 'input', function () {
      if (typeof syncImportGrid === 'function') syncImportGrid(this.value);
    });
    bindById('claimInput', 'keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        callGlobal('submitClaim');
      }
    });
    bindById('totpUnlockInput', 'keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        callGlobal('submitTotpUnlock');
      }
    });
    bindById('totpSetupVerifyInput', 'keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        callGlobal('confirmTotpSetup');
      }
    });
  }

  function init() {
    bindStopClick();
    bindOverlayBackdrop('qrOverlay', 'hideQR');
    bindOverlayBackdrop('transferConfirmOverlay', 'closeTransferConfirm');
    bindOverlayBackdrop('pinUnlockOverlay', 'closePinUnlock');
    bindOverlayBackdrop('totpUnlockOverlay', 'closeTotpUnlock');
    bindOverlayBackdrop('totpSetupOverlay', 'closeTotpSetup');
    bindOverlayBackdrop('pinSetupOverlay', 'closePinSetupOverlay');
    initForms();
    initInputs();
    document.addEventListener('click', onClickDelegated);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
