# BUG-001 修复方案

## 问题根因

页面加载时所有弹窗元素（`#walletLoadingOverlay`, `#pinModal`, `#pinSetModal`, `#totpModal`, `#totpSetModal`, `#worldAddressModal` 等）的 CSS class `.show` 被自动添加，导致所有弹窗同时可见。

## 修复方案

在 `wallet-shell/wallet.ui.js` 文件末尾的页面初始化代码后，添加强制隐藏所有弹窗的逻辑：

### 位置

`wallet-shell/wallet.ui.js` 第 ~308 行，在这段代码之后：

```javascript
// 页面加载时恢复钱包（只恢复数据，不跳转）
captureReferralFromUrl();
loadWallet();
try { initMnemonicLengthSelectors(); } catch (_iml) {}
try {
  const _txList = document.getElementById('txHistoryList');
  if (_txList && typeof txHistoryEmptyHtml === 'function') _txList.innerHTML = txHistoryEmptyHtml();
} catch (_e) {}
// 钱包昵称 localStorage（仅本机）
try { if (localStorage.getItem('ww_wallet_nickname') == null) localStorage.setItem('ww_wallet_nickname', ''); } catch (_wn) {}
```

### 添加修复代码

在上述代码块之后立即添加：

```javascript
// ─── BUG-001 修复：强制隐藏所有弹窗（防止页面加载时自动显示） ────
try {
  const modalIds = [
    'walletLoadingOverlay',
    'pinModal',
    'pinSetModal',
    'totpModal',
    'totpSetModal',
    'worldAddressModal'
  ];
  
  modalIds.forEach(function(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove('show');
      el.style.display = 'none';
    }
  });
} catch (_modalFix) {
  console.error('[BUG-001] 弹窗隐藏失败:', _modalFix);
}
// ────────────────────────────────────────────────────────────────
```

## 完整修改后的代码段

```javascript
// 页面加载时恢复钱包（只恢复数据，不跳转）
captureReferralFromUrl();
loadWallet();
try { initMnemonicLengthSelectors(); } catch (_iml) {}
try {
  const _txList = document.getElementById('txHistoryList');
  if (_txList && typeof txHistoryEmptyHtml === 'function') _txList.innerHTML = txHistoryEmptyHtml();
} catch (_e) {}
// 钱包昵称 localStorage（仅本机）
try { if (localStorage.getItem('ww_wallet_nickname') == null) localStorage.setItem('ww_wallet_nickname', ''); } catch (_wn) {}

// ─── BUG-001 修复：强制隐藏所有弹窗（防止页面加载时自动显示） ────
try {
  const modalIds = [
    'walletLoadingOverlay',
    'pinModal',
    'pinSetModal',
    'totpModal',
    'totpSetModal',
    'worldAddressModal'
  ];
  
  modalIds.forEach(function(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove('show');
      el.style.display = 'none';
    }
  });
} catch (_modalFix) {
  console.error('[BUG-001] 弹窗隐藏失败:', _modalFix);
}
// ────────────────────────────────────────────────────────────────
```

## 为什么这样修复

1. **安全第一**：不删除原有初始化逻辑（`loadWallet()` 等），避免破坏现有功能
2. **精准修复**：只移除 `.show` class 和设置 `display: none`，不影响其他状态
3. **防御性编程**：用 try-catch 包裹，即使某个元素不存在也不会报错
4. **易于测试**：清空 localStorage 后刷新，应只看到欢迎页，无任何弹窗

## 测试步骤

1. 应用上述修复
2. 重新构建：`npm run build`（在 `WorldWallet/` 目录下）
3. 清空 localStorage：浏览器开发者工具 → Application → Local Storage → 清空
4. 访问 `dist/wallet.html` 或线上 URL
5. **预期结果**：只看到欢迎页（WorldToken logo + 三个按钮），无任何弹窗
6. 点击"创建新钱包"，应正常显示加载动画和设置 PIN 流程

## 部署后验证

- [ ] 本地测试通过（`file:///` 或本地 HTTP 服务器）
- [ ] 线上测试通过（https://www.worldtoken.cc/wallet.html）
- [ ] 新用户首次访问无弹窗遮挡
- [ ] 创建/导入钱包流程正常工作
