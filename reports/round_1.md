# Round 1 修复报告 - 2026-04-08

## STEP 1 扫描摘要

### data-ww-fn（共 41 个）
createNewWallet, startVerify, checkVerify, goToPinConfirm, confirmPin, pinVerifyEnterWallet, promptWalletNotifications, copyHomeAddr, goHomeTransfer, loadTxHistory, copyNative, openCustomizeAddr, hideQR, doTransfer, closeTransferConfirm, confirmTransfer, shareSuccess, openPinSettingsDialog, wwOpenBackupFromSettings, deleteWalletRow, wwSwapRecordsToast, setSwapMax, doSwap, doImportWallet, createGift, copyHbCreatedKeyword, shareHbCreatedKeyword, copyKw, shareKw, showHbQR, copyShareText, submitClaim, pinUnlockBackspace, pinUnlockClear, closePinUnlock, submitTotpUnlock, closeTotpUnlock, confirmTotpSetup, closeTotpSetup, closePinSetupOverlay, wwHideHbSuccessOverlay

### id="page-*"（共 22 个）
page-welcome, page-password-restore, page-create, page-key, page-key-verify, page-pin-setup, page-pin-confirm, page-pin-verify, page-home, page-addr, page-transfer, page-swoosh, page-transfer-success, page-settings, page-swap, page-import, page-hongbao, page-hb-keyword, page-claim, page-claimed, page-hb-records, page-faq

### data-ww-go 目标（12 处，去重后均对应上表 page-id）
page-create, page-password-restore, page-import, page-welcome, page-faq, page-key-verify, page-settings, page-home, page-claim, page-hb-records, page-hongbao

### wallet.css 花括号
开 `{` 330、闭 `}` 330，平衡。

### wallet.runtime.js / wallet.ui.js
全局 `function` 与 `wwExposeDataWwFnHandlers` 内 `window.X =` 共同供 `data-ww-fn` 委托使用；核心别名 sendTransfer / claimGift / openSend / openReceive 在 `wallet.runtime.js` 末尾挂到 `window`。

## STEP 2 架构备注（P3）
- 脚本顺序：`safeLog` → `ethers`/`scrypt-js` → `storage.js` → `core/*` → `wallet.core.js` → `wallet.ui.js` → `wallet.addr.js` → `wallet.tx.js` → `wallet.runtime.js` → `wallet.dom-bind.js`，与依赖关系一致。
- `wallet.ui.js` 与 `wallet.runtime.js` 存在大量同名顶层函数，后加载的 `wallet.runtime.js` 中的实现会覆盖前者；维护时需以 runtime 为准。
- 未做全量 class 审计；主要布局类在 `wallet.css` 中有定义。

## STEP 3 逻辑扫描备注
- `goTo('page-home')` 已结合 `wwWalletHasAnyChainAddress` 与 `loadWallet()` / `localStorage` 回退，避免无钱包时误进首页。
- `JSON.parse` 在关键路径多数有 `try/catch`；价格提醒等函数外层已整体包裹。

## 发现的问题
- [P3] 双文件重复定义同名全局函数，长期维护易产生「改了 ui 却不生效」的错觉（实际以后加载的 runtime 为准）。

## 修复内容
- 文件：无（本轮自动化测试全部通过，未引入功能级缺陷）
- 函数：—
- 修改：—

## 修改文件
- `reports/round_1.md`（本报告）

## 剩余问题
- 无（功能绑定与页面导航静态检查均通过；P3 为工程卫生项，可后续收敛重复定义）

## 测试结果
- TEST-A: PASS — 所有 `data-ww-fn` 均在 `wallet.runtime.js` 的 `wwExposeDataWwFnHandlers` 中挂到 `window`（或作为全局函数由后加载脚本覆盖并暴露）。
- TEST-B: PASS — 所有 `data-ww-go` 在 `wallet.html` 中存在对应 `id="page-…"`。
- TEST-C: PASS — goToPinConfirm、confirmPin、pinVerifyEnterWallet、shareSuccess、copyKw、shareKw、showHbQR、copyShareText、sendTransfer、createGift（定义于 `wallet.ui.js`）、claimGift、openSend、openReceive 均含有效函数体（非仅注释/空行）。
