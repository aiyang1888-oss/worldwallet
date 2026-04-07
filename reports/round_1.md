# Round 1 修复报告 - 2026-04-07

## 发现的问题
- [P3] `wallet.dom-bind.js` 中 `data-ww-fn` 冒泡路径调用 `window[fn]()` 未传入触发元素，与 `wallet.html` 内联捕获阶段委托（`window[fn](fnEl)`）不一致；部分依赖 DOM 上下文的处理（如 `shareSuccess` 的按钮反馈）在仅走 dom-bind 时行为不完整。
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 存在大量同名全局函数，以后加载的脚本覆盖前者；当前运行时尚可工作，但增加维护与排查成本（未在本次修改中重构）。

## 修复内容
- 文件：`wallet.dom-bind.js`
- 函数：`handleWwClick` 内通用 `data-ww-fn` 分支
- 修改：将 `window[fn]()` 改为 `window[fn](el)`，与内联委托一致传入被点击的带 `data-ww-fn` 的元素。

## 修改文件
- `wallet.dom-bind.js`

## 剩余问题
- 无阻塞性剩余项；可考虑后续统一减少 ui/runtime 重复全局函数（非本次范围）。

## 测试结果
- TEST-A: PASS — `data-ww-fn` 所列函数均在 `wallet.ui.js` / `wallet.runtime.js` 中定义为全局函数或由 `wwExposeDataWwFnHandlers` 挂到 `window`。
- TEST-B: PASS — 所有 `data-ww-go` 目标在 `wallet.html` 中存在对应 `id="page-…"`。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`createGift`、`claimGift`（映射 `submitClaim`）、`sendTransfer`（映射 `confirmTransfer`）、`openSend`（映射 `goHomeTransfer`）、`openReceive`（`goTab('tab-addr')`）均非空实现。
