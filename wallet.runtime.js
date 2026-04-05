/**
 * WorldToken - UI Runtime (Skeleton)
 * 只保留 UI 导航和基础交互，业务逻辑待重建
 */

'use strict';

// ── 页面导航 ─────────────────────────────────────────────────────
function goTo(pageId) {
  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active');
    p.style.display = 'none';
  });
  const page = document.getElementById(pageId);
  if (page) {
    page.classList.add('active');
    page.style.display = 'flex';
  }
  const mainPages = ['page-home', 'page-addr', 'page-swap', 'page-settings'];
  const tabBar = document.getElementById('tabBar');
  if (tabBar) {
    tabBar.style.display = mainPages.includes(pageId) ? 'flex' : 'none';
  }
}

// ── 提示 Toast ────────────────────────────────────────────────────
function showToast(msg, type) {
  const el = document.getElementById('toastMsg');
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast-msg show' + (type ? ' ' + type : '');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 3000);
}

// ── 加载动画 ──────────────────────────────────────────────────────
function showWalletLoading() {
  const el = document.getElementById('walletLoadingOverlay');
  if (el) el.classList.add('show');
}

function hideWalletLoading() {
  const el = document.getElementById('walletLoadingOverlay');
  if (el) el.classList.remove('show');
}

// ── Tab 导航 ──────────────────────────────────────────────────────
function goTab(tabId) {
  const tabMap = {
    'tab-home': 'page-home',
    'tab-addr': 'page-addr',
    'tab-swap': 'page-swap',
    'tab-settings': 'page-settings'
  };
  document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
  const tab = document.getElementById(tabId);
  if (tab) tab.classList.add('active');
  if (tabMap[tabId]) goTo(tabMap[tabId]);
}

// ── 初始化 ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
  goTo('page-welcome');
});
