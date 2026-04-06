# BUG-003 - 页面加载时所有弹窗同时显示

**发现时间：** 2026-04-07 00:15
**测试环境：** https://www.worldtoken.cc/wallet.html
**严重级别：** P0（严重 UX 问题）

## 现象

1. 页面加载后，以下所有弹窗同时可见（叠加在欢迎页上）：
   - walletLoadingOverlay - "正在生成钱包..."加载动画
   - qrOverlay - 万语地址弹窗
   - pinUnlockOverlay - PIN 解锁弹窗
   - totpUnlockOverlay - Authenticator 弹窗
   - totpSetupOverlay - 绑定 Authenticator 弹窗
   - pinSetupOverlay - 设置 PIN 弹窗

2. 用户无法正常使用钱包

## 调试数据

浏览器 computed style 检测结果：

```json
[
  { "id": "walletLoadingOverlay", "display": "flex", "visibility": "visible" },
  { "id": "qrOverlay", "display": "flex", "visibility": "visible" },
  { "id": "transferConfirmOverlay", "display": "flex", "visibility": "hidden" },
  { "id": "pinUnlockOverlay", "display": "flex", "visibility": "visible" },
  { "id": "totpUnlockOverlay", "display": "flex", "visibility": "visible" },
  { "id": "totpSetupOverlay", "display": "flex", "visibility": "visible" },
  { "id": "pinSetupOverlay", "display": "flex", "visibility": "visible" }
]
```

所有弹窗元素 `display: flex` 已生效，说明：
- CSS 规则生效（不是 CSS 文件未加载）
- 没有通过 JS 添加 `.show` class
- 没有通过内联 `style.display` 设置

## 根因分析

之前 TASK.md 中的 BUG-002 诊断**错误**。

新发现：
- CSS 基础样式中，`.overlay` / `.qr-overlay` / `.wallet-loading-overlay` / `.pin-setup-overlay` 的 **默认值确实是 `display: flex`**
- 但这是**设计正确的**（见 wallet.css line ~1012 的 `.show` 规则）
- 真正的问题：**页面加载时 JS 代码主动设置了这些元素为可见状态**

证据：
1. 浏览器检测显示 `display: flex` 已生效
2. CSS 规则正确（`.show` 用于显示，基础样式应为 `display: none`）
3. **但 wallet.css 第 ~865 行的基础样式确实是 `display: flex`，不是 `display: none`**

## 修复方案

需要同时检查两个层面：

### 1. CSS 层面（确认基础样式）

**文件：** `wallet-shell/wallet.css`

确保以下元素的基础样式为 `display: none`：
- `.overlay`
- `.qr-overlay`
- `.wallet-loading-overlay`
- `.pin-setup-overlay`

### 2. JS 层面（找到并移除自动显示逻辑）

**可能位置：**
- `wallet-shell/wallet.js` 的初始化函数
- DOMContentLoaded 事件监听器
- 页面加载时自动调用的函数

**查找关键字：**
- `showWalletLoading()`
- `showPinSetup()`
- `showQrOverlay()`
- `.classList.add('show')`
- `.style.display = 'flex'`

## 执行计划

1. 检查 CSS 基础样式（是否默认 `display: none`）
2. 搜索 JS 代码中页面加载时的显示逻辑
3. 移除或注释掉自动显示代码
4. 测试验证

## 预期结果

- 刷新页面后，只看到欢迎页（WorldToken logo + 三个按钮）
- 无任何弹窗可见
- 点击"创建新钱包"等按钮时，才显示对应弹窗
