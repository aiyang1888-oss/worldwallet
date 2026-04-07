# Round 1 修复报告 - 2026-04-07 23:26

## 发现的问题
- [P0] 无 — TEST-A（`data-ww-fn` → 全局函数）与 TEST-B（`data-ww-go` → `id="page-*"`）均通过。
- [P1] 本轮静态抽查未发现「必现崩溃」类问题（`goTo` 已对 `page-home` / `page-password-restore` 做 `REAL_WALLET` / `ww_wallet` 与 `loadWallet` 兜底）。
- [P2] 无 — TEST-C 所列核心函数均具非空实现（含 `sendTransfer`/`claimGift`/`openSend`/`openReceive` 在 `wallet.runtime.js` 末尾别名映射）。
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 存在大量同名顶层函数；加载顺序为 ui → addr → tx → **runtime**，最终以 **runtime** 为准，后续修改需避免两处漂移。`wallet.css` 花括号 **330 / 330**，已平衡。

## 修复内容
- 本轮无需功能性代码修改（自动化绑定与页面路由检查均通过）。

## 修改文件
- `reports/round_1.md`（本审计报告）

## 剩余问题
- 无（功能与绑定层面）。可选：在父级仓库配置 Telegram 环境变量后使用通知脚本（若适用）。

## 测试结果
- TEST-A: PASS — `wallet.html` 中 41 个 `data-ww-fn` 均在合并后的 `wallet.core.js` / `wallet.ui.js` / `wallet.addr.js` / `wallet.tx.js` / `wallet.runtime.js` 中存在对应全局 `function` / `async function`（或由 runtime 挂到 `window`）。
- TEST-B: PASS — 全部 `data-ww-go` 目标在 `wallet.html` 中存在对应 `id="page-*"`。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`sendTransfer`（→ `confirmTransfer`）、`createGift`、`claimGift`（→ `submitClaim`）、`openSend`（→ `goHomeTransfer`）、`openReceive`（→ `goTab('tab-addr')`）均具非空实现。

## STEP 1 摘录（扫描快照）

### `data-ww-fn`（41）
`createNewWallet`, `startVerify`, `checkVerify`, `goToPinConfirm`, `confirmPin`, `pinVerifyEnterWallet`, `promptWalletNotifications`, `copyHomeAddr`, `goHomeTransfer`, `loadTxHistory`, `copyNative`, `openCustomizeAddr`, `hideQR`, `doTransfer`, `closeTransferConfirm`, `confirmTransfer`, `shareSuccess`, `openPinSettingsDialog`, `wwOpenBackupFromSettings`, `deleteWalletRow`, `wwSwapRecordsToast`, `setSwapMax`, `doSwap`, `doImportWallet`, `createGift`, `copyHbCreatedKeyword`, `shareHbCreatedKeyword`, `copyKw`, `shareKw`, `showHbQR`, `copyShareText`, `submitClaim`, `pinUnlockBackspace`, `pinUnlockClear`, `closePinUnlock`, `submitTotpUnlock`, `closeTotpUnlock`, `confirmTotpSetup`, `closeTotpSetup`, `closePinSetupOverlay`, `wwHideHbSuccessOverlay`

### `id="page-*"`（21）
`page-welcome`, `page-password-restore`, `page-create`, `page-key`, `page-key-verify`, `page-pin-setup`, `page-pin-confirm`, `page-pin-verify`, `page-home`, `page-addr`, `page-transfer`, `page-swoosh`, `page-transfer-success`, `page-settings`, `page-swap`, `page-import`, `page-hongbao`, `page-hb-keyword`, `page-claim`, `page-claimed`, `page-hb-records`, `page-faq`

### `data-ww-go` 目标
`page-create`, `page-password-restore`, `page-import`, `page-welcome`, `page-faq`, `page-key-verify`, `page-pin-setup`, `page-settings`, `page-home`, `page-claim`, `page-hb-records`, `page-hongbao`, `page-claimed`

### JS 全局导出
- `wallet.runtime.js` 末尾 `wwExposeDataWwFnHandlers` / `wwExposeCoreAliases` 将 HTML 所需处理器显式挂到 `window`（供捕获阶段内联委托使用）。
- `wallet.ui.js` / `wallet.runtime.js` 均含大量 `function X()`；同名时以后加载的 **runtime** 为准。
