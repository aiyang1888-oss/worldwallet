# Round 1 修复报告 - 2026-04-08

## STEP 1 扫描摘要

### data-ww-fn（41 个，去重后）
createNewWallet, startVerify, checkVerify, goToPinConfirm, confirmPin, pinVerifyEnterWallet, promptWalletNotifications, copyHomeAddr, goHomeTransfer, loadTxHistory, copyNative, openCustomizeAddr, hideQR, doTransfer, closeTransferConfirm, confirmTransfer, shareSuccess, openPinSettingsDialog, wwOpenBackupFromSettings, deleteWalletRow, wwSwapRecordsToast, setSwapMax, doSwap, doImportWallet, createGift, copyHbCreatedKeyword, shareHbCreatedKeyword, copyKw, shareKw, showHbQR, copyShareText, submitClaim, pinUnlockBackspace, pinUnlockClear, closePinUnlock, submitTotpUnlock, closeTotpUnlock, confirmTotpSetup, closeTotpSetup, closePinSetupOverlay, wwHideHbSuccessOverlay

### id="page-*"（21 个）
page-welcome, page-password-restore, page-create, page-key, page-key-verify, page-pin-setup, page-pin-confirm, page-pin-verify, page-home, page-addr, page-transfer, page-swoosh, page-transfer-success, page-settings, page-swap, page-import, page-hongbao, page-hb-keyword, page-claim, page-claimed, page-hb-records, page-faq

### data-ww-go 目标（12 个）
page-create, page-password-restore, page-import, page-welcome, page-faq, page-key-verify, page-pin-setup, page-settings, page-home, page-claim, page-hb-records, page-hongbao — 均在 HTML 中存在对应 `id="page-…"`。

### wallet.runtime.js / wallet.ui.js
- 大量 `function X()` 与文件末尾 `window.X =` 显式绑定（runtime 内 `wwWireWindowHandlers` 等）。
- **注意**：`goTo` / `goTab` / `_resumeWalletAfterUnlock` 等在两个文件中均有完整实现；因脚本顺序为 `wallet.ui.js` 先于 `wallet.runtime.js`，**运行时的全局 `goTo` 以 runtime 为准**（后者覆盖前者）。属 P3 维护风险，非当前功能错误。

### wallet.css
- 花括号计数：`{` 330、`}` 330，**平衡**。

---

## 发现的问题

- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 存在大段重复的 `goTo` 等逻辑，长期可能造成双份修复遗漏；当前行为由后加载的 runtime 决定，自动化绑定测试未失败。

---

## 修复内容

- 文件：无（本轮无需代码 patch）
- 函数：—
- 修改：经 STEP 1–4 审查与 Node 脚本 TEST-A/B/C，未发现 P0–P2 阻塞项；仅新增本报告。

---

## 修改文件

- `reports/round_1.md`

---

## 剩余问题

- P3：`goTo` 双份实现可考虑未来合并为单文件来源，降低漂移风险。

---

## 测试结果

- TEST-A: PASS — 全部 `data-ww-fn` 在合并后的 `wallet.ui.js`+`wallet.runtime.js` 中可解析为 `window.*` 或 `function` 声明。
- TEST-B: PASS — 全部 `data-ww-go` 目标均存在对应 `id="page-*"`。
- TEST-C: PASS — `goToPinConfirm`, `confirmPin`, `pinVerifyEnterWallet`, `shareSuccess`, `copyKw`, `shareKw`, `showHbQR`, `copyShareText`, `sendTransfer`, `createGift`, `claimGift`, `openSend`, `openReceive` 函数体非空（含别名包装 `sendTransfer`/`claimGift`/`openSend`/`openReceive`）。
