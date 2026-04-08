// wallet.dom-bind.js — CSP：wallet.html 内联事件由同源脚本绑定（配合 data-ww-*）
(function () {
  function wwCall(name) {
    try {
      var g = typeof window !== 'undefined' ? window : {};
      if (typeof g[name] === 'function') return g[name].apply(g, Array.prototype.slice.call(arguments, 1));
    } catch (_e) {}
    return undefined;
  }

  function bindOverlayBackdrop(id, closeFnName) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', function (e) {
      if (e.target !== el) return;
      wwCall(closeFnName);
    });
  }

  function bindFormSubmit(id, fnName) {
    var f = document.getElementById(id);
    if (!f) return;
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      wwCall(fnName);
    });
  }

  function bindSelect(id, fnName) {
    var s = document.getElementById(id);
    if (!s) return;
    s.addEventListener('change', function () {
      wwCall(fnName, s.value);
    });
  }

  function bindInput(id, fnName, passValue) {
    var n = document.getElementById(id);
    if (!n) return;
    n.addEventListener('input', function () {
      if (passValue) wwCall(fnName, n.value);
      else wwCall(fnName);
    });
  }

  function bindChange(id, fnName) {
    var n = document.getElementById(id);
    if (!n) return;
    n.addEventListener('change', function () {
      wwCall(fnName);
    });
  }

  function bindKeydownEnter(id, fnName) {
    var n = document.getElementById(id);
    if (!n) return;
    n.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') wwCall(fnName);
    });
  }

  function handleWwClick(ev) {
    var coinHost = ev.target.closest('[data-coin]');
    if (coinHost && coinHost.getAttribute('data-coin')) {
      var coin = coinHost.getAttribute('data-coin');
      if (typeof selectTransferCoin === 'function') selectTransferCoin(coin);
      ev.preventDefault();
      return;
    }

    var el = ev.target.closest(
      '[data-ww-go],[data-ww-go-tab],[data-ww-go-keyback],[data-ww-go-import-back],[data-ww-go-with-opts],[data-ww-fn],[data-ww-copy-from],[data-ww-load-trx]'
    );
    if (!el) return;

    if (el.hasAttribute('data-ww-copy-from')) {
      var fid = el.getAttribute('data-ww-copy-from');
      var node = fid ? document.getElementById(fid) : null;
      var txt = node ? String(node.textContent || '').trim() : '';
      wwCall('copySingle', txt, el);
      ev.preventDefault();
      return;
    }

    if (el.hasAttribute('data-ww-load-trx')) {
      if (typeof window.loadTrxResource === 'function') window.loadTrxResource();
      ev.preventDefault();
      return;
    }

    if (el.hasAttribute('data-ww-go-with-opts')) {
      var page0 = el.getAttribute('data-ww-go-with-opts');
      var raw = el.getAttribute('data-ww-go-opts') || '{}';
      var opts0 = {};
      try {
        opts0 = JSON.parse(raw);
      } catch (_e) {}
      if (page0 && typeof window.goTo === 'function') window.goTo(page0, opts0);
      ev.preventDefault();
      return;
    }

    if (el.hasAttribute('data-ww-go-import-back')) {
      var fbb = el.getAttribute('data-ww-go-import-back');
      if (typeof window.goTo === 'function') window.goTo(window._importBackTarget || fbb);
      ev.preventDefault();
      return;
    }

    if (el.hasAttribute('data-ww-go')) {
      var page = el.getAttribute('data-ww-go');
      var opts = {};
      if (el.getAttribute('data-ww-preserve') === '1') opts.preserveKeyPage = true;
      if (page && typeof window.goTo === 'function') window.goTo(page, opts);
      ev.preventDefault();
      return;
    }

    if (el.hasAttribute('data-ww-go-tab')) {
      var tab = el.getAttribute('data-ww-go-tab');
      if (tab && typeof window.goTab === 'function') window.goTab(tab);
      ev.preventDefault();
      return;
    }

    if (el.hasAttribute('data-ww-go-keyback')) {
      var fb = el.getAttribute('data-ww-go-keyback');
      if (typeof window.goTo === 'function') window.goTo(window._keyBackPage || fb);
      ev.preventDefault();
      return;
    }

    if (el.hasAttribute('data-ww-fn')) {
      var fn = el.getAttribute('data-ww-fn');
      if (fn === 'deleteWalletRow' || fn === 'wwDeleteLocalWallet') {
        if (!confirm('确定删除本机钱包？此操作会清空本地数据。')) return;
        try {
          localStorage.removeItem('ww_wallet');
          localStorage.removeItem('ww_pin');
          localStorage.removeItem('ww_hongbaos');
        } catch (_ls) {}
        try {
          window.REAL_WALLET = null;
        } catch (_rw) {}
        if (typeof window.goTo === 'function') window.goTo('page-welcome');
        wwCall('showToast', '钱包已删除', 'success');
        ev.preventDefault();
        return;
      }
      if (fn === 'swapHistoryToast' || fn === 'wwSwapRecordsToast') {
        if (typeof window.showToast === 'function') window.showToast('兑换在 SunSwap 完成，本页不保存历史记录', 'info');
        ev.preventDefault();
        return;
      }
      if (fn === 'backupMnemonicRow' || fn === 'wwOpenBackupFromSettings') {
        window._keyBackPage = 'page-settings';
        if (typeof window.goTo === 'function') window.goTo('page-key');
        ev.preventDefault();
        return;
      }
      if (fn === 'hbSuccessClose' || fn === 'wwHideHbSuccessOverlay') {
        var ho = document.getElementById('hbSuccessOverlay');
        if (ho) ho.style.display = 'none';
        ev.preventDefault();
        return;
      }
      if (typeof window[fn] === 'function') window[fn]();
      ev.preventDefault();
    }
  }

  function run() {
    bindFormSubmit('pageRestorePinForm', 'submitPageRestorePin');
    bindFormSubmit('pinUnlockForm', 'submitPinUnlock');

    bindSelect('keyPageLang', 'switchLang');
    bindSelect('mnemonicLength', 'changeMnemonicLength');
    bindSelect('qrChainSelect', 'updateQRCode');

    bindChange('hideZeroTokens', 'onHideZeroTokensChange');

    bindInput('txHistoryFilter', 'applyTxHistoryFilter', false);
    bindInput('qrReceiveAmount', 'updateQRCode', false);
    bindInput('transferAddr', 'detectAddrType', false);
    bindInput('transferAmount', 'calcTransferFee', false);
    bindInput('swapAmountIn', 'calcSwap', false);
    bindInput('importPaste', 'syncImportGrid', true);

    var importGrid = document.getElementById('importGrid');
    if (importGrid) {
      importGrid.addEventListener('input', function (e) {
        var t = e.target;
        if (!t || !t.classList || !t.classList.contains('import-word')) return;
        if (typeof window.syncImportPasteFromGrid === 'function') window.syncImportPasteFromGrid();
      });
    }

    bindKeydownEnter('claimInput', 'submitClaim');
    bindKeydownEnter('totpUnlockInput', 'submitTotpUnlock');
    bindKeydownEnter('totpSetupVerifyInput', 'confirmTotpSetup');

    bindOverlayBackdrop('pinUnlockOverlay', 'closePinUnlock');
    bindOverlayBackdrop('totpUnlockOverlay', 'closeTotpUnlock');
    bindOverlayBackdrop('totpSetupOverlay', 'closeTotpSetup');
    bindOverlayBackdrop('transferConfirmOverlay', 'closeTransferConfirm');
    bindOverlayBackdrop('pinSetupOverlay', 'closePinSetupOverlay');
    bindOverlayBackdrop('qrOverlay', 'hideQR');

    var tabBar = document.getElementById('tabBar');
    if (tabBar) {
      tabBar.addEventListener('click', function (e) {
        var item = e.target.closest('.tab-item');
        if (!item || !tabBar.contains(item)) return;
        if (typeof window.goTab === 'function') window.goTab(item.id);
      });
    }

    document.addEventListener('click', handleWwClick, false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
