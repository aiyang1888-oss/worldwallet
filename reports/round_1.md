# Round 1 修复报告 - 2026-04-07

## 发现的问题
- [P3] `wallet.html` 使用 `home-addr-actions` 类名，但 `wallet.css` 中未定义对应规则（STEP 2 架构/CSS 一致性）；内联样式与类名重复。

## 修复内容
- 文件：`wallet.css`、`wallet.html`
- 函数：无（样式与标记）
- 修改：在 `wallet.css` 增加 `.home-addr-actions` 布局规则；首页对应节点改为仅使用该类，去掉重复内联样式。

## 修改文件
- `wallet.css`
- `wallet.html`

## 剩余问题
- 无（本轮自动化绑定/导航/核心函数检查均通过；可选：长期减少 `wallet.ui.js` 与 `wallet.runtime.js` 中大段重复逻辑，属维护性优化，非本轮范围）

## 测试结果
- TEST-A: PASS — 41 个 `data-ww-fn` 均在加载链 JS 中有全局 `function`/别名实现，且 `wallet.runtime.js` 末尾 `wwExposeDataWwFnHandlers` 对关键处理器显式挂到 `window`。
- TEST-B: PASS — 12 个 `data-ww-go` 目标均存在对应 `id="page-*"`。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`createGift` 在 `wallet.runtime.js` / `wallet.ui.js` 中均有非空实现；`sendTransfer`/`claimGift`/`openSend` 为 `wallet.runtime.js` 中 `wwExposeCoreAliases` 映射到 `confirmTransfer`/`submitClaim`/`goHomeTransfer`；`openReceive` 为调用 `goTab('tab-addr')` 的短函数体，有效。
