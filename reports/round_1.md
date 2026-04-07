# Round 1 修复报告 - 2026-04-08

## 发现的问题
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 中存在重复的 `goTo` 等全局函数定义；脚本加载顺序以后者为准，存在长期维护时行为不一致风险（当前自动化绑定测试通过，非阻塞）。

## 修复内容
- 文件：无（本轮静态与自动化测试未暴露 P0–P2 级缺陷）
- 函数：—
- 修改：仅新增本报告；代码库无需变更即可通过 TEST-A/B/C

## 修改文件
- reports/round_1.md

## 剩余问题
- [P3] 同上：可考虑后续统一 `goTo` 单一来源或文档化「以 `wallet.runtime.js` 为准」的约定。

## 测试结果
- TEST-A: PASS — 41 个 `data-ww-fn` 均在项目 JS 中有对应顶层 `function` / `async function` 定义，且 `wallet.runtime.js` 末尾 `wwExposeDataWwFnHandlers` 将处理器挂到 `window`。
- TEST-B: PASS — 12 个 `data-ww-go` 目标均在 `wallet.html` 中存在同名 `id="page-*"`。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`sendTransfer`、`createGift`、`claimGift`、`openSend`、`openReceive` 函数体均非空（含有效逻辑）。

## STEP 1 摘要
- **data-ww-fn（41）**：createNewWallet, startVerify, checkVerify, goToPinConfirm, confirmPin, pinVerifyEnterWallet, promptWalletNotifications, copyHomeAddr, goHomeTransfer, loadTxHistory, copyNative, openCustomizeAddr, hideQR, doTransfer, closeTransferConfirm, confirmTransfer, shareSuccess, openPinSettingsDialog, wwOpenBackupFromSettings, deleteWalletRow, wwSwapRecordsToast, setSwapMax, doSwap, doImportWallet, createGift, copyHbCreatedKeyword, shareHbCreatedKeyword, copyKw, shareKw, showHbQR, copyShareText, submitClaim, pinUnlockBackspace, pinUnlockClear, closePinUnlock, submitTotpUnlock, closeTotpUnlock, confirmTotpSetup, closeTotpSetup, closePinSetupOverlay, wwHideHbSuccessOverlay
- **id="page-*"（22）**：page-welcome, page-password-restore, page-create, page-key, page-key-verify, page-pin-setup, page-pin-confirm, page-pin-verify, page-home, page-addr, page-transfer, page-swoosh, page-transfer-success, page-settings, page-swap, page-import, page-hongbao, page-hb-keyword, page-claim, page-claimed, page-hb-records, page-faq
- **data-ww-go（12）**：page-create, page-password-restore, page-import, page-welcome, page-faq, page-key-verify, page-pin-setup, page-settings, page-home, page-claim, page-hb-records, page-hongbao
- **wallet.css**：花括号开/闭各 330，平衡。
- **脚本顺序**：storage → derive → security → wallet → wordlists → wallet.core → wallet.ui → wallet.addr → wallet.tx → wallet.runtime → wallet.dom-bind（依赖关系合理）。
