// wallet.dom-bind.js — CSP：wallet.html 内联事件由同源脚本绑定（配合 data-ww-*）
/** 欢迎页三按钮：必须在文件最前同步挂到 window，供按钮 HTML onclick 直接调用（不依赖事件捕获/冒泡委托）。
 * 本文件在 wallet.runtime.js 之后加载，goTo / createNewWallet 已存在。 */
(function wwWelcomeTapInlineEarly() {
  var _wwWelDeb = 0;
  function run(act) {
    var n = Date.now();
    if (n - _wwWelDeb < 400) return;
    _wwWelDeb = n;
    try {
      if (typeof window.wwFixWelcomeBootIfGuest === 'function') window.wwFixWelcomeBootIfGuest();
    } catch (_f) {}
    try {
      if (typeof window.wwClearHtmlBootRouteIfDestChanges === 'function') {
        window.wwClearHtmlBootRouteIfDestChanges('page-welcome');
      }
    } catch (_c) {}
    try {
      if (typeof tapHaptic === 'function') tapHaptic(12);
    } catch (_h) {}
    try {
      if (act === 'create' && typeof window.createNewWallet === 'function') {
        void window.createNewWallet();
        return;
      }
      if (act === 'pin' && typeof window.goTo === 'function') {
        window.goTo('page-password-restore');
        return;
      }
      if (act === 'import' && typeof window.goTo === 'function') {
        window.goTo('page-import');
        return;
      }
    } catch (e) {
      try {
        if (typeof safeLog === 'function') safeLog('[wwWelcomeTapInline]', e);
      } catch (_s) {}
    }
  }
  try {
    window.wwWelcomeTapInline = run;
  } catch (_w) {}
})();
(function () {
  function wwCall(name) {
    try {
      var g = typeof window !== 'undefined' ? window : {};
      if (typeof g[name] !== 'function') return undefined;
      var ret = g[name].apply(g, Array.prototype.slice.call(arguments, 1));
      if (ret != null && typeof ret.then === 'function' && typeof ret.catch === 'function') {
        ret.catch(function (err) {
          try {
            if (typeof safeLog === 'function') safeLog('[wwCall async] ' + name, err);
          } catch (_sl) {}
        });
      }
      return ret;
    } catch (_e) {
      try {
        if (typeof safeLog === 'function') safeLog('[wwCall] ' + name, _e);
      } catch (_s) {}
    }
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

  /** PIN 输入框：仅保留数字并限制 6 位，避免粘贴/输入法带入非数字导致误报失败 */
  function bindPinSixDigits(id) {
    var n = document.getElementById(id);
    if (!n) return;
    n.addEventListener('input', function () {
      var v = String(n.value || '').replace(/\D/g, '').slice(0, 6);
      if (n.value !== v) n.value = v;
    });
  }

  function wwDomEventTargetEl(ev) {
    var t = ev && ev.target;
    if (!t) return null;
    if (t.nodeType === 3) return t.parentElement || null;
    return t;
  }

  function handleWwClick(ev) {
    var _tg = wwDomEventTargetEl(ev);
    var coinHost = _tg && _tg.closest && _tg.closest('[data-coin]');
    if (coinHost && coinHost.getAttribute('data-coin')) {
      var coin = coinHost.getAttribute('data-coin');
      if (typeof selectTransferCoin === 'function') selectTransferCoin(coin);
      ev.preventDefault();
      return;
    }

    var el = _tg && _tg.closest && _tg.closest(
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
        if (typeof window.wwDeleteWalletFromSettings === 'function') {
          window.wwDeleteWalletFromSettings();
        } else if (confirm('确定删除本机钱包？此操作会清空本地数据。')) {
          try {
            if (typeof window.wwPurgeLocalWalletStorage === 'function') window.wwPurgeLocalWalletStorage();
            else {
              localStorage.removeItem('ww_wallet');
              localStorage.removeItem('ww_pin');
              localStorage.removeItem('ww_hongbaos');
            }
          } catch (_ls) {}
          if (typeof clearPublishedWallet === 'function') clearPublishedWallet();
          if (typeof window.goTo === 'function') window.goTo('page-welcome');
          wwCall('showToast', '钱包已删除', 'success');
        }
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
      if (typeof window[fn] === 'function') {
        window[fn](el);
        ev.preventDefault();
      }
    }
  }

  function run() {
    bindFormSubmit('pageRestorePinForm', 'submitPageRestorePin');
    bindFormSubmit('pinUnlockForm', 'submitPinUnlock');
    bindPinSixDigits('pinRestorePageInput');
    bindPinSixDigits('pinUnlockInput');
    bindPinSixDigits('pinInput');
    bindPinSixDigits('pinConfirmInput');
    bindPinSixDigits('pinVerifyInput');

    bindInput('pinInput', 'wwOnPinSetupLen', false);
    bindInput('pinConfirmInput', 'wwOnPinConfirmLen', false);

    bindKeydownEnter('pinInput', 'goToPinConfirm');
    bindKeydownEnter('pinConfirmInput', 'confirmPin');
    bindKeydownEnter('pinVerifyInput', 'pinVerifyEnterWallet');

    bindSelect('keyPageLang', 'switchLang');
    bindSelect('mnemonicLength', 'changeMnemonicLength');
    bindSelect('qrChainSelect', 'updateQRCode');

    bindChange('hideZeroTokens', 'onHideZeroTokensChange');

    bindInput('txHistoryFilter', 'applyTxHistoryFilter', false);
    bindInput('qrReceiveAmount', 'updateQRCode', false);
    bindInput('transferAddr', 'detectAddrType', false);
    bindInput('transferAmount', 'calcTransferFee', false);
    bindInput('addrBookListSearch', 'renderAddressBookSettingsList', false);
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
    bindInput('claimInput', 'onClaimInput', false);
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
        var _tb = wwDomEventTargetEl(e);
        var item = _tb && _tb.closest && _tb.closest('.tab-item');
        if (!item || !tabBar.contains(item)) return;
        if (typeof window.goTab === 'function') window.goTab(item.id);
      });
    }

    /* 密钥页「暂时忽略验证」：捕获阶段绑定；先提升 TEMP→REAL 再进首页（见 wallet.ui.js wwSkipVerifyToHome） */
    var wwSkipBtn = document.getElementById('wwBtnSkipVerify');
    if (wwSkipBtn) {
      wwSkipBtn.addEventListener(
        'click',
        function (ev) {
          try {
            if (ev && typeof ev.preventDefault === 'function') ev.preventDefault();
            if (ev && typeof ev.stopPropagation === 'function') ev.stopPropagation();
          } catch (_pe) {}
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
            if (typeof window.goTo === 'function') window.goTo('page-home', { forceHome: true, instant: true });
          } catch (_g) {}
          try {
            if (typeof window.goTab === 'function') setTimeout(function () { window.goTab('tab-home'); }, 0);
          } catch (_gt) {}
        },
        true
      );
    }

    /* 欢迎页三按钮：桌面以 HTML onclick → wwWelcomeTapInline 为主（最可靠）；touch/pointer 仅作移动端补充 */
    var pgWelcome = document.getElementById('page-welcome');
    if (pgWelcome) {
      var _wwWelTapX = 0;
      var _wwWelTapY = 0;
      function _wwWelcomeTargetEl(ev) {
        var t = ev && ev.target;
        if (!t) return null;
        if (t.nodeType === 3) return t.parentElement || null;
        return t;
      }
      function _wwWelcomeBtnFromEvent(ev) {
        var el = _wwWelcomeTargetEl(ev);
        if (el && typeof el.closest === 'function') {
          var b = el.closest('button[data-ww-welcome-act]');
          if (b && pgWelcome.contains(b)) return b;
        }
        var te = ev.changedTouches && ev.changedTouches[0];
        if (te && typeof document.elementFromPoint === 'function') {
          var x = te.clientX;
          var y = te.clientY;
          var under = document.elementFromPoint(x, y);
          if (under && under.nodeType === 3) under = under.parentElement;
          if (under && typeof under.closest === 'function') {
            b = under.closest('button[data-ww-welcome-act]');
            if (b && pgWelcome.contains(b)) return b;
          }
        }
        return null;
      }
      function _wwRunWelcomeAct(btn) {
        if (!btn || !pgWelcome.contains(btn) || !btn.getAttribute('data-ww-welcome-act')) return;
        var act = btn.getAttribute('data-ww-welcome-act');
        if (typeof window.wwWelcomeTapInline === 'function') window.wwWelcomeTapInline(act);
      }
      function _wwForceWelcomeInteractive() {
        try {
          if (typeof window.wwFixWelcomeBootIfGuest === 'function') window.wwFixWelcomeBootIfGuest();
        } catch (_fw) {}
      }
      _wwForceWelcomeInteractive();
      try {
        requestAnimationFrame(_wwForceWelcomeInteractive);
      } catch (_r0) {}
      try {
        setTimeout(_wwForceWelcomeInteractive, 0);
      } catch (_r1) {}
      try {
        setTimeout(_wwForceWelcomeInteractive, 120);
      } catch (_r2) {}
      pgWelcome.addEventListener(
        'touchstart',
        function (ev) {
          if (ev.touches && ev.touches.length === 1) {
            _wwWelTapX = ev.touches[0].clientX;
            _wwWelTapY = ev.touches[0].clientY;
          }
        },
        { passive: true, capture: true }
      );
      pgWelcome.addEventListener(
        'pointerdown',
        function (ev) {
          if (!ev.isPrimary) return;
          _wwWelTapX = ev.clientX;
          _wwWelTapY = ev.clientY;
        },
        { passive: true, capture: true }
      );
      pgWelcome.addEventListener(
        'touchend',
        function (ev) {
          var btn = _wwWelcomeBtnFromEvent(ev);
          if (!btn) return;
          var te = ev.changedTouches && ev.changedTouches[0];
          if (te && (Math.abs(te.clientX - _wwWelTapX) > 20 || Math.abs(te.clientY - _wwWelTapY) > 24)) return;
          /* 仅在已识别按钮后 preventDefault，避免误挡合成 click；有按钮时由本逻辑执行动作 */
          if (ev.cancelable) ev.preventDefault();
          try {
            ev.stopPropagation();
          } catch (_sp) {}
          _wwRunWelcomeAct(btn);
        },
        { capture: true, passive: false }
      );
      pgWelcome.addEventListener(
        'pointerup',
        function (ev) {
          if (!ev.isPrimary) return;
          if (ev.pointerType === 'mouse') return;
          var el = _wwWelcomeTargetEl(ev);
          var btn = el && typeof el.closest === 'function' ? el.closest('button[data-ww-welcome-act]') : null;
          if (!btn || !pgWelcome.contains(btn)) {
            if (typeof document.elementFromPoint === 'function') {
              var up = document.elementFromPoint(ev.clientX, ev.clientY);
              if (up && up.nodeType === 3) up = up.parentElement;
              if (up && typeof up.closest === 'function') btn = up.closest('button[data-ww-welcome-act]');
            }
          }
          if (!btn || !pgWelcome.contains(btn)) return;
          if (Math.abs(ev.clientX - _wwWelTapX) > 20 || Math.abs(ev.clientY - _wwWelTapY) > 24) return;
          if (ev.cancelable) ev.preventDefault();
          try {
            ev.stopPropagation();
          } catch (_sp2) {}
          _wwRunWelcomeAct(btn);
        },
        { capture: true, passive: false }
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
