# Round 1 修复报告 - 2026-04-08

## 发现的问题

- 本轮静态与绑定测试未发现新的 **P0**（`data-ww-fn` / 页面 id 缺失）或 **P1**（需立即修复的崩溃级逻辑）项。
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 存在大量同名全局函数，以后加载的 `wallet.runtime.js` 为准；长期可合并或构建去重以降低维护成本。

### STEP 1 扫描摘要

- **data-ww-fn（41 个唯一）**：`checkVerify`, `closePinSetupOverlay`, `closePinUnlock`, `closeTotpSetup`, `closeTotpUnlock`, `closeTransferConfirm`, `confirmPin`, `confirmTotpSetup`, `confirmTransfer`, `copyHbCreatedKeyword`, `copyHomeAddr`, `copyKw`, `copyNative`, `copyShareText`, `createGift`, `createNewWallet`, `deleteWalletRow`, `doImportWallet`, `doSwap`, `doTransfer`, `goHomeTransfer`, `goToPinConfirm`, `hideQR`, `loadTxHistory`, `openCustomizeAddr`, `openPinSettingsDialog`, `pinUnlockBackspace`, `pinUnlockClear`, `pinVerifyEnterWallet`, `promptWalletNotifications`, `setSwapMax`, `shareHbCreatedKeyword`, `shareKw`, `shareSuccess`, `showHbQR`, `startVerify`, `submitClaim`, `submitTotpUnlock`, `wwHideHbSuccessOverlay`, `wwOpenBackupFromSettings`, `wwSwapRecordsToast`
- **id="page-*"（22 个）**：`page-welcome`, `page-password-restore`, `page-create`, `page-key`, `page-key-verify`, `page-pin-setup`, `page-pin-confirm`, `page-pin-verify`, `page-home`, `page-addr`, `page-transfer`, `page-swoosh`, `page-transfer-success`, `page-settings`, `page-swap`, `page-import`, `page-hongbao`, `page-hb-keyword`, `page-claim`, `page-claimed`, `page-hb-records`, `page-faq`
- **data-ww-go（12 个唯一目标）**：均存在对应 `id="page-…"` 页面节点。
- **wallet.css**：花括号开/闭均为 330，平衡。
- **window / function**：`wallet.runtime.js` 中 `wwExposeDataWwFnHandlers`、`wwExposeCoreAliases` 将 `data-ww-fn` 与核心别名挂到 `window`；部分函数定义于先加载的 `wallet.ui.js`、`wallet.addr.js`、`wallet.tx.js`。

### STEP 2 架构备注

- **脚本顺序**：`safeLog` → CDN（ethers/scrypt）→ `js/storage.js` → `core/*` → `wallet.core.js` → `wallet.ui.js` → `wallet.addr.js` → `wallet.tx.js` → `wallet.runtime.js` → `wallet.dom-bind.js`，与依赖关系一致。
- **全局覆盖**：`goTo`、`doTransfer`、`confirmTransfer`、`broadcastRealTransfer` 等以 **`wallet.runtime.js`（最后加载）** 中的实现为准。

### STEP 3 逻辑扫描摘要

- `goTo('page-home')` / `goTo('page-password-restore')` 已结合 `wwWalletHasAnyChainAddress`、`loadWallet()` 与本地 `ww_wallet` 校验，避免无钱包时误入首页或 PIN 页。
- `pageRestorePinForm` / `pinUnlockForm` 由 `wallet.dom-bind.js` 绑定至 `submitPageRestorePin` / `submitPinUnlock`。
- 常见 `JSON.parse(localStorage…)` 路径多已配合 `try/catch`。

## 修复内容

- **本轮**：无产品代码变更；仅更新本扫描报告。
- 提交：`deacd08`

## 修改文件

- `reports/round_1.md`

## 剩余问题

- [P3] 双文件（`wallet.ui.js` / `wallet.runtime.js`）重复定义同名全局函数，后续可考虑收敛模块边界。

## 测试结果

- **TEST-A**: PASS — 全部 `data-ww-fn` 名称在合并后的核心 JS 中均有 `function` / `async function` 定义，并由 `wallet.runtime.js` 末尾挂到 `window`（或由先加载脚本形成全局函数后再暴露）。
- **TEST-B**: PASS — 全部 `data-ww-go` 目标在 `wallet.html` 中存在对应 `id="page-…"`。
- **TEST-C**: PASS — `goToPinConfirm`, `confirmPin`, `pinVerifyEnterWallet`, `shareSuccess`, `copyKw`, `shareKw`, `showHbQR`, `copyShareText`, `sendTransfer`, `createGift`, `claimGift`, `openSend`, `openReceive` 均为非空实现（含 `sendTransfer`/`claimGift`/`openSend`/`openReceive` 对 `confirmTransfer`/`submitClaim`/`goHomeTransfer`/`goTab` 的别名包装）。
