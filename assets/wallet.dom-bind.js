// wallet.dom-bind.js — CSP：表单/输入/遮罩由本文件绑定；wallet.html 勿再写重复的 onsubmit/oninput/onchange/onkeydown 或遮罩 onclick（否则会执行两次）
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
    var raw = ev.target;
    var root = raw && raw.nodeType === 1 ? raw : raw && raw.parentElement;
    if (!root || typeof root.closest !== 'function') return;

    var coinHost = root.closest('[data-coin]');
    if (coinHost && coinHost.getAttribute('data-coin')) {
      var coin = coinHost.getAttribute('data-coin');
      if (typeof selectTransferCoin === 'function') selectTransferCoin(coin);
      ev.preventDefault();
      return;
    }

    var el = root.closest(
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
      var rawOpts = el.getAttribute('data-ww-go-opts') || '{}';
      var opts0 = {};
      try {
        opts0 = JSON.parse(rawOpts);
      } catch (_e) {}
      if (el.getAttribute('data-ww-force-home') === '1' || el.getAttribute('data-ww-force-home') === 'true') {
        opts0.forceHome = true;
      }
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
        if (typeof window.wwPurgeLocalWalletStorage === 'function') window.wwPurgeLocalWalletStorage();
        else {
          try {
            localStorage.removeItem('ww_wallet');
            localStorage.removeItem('ww_pin');
            localStorage.removeItem('ww_pin_hash');
            localStorage.removeItem('ww_pin_device_salt_v1');
            localStorage.removeItem('ww_hongbaos');
          } catch (_ls) {}
          try {
            window.REAL_WALLET = null;
          } catch (_rw) {}
        }
        if (typeof window.goTo === 'function') window.goTo('page-welcome');
        wwCall('showToast', '钱包已删除', 'success');
        ev.preventDefault();
        return;
      }
      if (fn === 'swapHistoryToast' || fn === 'wwSwapRecordsToast') {
        if (typeof window.wwGoHomeScrollToTxSection === 'function') window.wwGoHomeScrollToTxSection();
        else if (typeof window.showToast === 'function') {
          window.showToast('应用内兑换与「给他人」占位在首页「最近交易」；链上成交后可点刷新', 'info', 4200);
        }
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

  function initNavBackKeyboard() {
    document.querySelectorAll('.nav-back,.pin-setup-cancel').forEach(function (el) {
      if (el.getAttribute('tabindex') == null) el.setAttribute('tabindex', '0');
      if (!el.getAttribute('role')) el.setAttribute('role', 'button');
      if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', el.classList.contains('pin-setup-cancel') ? '取消' : '返回');
      el.addEventListener('keydown', function (ev) {
        if (ev.key !== 'Enter' && ev.key !== ' ') return;
        ev.preventDefault();
        el.click();
      });
    });
  }

  function run() {
    initNavBackKeyboard();
    bindFormSubmit('pageRestorePinForm', 'submitPageRestorePin');
    bindFormSubmit('pinUnlockForm', 'submitPinUnlock');

    bindSelect('mnemonicLength', 'changeMnemonicLength');
    bindSelect('importPageLang', 'switchLang');
    bindSelect('importMnemonicLength', 'changeImportMnemonicLength');
    bindSelect('qrChainSelect', 'updateQRCode');

    bindChange('hideZeroTokens', 'onHideZeroTokensChange');

    bindInput('txHistoryFilter', 'applyTxHistoryFilter', false);
    bindInput('transferAddr', 'detectAddrType', false);
    bindInput('transferAmount', 'calcTransferFee', false);
    bindInput('swapAmountIn', 'calcSwap', false);
    bindInput('claimInput', 'onClaimInput', false);

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

    try {
      if (typeof wwMigrateLocalStorageToIdbOnce === 'function') {
        setTimeout(function () { wwMigrateLocalStorageToIdbOnce(); }, 0);
      }
    } catch (_mig) {}

    /* 密钥页「暂时忽略验证」：捕获阶段绑定，不依赖 inline 与 wwSkipVerifyToHome 是否已挂到 window；先收起加载遮罩再 goTo */
    var wwSkipBtn = document.getElementById('wwBtnSkipVerify');
    if (wwSkipBtn) {
      wwSkipBtn.addEventListener(
        'click',
        function () {
          try {
            if (typeof window.wwSkipVerifyToHome === 'function') {
              window.wwSkipVerifyToHome();
              return;
            }
          } catch (_sk) {}
          try {
            if (typeof hideWalletLoading === 'function') hideWalletLoading();
          } catch (_h) {}
          try {
            if (typeof window.goTo === 'function') window.goTo('page-home', { forceHome: true });
          } catch (_g) {}
        },
        true
      );
    }

    document.addEventListener('click', handleWwClick, false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
