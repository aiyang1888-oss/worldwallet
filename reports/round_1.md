# Round 1 修复报告 - 2026-04-07 21:15

## STEP 1 扫描摘要

### wallet.html — `data-ww-fn`（41 个，去重后）
createNewWallet, startVerify, checkVerify, goToPinConfirm, confirmPin, pinVerifyEnterWallet, promptWalletNotifications, copyHomeAddr, goHomeTransfer, loadTxHistory, copyNative, openCustomizeAddr, hideQR, doTransfer, closeTransferConfirm, confirmTransfer, shareSuccess, openPinSettingsDialog, wwOpenBackupFromSettings, deleteWalletRow, wwSwapRecordsToast, setSwapMax, doSwap, doImportWallet, createGift, copyHbCreatedKeyword, shareHbCreatedKeyword, copyKw, shareKw, showHbQR, copyShareText, submitClaim, pinUnlockBackspace, pinUnlockClear, closePinUnlock, submitTotpUnlock, closeTotpUnlock, confirmTotpSetup, closeTotpSetup, closePinSetupOverlay, wwHideHbSuccessOverlay

### wallet.html — `id="page-*"`（页面）
page-welcome, page-password-restore, page-create, page-key, page-key-verify, page-pin-setup, page-pin-confirm, page-pin-verify, page-home, page-addr, page-transfer, page-swoosh, page-transfer-success, page-settings, page-swap, page-import, page-hongbao, page-hb-keyword, page-claim, page-claimed, page-hb-records, page-faq

### wallet.html — `data-ww-go` 目标（均存在对应 `id="page-…"`）
page-create, page-password-restore, page-import, page-welcome, page-faq, page-key-verify, page-pin-setup, page-settings, page-home, page-hongbao, page-claim, page-hb-records

### wallet.css — 花括号
开 `{` 与闭 `}` 均为 **329**，**平衡**。

### JS 全局绑定
`wallet.runtime.js` 末尾 `wwExposeDataWwFnHandlers` / `wwExposeCoreAliases` 将核心处理器挂到 `window`；`wallet.ui.js` 定义 `_safeEl`、`_origGetEl` 等，加载顺序为 ui → addr → tx → **runtime（覆盖同名顶层函数）**。

---

## 发现的问题

- [P3] **重复实现**：`wallet.ui.js` 与 `wallet.runtime.js` 均含大段 `goTo`、`loadTxHistory`、`showToast` 等；以后加载的 `wallet.runtime.js` 生效，双份逻辑增加漂移风险（本轮不改架构）。
- [P3] **依赖**：ethers / TronGrid 等为外链脚本；离线或 API 限流时部分功能降级属环境限制。

**本轮未检出 P0（绑定/页面缺失）或需立即修补的 P1（崩溃路径）阻断项。**

---

## 修复内容

- 本轮经 TEST-A/B/C 验证通过，**未对仓库作新的代码修改**（沿用当前 `goTo('page-home')` 中 `wwWalletHasAnyChainAddress`、`submitPageRestorePin` 等与 HTML 一致的实现）。

## 修改文件

- 无（仅更新本报告）

## 剩余问题

- 可考虑后续将 `wallet.ui.js` 与 `wallet.runtime.js` 中重复的导航/余额/历史逻辑收敛为单一模块，减少维护成本。
- 建议在真机浏览器对「仅 TRX 钱包」场景做一次首页与收款页回归。

## 测试结果

- **TEST-A**: PASS — 每个 `data-ww-fn` 均在工程 JS 中有对应顶层 `function` 定义，且 `wallet.runtime.js` 中将处理器显式挂到 `window`（内联委托与 `wallet.dom-bind.js` 一致）。
- **TEST-B**: PASS — 每个 `data-ww-go="page-…"` 均在 `wallet.html` 中存在同名 `id="page-…"` 的页面节点。
- **TEST-C**: PASS — `goToPinConfirm`, `confirmPin`, `pinVerifyEnterWallet`, `shareSuccess`, `copyKw`, `shareKw`, `showHbQR`, `copyShareText`, `createGift` 均有非空实现；`sendTransfer` → `confirmTransfer`，`claimGift` → `submitClaim`，`openSend` → `goHomeTransfer`，`openReceive` → `goTab('tab-addr')`（见 `wallet.runtime.js` 中 `wwExposeCoreAliases`）。
