# Round 1 修复报告 - 2026-04-08

## STEP 1 扫描摘要

### `data-ww-fn`（41 个，唯一）
createNewWallet, startVerify, checkVerify, goToPinConfirm, confirmPin, pinVerifyEnterWallet, promptWalletNotifications, copyHomeAddr, goHomeTransfer, loadTxHistory, copyNative, openCustomizeAddr, hideQR, doTransfer, closeTransferConfirm, confirmTransfer, shareSuccess, openPinSettingsDialog, wwOpenBackupFromSettings, deleteWalletRow, wwSwapRecordsToast, setSwapMax, doSwap, doImportWallet, createGift, copyHbCreatedKeyword, shareHbCreatedKeyword, copyKw, shareKw, showHbQR, copyShareText, submitClaim, pinUnlockBackspace, pinUnlockClear, closePinUnlock, submitTotpUnlock, closeTotpUnlock, confirmTotpSetup, closeTotpSetup, closePinSetupOverlay, wwHideHbSuccessOverlay

### `id="page-*"`（22 个）
page-welcome, page-password-restore, page-create, page-key, page-key-verify, page-pin-setup, page-pin-confirm, page-pin-verify, page-home, page-addr, page-transfer, page-swoosh, page-transfer-success, page-settings, page-swap, page-import, page-hongbao, page-hb-keyword, page-claim, page-claimed, page-hb-records, page-faq

### `data-ww-go` 目标（12 个，均为 `page-*`）
page-create, page-password-restore, page-import, page-welcome, page-faq, page-key-verify, page-pin-setup, page-settings, page-home, page-claim, page-hb-records, page-hongbao

### JS 全局暴露
- `wallet.runtime.js` 末尾 `wwExposeDataWwFnHandlers` / `wwExposeCoreAliases` 将 `data-ww-fn` 与别名（sendTransfer / claimGift / openSend / openReceive）挂到 `window`。
- `wallet.ui.js` 与 `wallet.runtime.js` 均含 `function goTo` / `goTab` 等；**后加载的 `wallet.runtime.js` 覆盖前者**。

### `wallet.css` 花括号
- 开 `{` 330、闭 `}` 330，**平衡**。

---

## STEP 2–3 分析要点
- **加载顺序**（`wallet.html`）：`storage.js` → `core/*` → `wallet.core.js` → `wallet.ui.js` → `wallet.addr.js` → `wallet.tx.js` → `wallet.runtime.js` → `wallet.dom-bind.js`；依赖关系合理。
- **P3**：`wallet.ui.js` 与 `wallet.runtime.js` 大量同名函数并存，仅属维护成本，非功能阻断。
- **STEP 3**：已对典型模式抽样；关键路径多带空判断或 try-catch；未发现需本轮必改的 P1 单点。

---

## 发现的问题（按优先级）
- [P3] 双文件重复实现（如 `doTransfer` / `startVerify` 等在 `wallet.ui.js` 与 `wallet.runtime.js` 各有一份，以后者为准）。
- [P3] 未对 `wallet.html` 全部 `class` 与 `wallet.css` 做穷尽对照（工作量大，非本轮阻断）。

**本轮无 P0/P1/P2 阻断项**；静态脚本验证 TEST-A/B/C 均通过，**未应用代码 patch**。

## 修复内容
- 无（仅更新本报告）。

## 修改文件
- `reports/round_1.md`

## 剩余问题
- 可选后续：收敛重复全局函数，仅保留 `wallet.runtime.js` 权威实现并删除死代码。

## 测试结果
- TEST-A: PASS — 41 个 `data-ww-fn` 均在已加载脚本中存在 `function` / `async function` 定义（或经 `window.*` 暴露）。
- TEST-B: PASS — 12 个 `data-ww-go` 均在 `wallet.html` 中存在对应 `id="page-*"`。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`sendTransfer`、`createGift`、`claimGift`、`openSend`、`openReceive` 均具非空实现（别名为薄包装，视为有效）。
