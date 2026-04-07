# Round 1 修复报告 - 2026-04-07 23:11

## STEP 1 扫描摘要

### wallet.html — `data-ww-fn`（41 个，去重）
checkVerify, closePinSetupOverlay, closePinUnlock, closeTotpSetup, closeTotpUnlock, closeTransferConfirm, confirmPin, confirmTotpSetup, confirmTransfer, copyHbCreatedKeyword, copyHomeAddr, copyKw, copyNative, copyShareText, createGift, createNewWallet, deleteWalletRow, doImportWallet, doSwap, doTransfer, goHomeTransfer, goToPinConfirm, hideQR, loadTxHistory, openCustomizeAddr, openPinSettingsDialog, pinUnlockBackspace, pinUnlockClear, pinVerifyEnterWallet, promptWalletNotifications, setSwapMax, shareHbCreatedKeyword, shareKw, shareSuccess, showHbQR, startVerify, submitClaim, submitTotpUnlock, wwHideHbSuccessOverlay, wwOpenBackupFromSettings, wwSwapRecordsToast

### wallet.html — `id="page-*"`（页面）
page-welcome, page-password-restore, page-create, page-key, page-key-verify, page-pin-setup, page-pin-confirm, page-pin-verify, page-home, page-addr, page-transfer, page-swoosh, page-transfer-success, page-settings, page-swap, page-import, page-hongbao, page-hb-keyword, page-claim, page-claimed, page-hb-records, page-faq

### wallet.html — `data-ww-go`（12 个唯一目标，均存在对应 `id="page-*"`）
page-claim, page-create, page-faq, page-hb-records, page-home, page-hongbao, page-import, page-key-verify, page-password-restore, page-pin-setup, page-settings, page-welcome

### wallet.css
花括号计数：`{` 330 个、`}` 330 个，**平衡**。

### wallet.runtime.js / wallet.ui.js
存在大量顶层 `function name()` / `async function name()` 及文件末尾 `wwExposeDataWwFnHandlers` 中对 `window.*` 的显式挂载；`data-ww-fn` 依赖的全局可调用名在加载顺序下可用（见 STEP 4）。

---

## 发现的问题

- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 存在大量同名全局函数（如 `goTo`、`doTransfer`、`copyKw` 等），**后加载的 `wallet.runtime.js` 会覆盖前者**。当前行为与 TEST-A 一致，但长期维护易产生「改了 ui 却不生效」的错觉；建议后续拆分职责或合并单源实现。
- [P3] 脚本依赖链：`ethers` → `scrypt-js` → `api-config` → `storage` → … → `wallet.runtime.js` → `wallet.dom-bind.js`；顺序合理，未发现明显缺失依赖。

---

## 修复内容

- 文件：无（本轮自动化测试全部通过，未引入功能性代码变更）
- 函数：—
- 修改：仅新增本报告；代码库行为与扫描前一致

---

## 修改文件

- `reports/round_1.md`

---

## 剩余问题

- P3：`ui`/`runtime` 双份实现的技术债（非阻断，可后续重构）

---

## 测试结果

- TEST-A: PASS — 每个 `data-ww-fn` 均在工程内以顶层 `function` 声明或 `window.*` 暴露形式存在，可被 `wallet.dom-bind.js` / `window[fn]` 解析
- TEST-B: PASS — 每个 `data-ww-go` 目标在 `wallet.html` 中均有对应 `id="page-*"` 的容器
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`createGift` 均具非空实现；`sendTransfer`→`confirmTransfer`、`claimGift`→`submitClaim`、`openSend`→`goHomeTransfer`、`openReceive`→`goTab('tab-addr')` 由 `wallet.runtime.js` 中 `wwExposeCoreAliases` 提供别名，语义满足约定
