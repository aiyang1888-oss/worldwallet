# Round 1 修复报告 - 2026-04-07

## STEP 1 扫描摘要

### data-ww-fn（41 个，去重后）
`createNewWallet`, `startVerify`, `checkVerify`, `goToPinConfirm`, `confirmPin`, `pinVerifyEnterWallet`, `promptWalletNotifications`, `copyHomeAddr`, `goHomeTransfer`, `loadTxHistory`, `copyNative`, `openCustomizeAddr`, `hideQR`, `doTransfer`, `closeTransferConfirm`, `confirmTransfer`, `shareSuccess`, `openPinSettingsDialog`, `wwOpenBackupFromSettings`, `deleteWalletRow`, `wwSwapRecordsToast`, `setSwapMax`, `doSwap`, `doImportWallet`, `createGift`, `copyHbCreatedKeyword`, `shareHbCreatedKeyword`, `copyKw`, `shareKw`, `showHbQR`, `copyShareText`, `submitClaim`, `pinUnlockBackspace`, `pinUnlockClear`, `closePinUnlock`, `submitTotpUnlock`, `closeTotpUnlock`, `confirmTotpSetup`, `closeTotpSetup`, `closePinSetupOverlay`, `wwHideHbSuccessOverlay`

### id="page-*"（22 个）
`page-welcome`, `page-password-restore`, `page-create`, `page-key`, `page-key-verify`, `page-pin-setup`, `page-pin-confirm`, `page-pin-verify`, `page-home`, `page-addr`, `page-transfer`, `page-swoosh`, `page-transfer-success`, `page-settings`, `page-swap`, `page-import`, `page-hongbao`, `page-hb-keyword`, `page-claim`, `page-claimed`, `page-hb-records`, `page-faq`

### data-ww-go 目标（12 个去重）
均存在对应 `id="page-*"`：`page-create`, `page-password-restore`, `page-import`, `page-welcome`, `page-faq`, `page-key-verify`, `page-pin-setup`, `page-settings`, `page-home`, `page-claim`, `page-hb-records`, `page-hongbao`, `page-claimed`

### wallet.ui.js + wallet.runtime.js 全局
两文件均含大量 `function X()`；`wallet.runtime.js` 尾部 `wwExposeDataWwFnHandlers` 将 `data-ww-fn` 所需处理器显式挂到 `window`（含 `loadTrxResource` 等）。

### wallet.css 花括号
开 `{` 与闭 `}` 均为 **329**，**平衡**。

---

## 发现的问题
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 仍存在同名全局函数重复定义，以后加载的 `wallet.runtime.js` 为准；长期可模块化拆分（非阻塞）。
- **P0/P1/P2**：本轮静态分析与绑定扫描未发现阻塞项。

## 修复内容
- 无新的代码补丁。仓库已含 `loadTrxResource` 的 `window` 暴露（`wallet.runtime.js` `wwExposeDataWwFnHandlers`）及 PIN 恢复页、`goTo('page-home')` 对空钱包的回退逻辑。

## 修改文件
- 本轮仅更新本报告 `reports/round_1.md`（无其它源码变更）。

## 剩余问题
- [P3] 双文件重复定义维护成本（见上）。
- 无未解决的 P0/P1/P2 项。

## 测试结果
- **TEST-A**: PASS — `data-ww-fn` 所列名称均在合并后的脚本中以全局 `function` / `window.*` 形式可被解析（Node 扫描 + `wwExposeDataWwFnHandlers` 对齐）。
- **TEST-B**: PASS — 所有 `data-ww-go` 目标均有 `id="page-*"`。
- **TEST-C**: PASS — `goToPinConfirm`, `confirmPin`, `pinVerifyEnterWallet`, `shareSuccess`, `copyKw`, `shareKw`, `showHbQR`, `copyShareText`, `sendTransfer`（→ `confirmTransfer`）, `createGift`, `claimGift`（→ `submitClaim`）, `openSend`（→ `goHomeTransfer`）, `openReceive`（`goTab('tab-addr')`）均存在且函数体非注释/非空。
