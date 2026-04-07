# Round 1 修复报告 - 2026-04-07 19:53

## 发现的问题

- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 存在大量同名全局函数（如 `goTo`、`changeCount`）；最终以 `wallet.runtime.js` 为准，维护时需注意加载顺序，避免只改其中一份导致行为不一致。

## 修复内容

- 文件：无（本轮静态分析与绑定测试均未发现 P0/P1/P2 阻塞项）
- 函数：—
- 修改：—

## 修改文件

- `reports/round_1.md`（本报告）

## 剩余问题

- 无（功能绑定与核心函数体检查均通过；可选：后续可对未包裹 `try/catch` 的 `JSON.parse(localStorage…)` 做防御性加固，属低优先级）

## 测试结果

- TEST-A: PASS — `wallet.html` 中全部 `data-ww-fn` 均在 `wallet.ui.js` / `wallet.addr.js` / `wallet.tx.js` / `wallet.runtime.js` 中以全局函数声明，且 `wallet.runtime.js` 末尾 `wwExposeDataWwFnHandlers` 将处理器挂到 `window`；别名 `sendTransfer`→`confirmTransfer`、`claimGift`→`submitClaim`、`openSend`→`goHomeTransfer`、`openReceive`→`goTab('tab-addr')` 已定义。
- TEST-B: PASS — 全部 `data-ww-go` 目标（如 `page-welcome`、`page-password-restore`、`page-create`、`page-import`、`page-home`、`page-settings`、`page-claim`、`page-hb-records`、`page-hongbao` 等）在 HTML 中均存在对应 `id="page-*"`。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`sendTransfer`、`createGift`、`claimGift`、`openSend`、`openReceive` 函数体均含有效逻辑，非空注释块。

---

## 附录：STEP 1 扫描摘要

### `data-ww-fn`（唯一函数名）

`createNewWallet`, `startVerify`, `checkVerify`, `goToPinConfirm`, `confirmPin`, `pinVerifyEnterWallet`, `promptWalletNotifications`, `copyHomeAddr`, `goHomeTransfer`, `loadTxHistory`, `copyNative`, `openCustomizeAddr`, `hideQR`, `doTransfer`, `closeTransferConfirm`, `confirmTransfer`, `shareSuccess`, `openPinSettingsDialog`, `wwOpenBackupFromSettings`, `deleteWalletRow`, `wwSwapRecordsToast`, `setSwapMax`, `doSwap`, `doImportWallet`, `createGift`, `copyHbCreatedKeyword`, `shareHbCreatedKeyword`, `copyKw`, `shareKw`, `showHbQR`, `copyShareText`, `submitClaim`, `pinUnlockBackspace`, `pinUnlockClear`, `closePinUnlock`, `submitTotpUnlock`, `closeTotpUnlock`, `confirmTotpSetup`, `closeTotpSetup`, `closePinSetupOverlay`, `wwHideHbSuccessOverlay`

### `id="page-*"` 页面列表

`page-welcome`, `page-password-restore`, `page-create`, `page-key`, `page-key-verify`, `page-pin-setup`, `page-pin-confirm`, `page-pin-verify`, `page-home`, `page-addr`, `page-transfer`, `page-swoosh`, `page-transfer-success`, `page-settings`, `page-swap`, `page-import`, `page-hongbao`, `page-hb-keyword`, `page-claim`, `page-claimed`, `page-hb-records`, `page-faq`

### `data-ww-go` 导航目标

`page-create`, `page-password-restore`, `page-import`, `page-welcome`, `page-faq`, `page-key-verify`, `page-pin-setup`, `page-settings`, `page-home`, `page-claim`, `page-hb-records`, `page-hongbao`

### `wallet.css` 花括号

开 `{` 与闭 `}` 均为 329，平衡。

### 脚本加载顺序（`wallet.html`）

`safeLog` → `api-config` → `storage` → `wallet.derive.paths` → `security` → `core/wallet` → `wordlists` → `wallet.core` → `wallet.ui` → `wallet.addr` → `wallet.tx` → `wallet.runtime` → `wallet.dom-bind`（依赖关系合理：`runtime` 最后覆盖主导航与 PIN 流程并暴露 `window` 处理器）。
