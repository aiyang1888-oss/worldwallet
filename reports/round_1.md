# Round 1 修复报告 - 2026-04-08 01:08

## STEP 1 扫描摘要

### `data-ww-fn`（41 个，去重）
`createNewWallet`, `startVerify`, `checkVerify`, `goToPinConfirm`, `confirmPin`, `pinVerifyEnterWallet`, `promptWalletNotifications`, `copyHomeAddr`, `goHomeTransfer`, `loadTxHistory`, `copyNative`, `openCustomizeAddr`, `hideQR`, `doTransfer`, `closeTransferConfirm`, `confirmTransfer`, `shareSuccess`, `openPinSettingsDialog`, `wwOpenBackupFromSettings`, `deleteWalletRow`, `wwSwapRecordsToast`, `setSwapMax`, `doSwap`, `doImportWallet`, `createGift`, `copyHbCreatedKeyword`, `shareHbCreatedKeyword`, `copyKw`, `shareKw`, `showHbQR`, `copyShareText`, `submitClaim`, `pinUnlockBackspace`, `pinUnlockClear`, `closePinUnlock`, `submitTotpUnlock`, `closeTotpUnlock`, `confirmTotpSetup`, `closeTotpSetup`, `closePinSetupOverlay`, `wwHideHbSuccessOverlay`

### `id="page-*"` 页面
`page-welcome`, `page-password-restore`, `page-create`, `page-key`, `page-key-verify`, `page-pin-setup`, `page-pin-confirm`, `page-pin-verify`, `page-home`, `page-addr`, `page-transfer`, `page-swoosh`, `page-transfer-success`, `page-settings`, `page-swap`, `page-import`, `page-hongbao`, `page-hb-keyword`, `page-claim`, `page-claimed`, `page-hb-records`, `page-faq`

### `data-ww-go` 目标（12 处）
`page-create`, `page-password-restore`, `page-import`, `page-welcome`, `page-faq`, `page-key-verify`, `page-pin-setup`, `page-settings`, `page-home`, `page-claim`, `page-hb-records`, `page-hongbao` — 均存在对应 `id="page-…"`。

### `wallet.runtime.js` / `wallet.ui.js` 全局导出
- 业务处理器主要在 `wallet.runtime.js` 末尾 IIFE `wwExposeDataWwFnHandlers` 中挂到 `window`；部分函数（如 `createGift`）定义于先加载的 `wallet.ui.js`，运行时通过 `typeof createGift === 'function'` 再赋值到 `window`。
- 别名：`wwExposeCoreAliases` 提供 `sendTransfer`→`confirmTransfer`，`claimGift`→`submitClaim`，`openSend`→`goHomeTransfer`，`openReceive`→`goTab('tab-addr')`。

### `wallet.css`
花括号 `open === close`（330 / 330），平衡。

---

## 发现的问题
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 存在大量同名全局函数；以**后加载**的 `wallet.runtime.js` 为准，属既有架构，非本轮阻断项。

## 修复内容
- 本轮复测：**无需新增代码修改**（绑定、导航与核心函数体均满足 TEST-A/B/C）。

## 修改文件
- 无（仅更新本报告）

## 剩余问题
- [P3] 双文件并行维护同名全局函数，长期建议合并或明确单一事实来源（非本轮必须）。

## 测试结果
- TEST-A: PASS — 全部 `data-ww-fn` 在加载链中可解析为全局函数，且由 `wwExposeDataWwFnHandlers` 显式挂到 `window`（供 `wallet.html` 捕获阶段委托使用）。
- TEST-B: PASS — 全部 `data-ww-go="page-*"` 在 `wallet.html` 中存在对应页面节点。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`createGift`（`wallet.ui.js`）均有非空实现；`sendTransfer`、`claimGift`、`openSend`、`openReceive` 由 `wallet.runtime.js` 别名块映射到既有实现。
