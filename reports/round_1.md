# Round 1 修复报告 - 2026-04-07 19:14

## 发现的问题

- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 中存在大量同名全局函数（如 `goTo`、`goTab`、`showToast` 等），依赖脚本加载顺序由后者覆盖；顺序正确但维护时易改错文件。
- [P3] `wallet.dom-bind.js` 与内联委托均通过 `typeof window.goTo === 'function'` 判断导航；在部分运行环境下显式挂载更稳妥。

## 修复内容

- 文件：`wallet.runtime.js`
- 函数：`wwExposeDataWwFnHandlers`（立即执行函数）
- 修改：在既有 `window.*` 暴露块开头增加 `window.goTo = goTo`、`window.goTab = goTab`，与底栏/路由约定一致。

## 修改文件

- `wallet.runtime.js`
- `reports/round_1.md`（本报告，若使用 `git add -f` 纳入版本控制）

## 剩余问题

- 无阻塞性问题；双文件重复实现可作为后续重构项。

## 测试结果

- TEST-A: PASS — `wallet.html` 中 41 个 `data-ww-fn` 均在合并后的 JS 中存在对应全局 `function`/`window` 绑定；`wwExposeDataWwFnHandlers` 与别名块与之一致。
- TEST-B: PASS — 全部 `data-ww-go` 目标均存在 `id="page-…"`。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`createGift`、`submitClaim`（`claimGift`）、`confirmTransfer`（`sendTransfer`）、`goHomeTransfer`（`openSend`）、`openReceive` 均有非空实现或别名。

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

`safeLog` → `ethers`/`scrypt`（CDN）→ `api-config` → `storage` → `wallet.derive.paths` → `core/security` → `core/wallet` → `wordlists` → `wallet.core` → `wallet.ui` → `wallet.addr` → `wallet.tx` → `wallet.runtime` → `wallet.dom-bind`。
