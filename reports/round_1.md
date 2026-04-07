# Round 1 修复报告 - 2026-04-08 12:00

## 发现的问题
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 存在大量同名全局函数声明，最终以 `wallet.runtime.js` 为准；`data-ww-fn` 依赖文件末尾 `wwExposeDataWwFnHandlers` 显式挂到 `window`，后续维护需注意加载顺序与重复定义。
- [P3] `wallet.tx.js` 中 `confirmTransfer` 与 `wallet.runtime.js` 中同名函数并存，运行时以后者为准，前者为事实上的死代码，易造成阅读混淆（非功能阻断）。

## 修复内容
- 无需代码修改：本轮静态测试（TEST-A/B/C）与 `wallet.css` 花括号检查均已通过，未发现 P0/P1/P2 阻断项。

## 修改文件
- 无（仅更新本报告）

## 剩余问题
- [P3] 长期可将转账确认等逻辑单点化，避免 `wallet.tx.js` 与 `wallet.runtime.js` 重复定义。
- [P3] 部分路径仍存在 `JSON.parse` 依赖调用方 try-catch 的惯例；与本轮自动化清单无冲突。

## 测试结果
- TEST-A: PASS — `wallet.html` 中全部 `data-ww-fn` 均在已加载脚本中存在对应全局 `function` / `async function` / `window.*`（含 `wallet.runtime.js` 末尾显式导出）。
- TEST-B: PASS — 全部 `data-ww-go` 目标（如 `page-welcome`、`page-password-restore`、`page-home`、`page-hongbao`、`page-claim` 等）均在 `wallet.html` 中存在 `id="page-*"`。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`sendTransfer`、`createGift`、`claimGift`、`openSend`、`openReceive` 函数体均含可执行逻辑（非仅注释/空行）。

## STEP 1 扫描摘要（归档）
- **data-ww-fn（去重）**：createNewWallet, startVerify, checkVerify, goToPinConfirm, confirmPin, pinVerifyEnterWallet, promptWalletNotifications, copyHomeAddr, goHomeTransfer, loadTxHistory, copyNative, openCustomizeAddr, hideQR, doTransfer, closeTransferConfirm, confirmTransfer, shareSuccess, openPinSettingsDialog, wwOpenBackupFromSettings, deleteWalletRow, wwSwapRecordsToast, setSwapMax, doSwap, doImportWallet, createGift, copyHbCreatedKeyword, shareHbCreatedKeyword, copyKw, shareKw, showHbQR, copyShareText, submitClaim, pinUnlockBackspace, pinUnlockClear, closePinUnlock, submitTotpUnlock, closeTotpUnlock, confirmTotpSetup, closeTotpSetup, closePinSetupOverlay, wwHideHbSuccessOverlay。
- **id="page-*"**：page-welcome, page-password-restore, page-create, page-key, page-key-verify, page-pin-setup, page-pin-confirm, page-pin-verify, page-home, page-addr, page-transfer, page-swoosh, page-transfer-success, page-settings, page-swap, page-import, page-hongbao, page-hb-keyword, page-claim, page-claimed, page-hb-records, page-faq。
- **data-ww-go**：page-create, page-password-restore, page-import, page-welcome, page-faq, page-key-verify, page-pin-setup, page-settings, page-home, page-claim, page-hb-records, page-hongbao。
- **wallet.css**：`{` 与 `}` 各 330，平衡。
