/*! WorldToken wallet.runtime.js — shell only: navigation + toast/loading (wallet/key logic removed; rebuild from scratch). */

const MAIN_PAGES = [
  'page-home',
  'page-swap',
  'page-addr',
  'page-settings',
  'page-hongbao',
];

const TAB_MAP = {
  'tab-home': 'page-home',
  'tab-swap': 'page-swap',
  'tab-addr': 'page-addr',
  'tab-hongbao': 'page-hongbao',
  'tab-settings': 'page-settings',
};

function showWalletLoading() {
  const el = document.getElementById('walletLoadingOverlay');
  if (el) el.classList.add('show');
}

function hideWalletLoading() {
  const el = document.getElementById('walletLoadingOverlay');
  if (el) el.classList.remove('show');
}

function showToast(msg, type = 'info', duration = 2500) {
  let t = document.getElementById('wt-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'wt-toast';
    t.style.cssText =
      'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);' +
      'background:rgba(20,20,40,0.95);color:#e0e0f0;padding:10px 20px;border-radius:12px;' +
      'font-size:13px;z-index:9999;pointer-events:none;transition:opacity 0.3s;white-space:nowrap;' +
      'max-width:80vw;text-align:center;border:1px solid rgba(200,168,75,0.3);' +
      'box-shadow:0 4px 20px rgba(0,0,0,0.5)';
    document.body.appendChild(t);
  }
  const colors = { info: '#e0e0f0', success: '#4ac84a', error: '#ff6060', warning: '#ffcc44' };
  t.style.color = colors[type] || colors.info;
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._timer);
  t._timer = setTimeout(function () {
    t.style.opacity = '0';
  }, duration);
}

function goTo(pageId, opts) {
  opts = opts || {};
  document.querySelectorAll('.page').forEach(function (p) {
    p.classList.remove('active');
    p.style.display = '';
  });
  const activePage = document.getElementById(pageId);
  if (!activePage) {
    console.warn('[WorldToken] 页面不存在:', pageId);
    return;
  }
  activePage.classList.add('active');
  activePage.style.display = '';
  const tabBar = document.getElementById('tabBar');
  if (tabBar) tabBar.style.display = MAIN_PAGES.includes(pageId) ? 'flex' : 'none';
  try {
    var h = '#' + pageId;
    if (location.hash !== h) {
      if (typeof history !== 'undefined' && history.replaceState) {
        var u = new URL(location.href);
        u.hash = pageId;
        history.replaceState(null, '', u.pathname + u.search + u.hash);
      } else {
        location.hash = h;
      }
    }
  } catch (e) {}
}

function showPage(pageId, opts) {
  goTo(pageId, opts);
}

function goTab(tabId) {
  document.querySelectorAll('.tab-item').forEach(function (t) {
    t.classList.remove('active');
  });
  var tab = document.getElementById(tabId);
  if (tab) tab.classList.add('active');
  goTo(TAB_MAP[tabId] || 'page-home');
}async function changeMnemonicLength(n) {
  const wordCount = parseInt(n, 10) || 12;
  if (![12, 15, 18, 21, 24].includes(wordCount)) return;
  currentMnemonicLength = wordCount;
  const sel = document.getElementById('mnemonicLength');
  if (sel) { sel.value = String(wordCount); sel.selectedIndex = [12,15,18,21,24].indexOf(wordCount); }
  showWalletLoading();
  try {
    // 直接用 ethers 生成对应词数的助记词，不走复杂逻辑
    const entropyBytesMap = {12:16,15:20,18:24,21:28,24:32};
    const mnemonic = ethers.utils.entropyToMnemonic(ethers.utils.randomBytes(entropyBytesMap[wordCount]));
    const wallet = ethers.Wallet.fromMnemonic(mnemonic);
    const trxWallet = ethers.Wallet.fromMnemonic(mnemonic, "m/44'/195'/0'/0/0");
    const btcWallet = ethers.Wallet.fromMnemonic(mnemonic, "m/44'/0'/0'/0/0");
    let trxAddr = 'T' + trxWallet.address.slice(2, 35);
    try {
      if (typeof TronWeb !== 'undefined') trxAddr = TronWeb.address.fromHex('41' + trxWallet.address.slice(2));
    } catch(e) {}
    const w = {
      ethAddress: wallet.address,
      trxAddress: trxAddr,
      btcAddress: btcWallet.address,
      privateKey: wallet.privateKey,
      enMnemonic: mnemonic,
      mnemonic: mnemonic,
      createdAt: Date.now()
    };
    window.REAL_WALLET = w;
    saveWallet(w);
    // 验证词数
    const actualWords = mnemonic.trim().split(/\s+/).length;
    console.log('[changeMnemonicLength] generated', actualWords, 'words for request', wordCount);
    if (typeof renderKeyGrid === 'function') renderKeyGrid();
  } catch(e) {
    if (typeof showToast === 'function') showToast('生成失败: ' + (e&&e.message||e), 'error');
  } finally {
    hideWalletLoading();
  }
};

function showWalletLoading() {
  const el = document.getElementById('walletLoadingOverlay');
  if (el) el.classList.add('show');
}

function hideWalletLoading() {
  const el = document.getElementById('walletLoadingOverlay');
  if (el) el.classList.remove('show');
}

function showToast(msg, type = 'info', duration = 2500) {
  let t = document.getElementById('wt-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'wt-toast';
    t.style.cssText =
      'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);' +
      'background:rgba(20,20,40,0.95);color:#e0e0f0;padding:10px 20px;border-radius:12px;' +
      'font-size:13px;z-index:9999;pointer-events:none;transition:opacity 0.3s;white-space:nowrap;' +
      'max-width:80vw;text-align:center;border:1px solid rgba(200,168,75,0.3);' +
      'box-shadow:0 4px 20px rgba(0,0,0,0.5)';
    document.body.appendChild(t);
  }
  const colors = { info: '#e0e0f0', success: '#4ac84a', error: '#ff6060', warning: '#ffcc44' };
  t.style.color = colors[type] || colors.info;
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._timer);
  t._timer = setTimeout(function () {
    t.style.opacity = '0';
  }, duration);
}

function goTo(pageId, opts) {
  opts = opts || {};
  document.querySelectorAll('.page').forEach(function (p) {
    p.classList.remove('active');
    p.style.display = '';
  });
  const activePage = document.getElementById(pageId);
  if (!activePage) {
    console.warn('[WorldToken] 页面不存在:', pageId);
    return;
  }
  activePage.classList.add('active');
  activePage.style.display = '';
  const tabBar = document.getElementById('tabBar');
  if (tabBar) tabBar.style.display = MAIN_PAGES.includes(pageId) ? 'flex' : 'none';
  try {
    var h = '#' + pageId;
    if (location.hash !== h) {
      if (typeof history !== 'undefined' && history.replaceState) {
        var u = new URL(location.href);
        u.hash = pageId;
        history.replaceState(null, '', u.pathname + u.search + u.hash);
      } else {
        location.hash = h;
      }
    }
  } catch (e) {}
}

function showPage(pageId, opts) {
  goTo(pageId, opts);
}

function goTab(tabId) {
  document.querySelectorAll('.tab-item').forEach(function (t) {
    t.classList.remove('active');
  });
  var tab = document.getElementById(tabId);
  if (tab) tab.classList.add('active');
  goTo(TAB_MAP[tabId] || 'page-home');
}
