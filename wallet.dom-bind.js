// wallet.dom-bind.js — CSP：替代 wallet.html 内联 onclick/onchange 等，由同源脚本绑定
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

  function handleDataWwFn(ev) {
    var el = ev.target.closest('[data-ww-fn]');
    if (!el) return;
    var fn = el.getAttribute('data-ww-fn');
    if (!fn) return;

    switch (fn) {
      case 'go-page': {
        var page = el.getAttribute('data-ww-page');
        if (!page || typeof window.goTo !== 'function') break;
        var opts = {};
        if (el.getAttribute('data-ww-preserve') === '1') opts.preserveKeyPage = true;
        window.goTo(page, opts);
        break;
      }
      case 'go-tab': {
        var tab = el.getAttribute('data-ww-page');
        if (tab && typeof window.goTab === 'function') window.goTab(tab);
        break;
      }
      case 'go-key-back':
        if (typeof window.goTo === 'function') window.goTo(window._keyBackPage || 'page-create');
        break;
      case 'go-key-back-settings':
        if (typeof window.goTo === 'function') window.goTo(window._keyBackPage || 'page-settings');
        break;
      case 'go-import-back':
        if (typeof window.goTo === 'function') window.goTo(window._importBackTarget || 'page-welcome');
        break;
      case 'create-new-wallet':
        wwCall('createNewWallet');
        break;
      case 'start-verify':
        wwCall('startVerify');
        break;
      case 'check-verify':
        wwCall('checkVerify');
        break;
      case 'prompt-notifications':
        wwCall('promptWalletNotifications');
        break;
      case 'copy-native':
        wwCall('copyNative');
        break;
      case 'customize-addr':
        wwCall('openCustomizeAddr');
        break;
      case 'chain-copy': {
        var fromId = el.getAttribute('data-ww-from');
        var node = fromId ? document.getElementById(fromId) : null;
        var txt = node ? String(node.textContent || '').trim() : '';
        wwCall('copySingle', txt, el);
        break;
      }
      case 'hide-qr':
        wwCall('hideQR');
        break;
      case 'do-transfer':
        wwCall('doTransfer');
        break;
      case 'close-transfer-confirm':
        wwCall('closeTransferConfirm');
        break;
      case 'confirm-transfer':
        wwCall('confirmTransfer');
        break;
      case 'open-pin-settings':
        wwCall('openPinSettingsDialog');
        break;
      case 'backup-mnemonic':
        window._keyBackPage = 'page-settings';
        if (typeof window.goTo === 'function') window.goTo('page-key');
        break;
      case 'delete-wallet':
        if (!confirm('确定删除本机钱包？此操作会清空本地数据。')) break;
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
        break;
      case 'swap-history-toast':
        if (typeof window.showToast === 'function') window.showToast('兑换在 SunSwap 完成，本页不保存历史记录', 'info');
        break;
      case 'set-swap-max':
        wwCall('setSwapMax');
        break;
      case 'do-swap':
        wwCall('doSwap');
        break;
      case 'do-import-wallet':
        wwCall('doImportWallet');
        break;
      case 'create-gift':
        wwCall('createGift');
        break;
      case 'copy-hb-keyword':
        wwCall('copyHbCreatedKeyword');
        break;
      case 'share-hb-keyword':
        wwCall('shareHbCreatedKeyword');
        break;
      case 'submit-claim':
        wwCall('submitClaim');
        break;
      case 'pin-backspace':
        wwCall('pinUnlockBackspace');
        break;
      case 'pin-clear':
        wwCall('pinUnlockClear');
        break;
      case 'close-pin-unlock':
        wwCall('closePinUnlock');
        break;
      case 'submit-totp':
        wwCall('submitTotpUnlock');
        break;
      case 'close-totp':
        wwCall('closeTotpUnlock');
        break;
      case 'confirm-totp-setup':
        wwCall('confirmTotpSetup');
        break;
      case 'close-totp-setup':
        wwCall('closeTotpSetup');
        break;
      case 'close-pin-setup':
        wwCall('closePinSetupOverlay');
        break;
      case 'hb-success-close': {
        var ho = document.getElementById('hbSuccessOverlay');
        if (ho) ho.style.display = 'none';
        break;
      }
      default:
        return;
    }
    if (el.tagName === 'A' || (el.tagName === 'BUTTON' && el.getAttribute('type') === 'submit')) {
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

    document.addEventListener('click', handleDataWwFn, false);

    var hc = document.getElementById('homeCopyAddrBtn');
    if (hc) {
      hc.addEventListener('click', function () {
        wwCall('copyHomeAddr');
      });
    }
    var he = document.getElementById('homeEditAddrBtn');
    if (he) {
      he.addEventListener('click', function () {
        wwCall('editHomeAddr');
      });
    }

    var trxRefresh = document.getElementById('trxResourceRefresh');
    if (trxRefresh) {
      trxRefresh.addEventListener('click', function () {
        if (typeof window.loadTrxResource === 'function') window.loadTrxResource();
      });
    }

    var balRefresh = document.getElementById('balRefreshBtn');
    if (balRefresh) {
      balRefresh.addEventListener('click', function () {
        wwCall('loadBalances');
      });
    }

    var txRefresh = document.querySelector('.home-tx-section .home-refresh-link');
    if (txRefresh) {
      txRefresh.addEventListener('click', function () {
        wwCall('loadTxHistory');
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
