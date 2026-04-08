# Round 9 修复报告 - 2026-04-08 09:57

## 发现的问题
- [P3] `wallet.runtime.js` 在 `wallet.ui.js` 之后加载，重复定义并覆盖全局 `goTo`、`deleteWallet`、`getTransferContacts`，导致运行时实际执行的是 runtime 版本（与 UI 在页面显隐、导入页 `_wwInFirstRun`、删除钱包后状态等细节上不一致），与 round_8「单一来源」目标冲突。

## 修复内容
- 文件：wallet.ui.js
- 函数：`wwDeferRestoreNavAfterRuntime`（IIFE）
- 修改：在脚本末尾用 `setTimeout(0)` 于 runtime 执行完毕后，将 UI 中的 `goTo`、`deleteWallet`、`getTransferContacts` 重新赋回 `window`，保证全局调用与产品设计一致。

## 修改文件
- wallet.ui.js

## 剩余问题
- [P3] `goTab` 等其它函数仍可能在 runtime 与 UI 间重复定义；若需完全收敛可继续按同样模式或删除 runtime 侧副本。
- [P3] HTML 仍无独立节点：`page-transfer-success`、`page-swoosh`、`page-hb-keyword` 等；`goTo` 已对缺失页做降级。

## 测试结果
- TEST-A: PASS — `data-ww-fn` 仅 `selectTransferCoin`；`wallet.runtime.js` 末尾 `wwExposeDataWwFnHandlers` 将 `window.selectTransferCoin` 指向实现。
- TEST-B: PASS — `wallet.html` 中无 `data-ww-go`。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`sendTransfer`、`createGift`、`claimGift`、`openSend`、`openReceive` 在 `wallet.ui.js` / `wallet.runtime.js` 中均有非空实现；导航类函数经延迟恢复后以 UI 为单一来源。
