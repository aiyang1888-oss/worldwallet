# Round 1 修复报告 - 2026-04-07 19:06

## 发现的问题

- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 中存在大量同名全局函数（如 `goTo`、`goTab`、`showToast` 等），依赖脚本加载顺序由后者覆盖前者；当前顺序正确，但长期维护易产生「改错文件」风险。
- [P3] 礼金/礼物存在两套实现：`createHongbao`/`currentKeyword`（runtime）与 `createGift`/`lastHbCreatedKeyword`（ui），`page-hb-keyword` 与 `copyKw` 等依赖 runtime 流程；需避免混用导致状态不一致。

## 修复内容

- 文件：无（本轮静态分析与绑定测试全部通过，无需修改核心代码）
- 函数：—
- 修改：仅新增本报告文件

## 修改文件

- `reports/round_1.md`

## 剩余问题

- 无阻塞性问题；P3 项可作为后续重构参考。

## 测试结果

- **TEST-A**: PASS — `wallet.html` 中 41 个 `data-ww-fn` 均在 `wallet.runtime.js` 的 `wwExposeDataWwFnHandlers`（及同文件内别名块）中有对应 `window.<name> =` 暴露。
- **TEST-B**: PASS — 全部 `data-ww-go` 目标（`page-create`、`page-password-restore`、`page-import`、`page-welcome`、`page-faq`、`page-key-verify`、`page-pin-setup`、`page-settings`、`page-home`、`page-claim`、`page-hb-records`、`page-hongbao`）均存在 `id="page-…"` 页面节点。
- **TEST-C**: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`createGift`、`submitClaim`（`claimGift` 别名）、`confirmTransfer`（`sendTransfer` 别名）、`goHomeTransfer`（`openSend` 别名）、`openReceive`（`goTab('tab-addr')`）均有非空实现。

## STEP 1 扫描摘要

### `data-ww-fn`（41 个）

`createNewWallet`, `startVerify`, `checkVerify`, `goToPinConfirm`, `confirmPin`, `pinVerifyEnterWallet`, `promptWalletNotifications`, `copyHomeAddr`, `goHomeTransfer`, `loadTxHistory`, `copyNative`, `openCustomizeAddr`, `hideQR`, `doTransfer`, `closeTransferConfirm`, `confirmTransfer`, `shareSuccess`, `openPinSettingsDialog`, `wwOpenBackupFromSettings`, `deleteWalletRow`, `wwSwapRecordsToast`, `setSwapMax`, `doSwap`, `doImportWallet`, `createGift`, `copyHbCreatedKeyword`, `shareHbCreatedKeyword`, `copyKw`, `shareKw`, `showHbQR`, `copyShareText`, `submitClaim`, `pinUnlockBackspace`, `pinUnlockClear`, `closePinUnlock`, `submitTotpUnlock`, `closeTotpUnlock`, `confirmTotpSetup`, `closeTotpSetup`, `closePinSetupOverlay`, `wwHideHbSuccessOverlay`

### `id="page-*"` 页面

`page-welcome`, `page-password-restore`, `page-create`, `page-key`, `page-key-verify`, `page-pin-setup`, `page-pin-confirm`, `page-pin-verify`, `page-home`, `page-addr`, `page-transfer`, `page-swoosh`, `page-transfer-success`, `page-settings`, `page-swap`, `page-import`, `page-hongbao`, `page-hb-keyword`, `page-claim`, `page-claimed`, `page-hb-records`, `page-faq`

### `data-ww-go` 导航目标

`page-create`, `page-password-restore`, `page-import`, `page-welcome`, `page-faq`, `page-key-verify`, `page-pin-setup`, `page-settings`, `page-home`, `page-claim`, `page-hb-records`, `page-hongbao`

### `wallet.css` 花括号

开 `{` 329、闭 `}` 329，平衡。

### 脚本加载顺序（`wallet.html`）

`safeLog` → `ethers`/`scrypt`（CDN）→ `api-config` → `storage` → `wallet.derive.paths` → `core/security` → `core/wallet` → `wordlists` → `wallet.core` → `wallet.ui` → `wallet.addr` → `wallet.tx` → `wallet.runtime` → `wallet.dom-bind`；与依赖关系一致。
