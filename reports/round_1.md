# Round 1 修复报告 - 2026-04-08 06:14

## STEP 1 扫描摘要

### wallet.html · `data-ww-fn`（41 个，去重后）
`createNewWallet`, `startVerify`, `checkVerify`, `goToPinConfirm`, `confirmPin`, `pinVerifyEnterWallet`, `promptWalletNotifications`, `copyHomeAddr`, `goHomeTransfer`, `loadTxHistory`, `copyNative`, `openCustomizeAddr`, `hideQR`, `doTransfer`, `closeTransferConfirm`, `confirmTransfer`, `shareSuccess`, `openPinSettingsDialog`, `wwOpenBackupFromSettings`, `deleteWalletRow`, `wwSwapRecordsToast`, `setSwapMax`, `doSwap`, `doImportWallet`, `createGift`, `copyHbCreatedKeyword`, `shareHbCreatedKeyword`, `copyKw`, `shareKw`, `showHbQR`, `copyShareText`, `submitClaim`, `pinUnlockBackspace`, `pinUnlockClear`, `closePinUnlock`, `submitTotpUnlock`, `closeTotpUnlock`, `confirmTotpSetup`, `closeTotpSetup`, `closePinSetupOverlay`, `wwHideHbSuccessOverlay`

### wallet.html · `id="page-*"`
`page-welcome`, `page-password-restore`, `page-create`, `page-key`, `page-key-verify`, `page-pin-setup`, `page-pin-confirm`, `page-pin-verify`, `page-home`, `page-addr`, `page-transfer`, `page-swoosh`, `page-transfer-success`, `page-settings`, `page-swap`, `page-import`, `page-hongbao`, `page-hb-keyword`, `page-claim`, `page-claimed`, `page-hb-records`, `page-faq`

### wallet.html · `data-ww-go`
`page-create`, `page-password-restore`, `page-import`, `page-welcome`, `page-faq`, `page-key-verify`, `page-pin-setup`, `page-settings`, `page-home`, `page-claim`, `page-hb-records`, `page-hongbao`

### wallet.runtime.js + wallet.ui.js · 全局绑定
`wallet.runtime.js` 末尾 IIFE 显式将 `goTo`、`goTab`、`checkVerify`、PIN 链、`copyKw`、`shareSuccess`、`doTransfer` 等挂到 `window`；另有 `sendTransfer`/`claimGift`/`openSend`/`openReceive` 别名块。`wallet.ui.js` 中部分同名函数由后加载的 `wallet.runtime.js` 覆盖，行为以 runtime 为准。

### wallet.css 花括号
开 `{` 与闭 `}` 均为 **330**，**平衡**。

---

## 发现的问题
- [P3] **架构**：`wallet.ui.js` 与 `wallet.runtime.js` 存在大量同名函数重复定义；加载顺序为 ui → runtime，最终以 **runtime 实现**为准。易在误改 ui 副本时产生「改了不生效」的错觉，宜以注释/单一事实来源约束（已有部分注释指向 runtime）。
- 本轮 **未发现** P0（绑定/页面缺失）、P1（必现崩溃类）或 P2（TEST-C 所列核心函数为空）阻塞项。

## 修复内容
- 本轮 **无代码级 patch**：静态与绑定测试结果均通过，未引入新的功能性修改。

## 修改文件
- `reports/round_1.md`（本审计报告）

## 剩余问题
- 无（功能与绑定测试层面）；若需长期维护，可考虑逐步收敛 ui/runtime 重复函数（非本轮范围）。

## 测试结果
- **TEST-A**: PASS — 每个 `data-ww-fn` 均在合并后的核心 JS 中匹配 `(async )function name` 或 `window.name =`。
- **TEST-B**: PASS — 每个 `data-ww-go` 目标在 `wallet.html` 中均有对应 `id="page-*"` 的页面容器。
- **TEST-C**: PASS — `goToPinConfirm`, `confirmPin`, `pinVerifyEnterWallet`, `shareSuccess`, `copyKw`, `shareKw`, `showHbQR`, `copyShareText`, `sendTransfer`, `createGift`, `claimGift`, `openSend`, `openReceive` 在 `wallet.runtime.js` / `wallet.ui.js` 中函数体均非空（含别名包装）。
