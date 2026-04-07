/**
 * CSP：无 inline onclick/on* — 由此外部脚本绑定（需在 wallet.ui.js / runtime 之后加载）。
 */
(function () {
  'use strict';

  function winFn(name) {
    return typeof window[name] === 'function' ? window[name] : null;
  }

  function wireOverlays() {
    function wire(overlayId, closeFnName) {
      var el = document.getElementById(overlayId);
      if (!el) return;
      el.addEventListener('click', function (e) {
        if (e.target !== el) return;
        var fn = winFn(closeFnName);
        if (fn) fn();
      });
    }
    wire('pinUnlockOverlay', 'closePinUnlock');
    wire('totpUnlockOverlay', 'closeTotpUnlock');
    wire('totpSetupOverlay', 'closeTotpSetup');
    wire('pinSetupOverlay', 'closePinSetupOverlay');
    wire('qrOverlay', 'hideQR');
    wire('transferConfirmOverlay', 'closeTransferConfirm');
  }

  function wireForms() {
    var prf = document.getElementById('pageRestorePinForm');
    if (prf) {
      prf.addEventListener('submit', function (e) {
        e.preventDefault();
        var s = winFn('submitPageRestorePin');
        if (s) s();
      });
    }
    var puf = document.getElementById('pinUnlockForm');
    if (puf) {
      puf.addEventListener('submit', function (e) {
        e.preventDefault();
        var s = winFn('submitPinUnlock');
        if (s) s();
      });
    }
  }

  function wireTabBar() {
    var tabBar = document.getElementById('tabBar');
    if (!tabBar) return;
    tabBar.addEventListener('click', function (e) {
      var item = e.target.closest('.tab-item');
      if (!item || !tabBar.contains(item)) return;
      var id = item.id;
      if (id && id.indexOf('tab-') === 0) {
        var gt = winFn('goTab');
        if (gt) gt(id);
      }
    });
  }

  function wireFieldsById() {
    var kl = document.getElementById('keyPageLang');
    if (kl) {
      kl.addEventListener('change', function () {
        var fn = winFn('switchLang');
        if (fn) fn(this.value);
      });
    }
    var ml = document.getElementById('mnemonicLength');
    if (ml) {
      ml.addEventListener('change', function () {
        var fn = winFn('changeMnemonicLength');
        if (fn) fn(this.value);
      });
    }
    var hzt = document.getElementById('hideZeroTokens');
    if (hzt) {
      hzt.addEventListener('change', function () {
        var fn = winFn('onHideZeroTokensChange');
        if (fn) fn();
      });
    }
    var qcs = document.getElementById('qrChainSelect');
    if (qcs) {
      qcs.addEventListener('change', function () {
        var fn = winFn('updateQRCode');
        if (fn) fn();
      });
    }
    var qra = document.getElementById('qrReceiveAmount');
    if (qra) {
      qra.addEventListener('input', function () {
        var fn = winFn('updateQRCode');
        if (fn) fn();
      });
    }
    var ta = document.getElementById('transferAddr');
    if (ta) {
      ta.addEventListener('input', function () {
        var fn = winFn('detectAddrType');
        if (fn) fn();
      });
    }
    var tam = document.getElementById('transferAmount');
    if (tam) {
      tam.addEventListener('input', function () {
        var fn = winFn('calcTransferFee');
        if (fn) fn();
      });
    }
    var txf = document.getElementById('txHistoryFilter');
    if (txf) {
      txf.addEventListener('input', function () {
        var fn = winFn('applyTxHistoryFilter');
        if (fn) fn();
      });
    }
    var sai = document.getElementById('swapAmountIn');
    if (sai) {
      sai.addEventListener('input', function () {
        var fn = winFn('calcSwap');
        if (fn) fn();
      });
    }
    var ip = document.getElementById('importPaste');
    if (ip) {
      ip.addEventListener('input', function () {
        var fn = winFn('syncImportGrid');
        if (fn) fn(this.value);
      });
    }
  }

  function wireEnterKey() {
    function wire(id, fnName) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter') return;
        var fn = winFn(fnName);
        if (fn) fn();
      });
    }
    wire('claimInput', 'submitClaim');
    wire('totpUnlockInput', 'submitTotpUnlock');
    wire('totpSetupVerifyInput', 'confirmTotpSetup');
  }

  function wireWelcomeActions() {
    document.addEventListener(
      'click',
      function (e) {
        var b = e.target.closest('#page-welcome [data-action]');
        if (!b) return;
        var g = winFn('goTo');
        if (!g) return;
        var a = b.getAttribute('data-action');
        if (a === 'create') g('page-create');
        else if (a === 'unlock') g('page-password-restore');
        else if (a === 'import') g('page-import');
      },
      false
    );

    document.addEventListener(
      'click',
      function (e) {
        var nb = e.target.closest('.nav-back[data-action="back"]');
        if (!nb) return;
        var g = winFn('goTo');
        if (g) g('page-welcome');
      },
      false
    );
  }

  function wireDelegatedClicks() {
    document.addEventListener(
      'click',
      function (e) {
        var el = e.target.closest(
          '[data-ww-call],[data-ww-go],[data-ww-goback],[data-ww-importback],[data-ww-gotab],[data-ww-copyfrom],[data-ww-act]'
        );
        if (!el) return;

        var g = winFn('goTo');
        if (el.hasAttribute('data-ww-call')) {
          var cname = el.getAttribute('data-ww-call');
          var fn = winFn(cname);
          if (fn) fn();
          return;
        }
        if (el.hasAttribute('data-ww-go')) {
          if (!g) return;
          var page = el.getAttribute('data-ww-go');
          var optS = el.getAttribute('data-ww-goopt');
          if (optS) {
            try {
              g(page, JSON.parse(optS));
            } catch (err) {
              g(page);
            }
          } else {
            g(page);
          }
          return;
        }
        if (el.hasAttribute('data-ww-goback')) {
          if (!g) return;
          var fb = el.getAttribute('data-ww-goback') || 'page-create';
          g(window._keyBackPage || fb);
          return;
        }
        if (el.hasAttribute('data-ww-importback')) {
          if (!g) return;
          g(window._importBackTarget || 'page-welcome');
          return;
        }
        if (el.hasAttribute('data-ww-gotab')) {
          var gt = winFn('goTab');
          if (gt) gt(el.getAttribute('data-ww-gotab'));
          return;
        }
        if (el.hasAttribute('data-ww-copyfrom')) {
          var cid = el.getAttribute('data-ww-copyfrom');
          var node = cid ? document.getElementById(cid) : null;
          var txt = node ? String(node.textContent || '') : '';
          var cs = winFn('copySingle');
          if (cs) cs(txt, el);
          return;
        }

        var act = el.getAttribute('data-ww-act');
        if (act === 'deleteWallet') {
          if (!g) return;
          if (confirm('确定删除本机钱包？此操作会清空本地数据。')) {
            localStorage.removeItem('ww_wallet');
            localStorage.removeItem('ww_pin');
            localStorage.removeItem('ww_hongbaos');
            window.REAL_WALLET = null;
            g('page-welcome');
            var st = winFn('showToast');
            if (st) st('钱包已删除', 'success');
          }
          return;
        }
        if (act === 'swapInfoToast') {
          var st2 = winFn('showToast');
          if (st2) st2('兑换在 SunSwap 完成，本页不保存历史记录', 'info');
          return;
        }
        if (act === 'hideHbSuccess') {
          var ho = document.getElementById('hbSuccessOverlay');
          if (ho) ho.style.display = 'none';
          return;
        }
        if (act === 'keyFromSettings') {
          if (!g) return;
          window._keyBackPage = 'page-settings';
          g('page-key');
        }
      },
      false
    );
  }

  function init() {
    wireWelcomeActions();
    wireDelegatedClicks();
    wireForms();
    wireOverlays();
    wireTabBar();
    wireFieldsById();
    wireEnterKey();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
