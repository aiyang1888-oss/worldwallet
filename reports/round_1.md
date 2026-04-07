# Round 1 修复报告 - 2026-04-07

## STEP 1 扫描摘要
- **data-ww-fn（41 项，去重）**：createNewWallet, startVerify, checkVerify, goToPinConfirm, confirmPin, pinVerifyEnterWallet, promptWalletNotifications, copyHomeAddr, goHomeTransfer, loadTxHistory, copyNative, openCustomizeAddr, hideQR, doTransfer, closeTransferConfirm, confirmTransfer, shareSuccess, openPinSettingsDialog, wwOpenBackupFromSettings, deleteWalletRow, wwSwapRecordsToast, setSwapMax, doSwap, doImportWallet, createGift, copyHbCreatedKeyword, shareHbCreatedKeyword, copyKw, shareKw, showHbQR, copyShareText, submitClaim, pinUnlockBackspace, pinUnlockClear, closePinUnlock, submitTotpUnlock, closeTotpUnlock, confirmTotpSetup, closeTotpSetup, closePinSetupOverlay, wwHideHbSuccessOverlay
- **id="page-*"**：page-welcome, page-password-restore, page-create, page-key, page-key-verify, page-pin-setup, page-pin-confirm, page-pin-verify, page-home, page-addr, page-transfer, page-swoosh, page-transfer-success, page-settings, page-swap, page-import, page-hongbao, page-hb-keyword, page-claim, page-claimed, page-hb-records, page-faq
- **data-ww-go**：均对应上述 `page-*` 之一
- **wallet.runtime.js / wallet.ui.js**：大量顶层 `function X` 与 `window.X` 暴露（`wwExposeDataWwFnHandlers` 块显式挂载 `data-ww-fn` 所需处理器）
- **wallet.css**：花括号平衡 — 开 329 / 闭 329

## 发现的问题
- **无 P0–P2 阻断项**（本轮 TEST-A/B/C 均通过）。历史问题「PIN 解锁/恢复页输入未规范为 6 位数字」已在提交 `1d98ecb` 中于 `wallet.runtime.js` 的 `submitPageRestorePin`、`submitPinUnlock` 内修复。
- **[P3]** `wallet.ui.js` 与 `wallet.runtime.js` 存在大量同名全局函数，依赖脚本**加载顺序**（后者覆盖前者）；当前顺序正确，但长期维护需注意重复定义。

## 修复内容
- **本轮回合**：无需新增代码修改；工作区与 `origin/main` 一致。
- **既有修复（参考）**：`wallet.runtime.js` — `submitPageRestorePin`、`submitPinUnlock` — 使用 `replace(/\D/g,'').slice(0,6)` 并在不足 6 位时提示。

## 修改文件
- 本轮回合：无

## 剩余问题
- 无（TEST-A/B/C 全部通过）

## 测试结果
- TEST-A: PASS — 每个 `data-ww-fn` 均有对应全局 `function` 且由 `wwExposeDataWwFnHandlers` 挂到 `window`（或等价全局名）
- TEST-B: PASS — 每个 `data-ww-go` 在 `wallet.html` 中均有 `id="page-*"` 页面节点
- TEST-C: PASS — goToPinConfirm、confirmPin、pinVerifyEnterWallet、shareSuccess、copyKw、shareKw、showHbQR、copyShareText、sendTransfer、createGift、claimGift、openSend、openReceive 均有非空实现或为已登记别名
