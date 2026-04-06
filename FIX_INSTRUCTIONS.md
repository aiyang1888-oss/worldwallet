# BUG-003 修复指令

## 问题确认

✅ 已通过浏览器测试确认：页面加载时以下 overlay 全部可见
- walletLoadingOverlay
- qrOverlay
- transferConfirmOverlay
- pinUnlockOverlay
- totpUnlockOverlay
- totpSetupOverlay
- pinSetupOverlay

## 根因

CSS 文件 `wallet-shell/wallet.css` 中所有 overlay 基础样式**已经是 `display: none`**（正确的）

但浏览器调试显示所有 overlay 的 computed style 是 `display: flex`，说明：
1. CSS 规则正确
2. **问题出在 HTML 文件**：`dist/wallet.html` 中可能有内联样式或 JS 代码在页面加载时设置了这些元素为可见

## 修复步骤

### 1. 检查 HTML 文件

**文件：** `dist/wallet.html`

查找：
- 所有 overlay 元素是否有内联 `style="display: flex"` 或 `class="show"`
- 是否有 `<script>` 标签在页面加载时立即显示这些元素

**关键元素 ID：**
```
#walletLoadingOverlay
#qrOverlay
#transferConfirmOverlay
#pinUnlockOverlay
#totpUnlockOverlay
#totpSetupOverlay
#pinSetupOverlay
```

### 2. 可能的问题位置

A. **HTML 元素本身带有 `style="display: flex"`：**
```html
<!-- 错误 -->
<div id="walletLoadingOverlay" class="wallet-loading-overlay" style="display: flex">

<!-- 正确 -->
<div id="walletLoadingOverlay" class="wallet-loading-overlay">
```

B. **HTML 元素带有 `.show` class：**
```html
<!-- 错误 -->
<div id="walletLoadingOverlay" class="wallet-loading-overlay show">

<!-- 正确 -->
<div id="walletLoadingOverlay" class="wallet-loading-overlay">
```

C. **嵌入的 `<script>` 标签在页面加载时显示弹窗：**
```javascript
// 错误：立即显示
document.getElementById('walletLoadingOverlay').style.display = 'flex';
// 或
document.getElementById('walletLoadingOverlay').classList.add('show');

// 正确：只在用户操作时显示
```

### 3. 修复方案

1. 移除所有 overlay 元素上的：
   - 内联 `style="display: flex"`
   - `.show` class

2. 确保 overlay 只在以下情况显示：
   - 用户点击"创建新钱包"按钮 → 显示 `walletLoadingOverlay`
   - 用户点击"PIN 解锁钱包"按钮 → 显示 `pinUnlockOverlay`
   - 用户点击地址查看按钮 → 显示 `qrOverlay`

### 4. 测试验证

修复后：
1. 清空 localStorage
2. 刷新页面
3. 预期：只看到欢迎页（WorldToken logo + 三个按钮），无任何弹窗
4. 点击"创建新钱包"，应正常显示加载动画和设置 PIN 流程

## 重要提示

**wallet-shell/wallet.css 已经是正确的**（`display: none`），不需要修改。

**问题在于 dist/wallet.html**，需要：
- 检查 HTML 元素是否有错误的内联样式或 class
- 检查嵌入的 JS 代码是否在页面加载时自动显示了这些元素

## Git 提交

修复完成后提交：
```bash
git add dist/wallet.html
git commit -m "fix: 修复页面加载时所有弹窗同时显示的问题 (BUG-003)"
git push origin main
```
