# Round 1 修复报告 - 2026-04-08 06:19

## STEP 1 扫描摘要

### data-ww-fn（wallet.html，共 43 处，去重后 43 个函数名）
createNewWallet, startVerify, checkVerify, goToPinConfirm, confirmPin, pinVerifyEnterWallet, promptWalletNotifications, copyHomeAddr, goHomeTransfer, loadTxHistory, copyNative, openCustomizeAddr, hideQR, doTransfer, closeTransferConfirm, confirmTransfer, shareSuccess, openPinSettingsDialog, wwOpenBackupFromSettings, deleteWalletRow, wwSwapRecordsToast, setSwapMax, doSwap, doImportWallet, createGift, copyHbCreatedKeyword, shareHbCreatedKeyword, copyKw, shareKw, showHbQR, copyShareText, submitClaim, pinUnlockBackspace, pinUnlockClear, closePinUnlock, submitTotpUnlock, closeTotpUnlock, confirmTotpSetup, closeTotpSetup, closePinSetupOverlay, wwHideHbSuccessOverlay

### id="page-*"（页面列表）
page-welcome, page-password-restore, page-create, page-key, page-key-verify, page-pin-setup, page-pin-confirm, page-pin-verify, page-home, page-addr, page-transfer, page-swoosh, page-transfer-success, page-settings, page-swap, page-import, page-hongbao, page-hb-keyword, page-claim, page-claimed, page-hb-records, page-faq

### data-ww-go 导航目标（去重）
page-create, page-password-restore, page-import, page-welcome, page-faq, page-key-verify, page-pin-setup, page-settings, page-home, page-claim, page-hb-records, page-hongbao

### wallet.css 花括号
开 `{` 330、闭 `}` 330，平衡。

### 架构说明（STEP 2）
- **脚本顺序**：safeLog → ethers → scrypt → api-config → storage → derive → security → wallet → wordlists → wallet.core → **wallet.ui → wallet.addr → wallet.tx → wallet.runtime** → wallet.dom-bind。依赖关系合理；`wallet.runtime.js` 末尾 `wwExposeDataWwFnHandlers` 将 `data-ww-fn` 所需处理函数显式挂到 `window`。
- **同名函数**：`goTo`、`doTransfer`、`startVerify`、`selectTransferCoin` 等在 `wallet.ui.js` 与 `wallet.runtime.js` 中均有定义，**以后加载的 runtime 为准**（当前设计一致）。
- **CSS class**：未做全量 class 穷举比对（属 P3 可选项）。

### 静态逻辑提示（STEP 3，非本轮修复项）
- 部分 `JSON.parse(localStorage...)` 未统一包在 try-catch 中，属数据损坏时的边缘风险（P1 候选，非 TEST 失败项）。

---

## 发现的问题
- [P3] 部分业务 JSON 解析缺少 try-catch（边缘崩溃风险，需后续专项梳理）。
- [P3] wallet.ui / wallet.runtime 存在大量同名全局函数，依赖加载顺序；当前顺序下行为一致。

## 修复内容
- 本轮 **STEP 5 未选出需改代码的 P0/P1**：TEST-A / TEST-B / TEST-C 均通过，**未应用代码 patch（STEP 6–7 无文件改动）**。

## 修改文件
- 无（代码库无功能性修改）

## 剩余问题
- JSON 解析防御性封装可作为后续轮次 P1/P3 优化项。

## 测试结果
- TEST-A: PASS — 上述每个 `data-ww-fn` 均在 `*.js` 中存在 `function` / `async function` 或 `window.*` 绑定来源（含 `wallet.addr.js`、`wallet.tx.js`、`wallet.runtime.js`、`wallet.ui.js` 等）。
- TEST-B: PASS — 每个 `data-ww-go` 目标在 `wallet.html` 中均有对应 `id="page-…"`。
- TEST-C: PASS — goToPinConfirm、confirmPin、pinVerifyEnterWallet、shareSuccess、copyKw、shareKw、showHbQR、copyShareText、sendTransfer、createGift、claimGift、openSend、openReceive 均含有效逻辑（含别名封装），非空/非注释占位。
