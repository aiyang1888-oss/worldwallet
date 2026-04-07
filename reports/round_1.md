# Round 1 修复报告 - 2026-04-07

## 发现的问题
- [P1] `wallet.ui.js` 中 `_safeEl` 在元素不存在时返回的占位对象缺少 `appendChild`；`wallet.runtime.js` 的 `startVerify` 对 `#verifyQuestions` 调用 `appendChild` 时可能抛出，导致助记词验证页初始化崩溃。
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 存在大量同名全局函数，以后加载文件为准（属已知架构，本轮未改加载顺序）。

## 修复内容
- 文件：wallet.ui.js
- 函数：`_safeEl` 占位对象
- 修改：为占位 DOM 增加无操作的 `appendChild` / `removeChild`，与已有 `innerHTML` 等字段一致，避免缺节点时的运行时异常。

## 修改文件
- wallet.ui.js

## 剩余问题
- 无（本轮自动化检查范围内；未做浏览器端到端手测）

## 测试结果
- TEST-A: PASS — `data-ww-fn` 共 41 项均在 `*.js` 中有 `function X` 或 `window.X` 定义路径。
- TEST-B: PASS — `data-ww-go` 共 12 项目标均存在对应 `id="page-*"`。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`sendTransfer`（映射 `confirmTransfer`）、`createGift`、`claimGift`（映射 `submitClaim`）、`openSend`（映射 `goHomeTransfer`）、`openReceive`（`goTab` 包装）均有非空实现。
