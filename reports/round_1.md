# Round 1 修复报告 - 2026-04-08 12:00

## 发现的问题
- [P1] `wallet.html` 内联捕获阶段 `data-ww-fn` 委托：对返回 Promise 的处理器（如 `confirmPin`）仅用 `try/catch`，无法捕获异步 rejection，与 `wallet.dom-bind.js` 中 `wwCall` 行为不一致。

## 修复内容
- 文件：`wallet.html`
- 函数：内联 `document.addEventListener('click', …)` 回调内对 `window[fnName]` 的调用
- 修改：若返回值为 Thenable，则附加 `.catch` 并用 `safeLog` 记录，避免未处理的 Promise rejection。

## 修改文件
- `wallet.html`

## 剩余问题
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 存在大量同名全局函数，以后加载的 `wallet.runtime.js` 为准；属长期维护约定，本轮不改结构。

## 测试结果
- TEST-A: PASS — `data-ww-fn` 共 41 个，均在 JS 中有 `function`/全局定义；`wallet.runtime.js` 末尾 `wwExposeDataWwFnHandlers` 将核心处理器挂到 `window`。
- TEST-B: PASS — 全部 `data-ww-go` 目标在 `wallet.html` 中存在对应 `id="page-*"`。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`sendTransfer`、`createGift`、`claimGift`、`openSend`、`openReceive` 均有非空实现（含指向 `confirmTransfer`/`submitClaim`/`goHomeTransfer` 的别名）。
