# Round 7 修复报告 - 2026-04-08 06:43

## 发现的问题
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 存在大量同名全局函数，后加载的 `wallet.runtime.js` 覆盖前者；属既有架构，与 Round 6 一致，本轮未作为需代码修复项。
- 经 STEP 3 抽样（`getElementById` 链式使用、`JSON.parse`、`async`/`await`、`REAL_WALLET`+`saveWalletSecure`、未挂 `window` 的处理器）与 STEP 4 自动化核对，未发现新的 P0（绑定/导航缺失）、P1（明显崩溃路径）或 P2（TEST-C 核心函数空实现）。

## 修复内容
- 本轮无需修改业务代码：TEST-A / TEST-B / TEST-C 全部通过；仅新增本报告。

## 修改文件
- `reports/round_7.md`（本报告）

## 剩余问题
- 无

## 测试结果
- TEST-A: PASS — 41 个 `data-ww-fn` 均在已扫描的 JS（含 `wallet.runtime.js` 中 `function`/`async function` 定义）中出现；`wallet.runtime.js` 末尾 `wwExposeDataWwFnHandlers` 将核心处理函数挂到 `window`，与内联捕获脚本 `window[fnName]` 一致。
- TEST-B: PASS — 12 个 `data-ww-go` 目标均在 `wallet.html` 中存在对应 `id="page-…"`。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`sendTransfer`、`createGift`、`claimGift`、`openSend`、`openReceive` 均具非空实现（别名 `sendTransfer`/`claimGift`/`openSend`/`openReceive` 在 `wallet.runtime.js` 约 5956–5968 行）。

## STEP 1 摘要
- **data-ww-fn（41）**：`checkVerify`, `closePinSetupOverlay`, `closePinUnlock`, `closeTotpSetup`, `closeTotpUnlock`, `closeTransferConfirm`, `confirmPin`, `confirmTotpSetup`, `confirmTransfer`, `copyHbCreatedKeyword`, `copyHomeAddr`, `copyKw`, `copyNative`, `copyShareText`, `createGift`, `createNewWallet`, `deleteWalletRow`, `doImportWallet`, `doSwap`, `doTransfer`, `goHomeTransfer`, `goToPinConfirm`, `hideQR`, `loadTxHistory`, `openCustomizeAddr`, `openPinSettingsDialog`, `pinUnlockBackspace`, `pinUnlockClear`, `pinVerifyEnterWallet`, `promptWalletNotifications`, `setSwapMax`, `shareHbCreatedKeyword`, `shareKw`, `shareSuccess`, `showHbQR`, `startVerify`, `submitClaim`, `submitTotpUnlock`, `wwHideHbSuccessOverlay`, `wwOpenBackupFromSettings`, `wwSwapRecordsToast`。
- **id="page-*"（22）**：`page-welcome`, `page-password-restore`, `page-create`, `page-key`, `page-key-verify`, `page-pin-setup`, `page-pin-confirm`, `page-pin-verify`, `page-home`, `page-addr`, `page-transfer`, `page-swoosh`, `page-transfer-success`, `page-settings`, `page-swap`, `page-import`, `page-hongbao`, `page-hb-keyword`, `page-claim`, `page-claimed`, `page-hb-records`, `page-faq`。
- **data-ww-go（12）**：均对应上表中的 `page-*`。
- **wallet.css**：`{` 与 `}` 各 330，平衡。

## STEP 2 摘要
- **脚本顺序**：`js/storage.js` → `core/*` → `wallet.core.js` → `wallet.ui.js` → `wallet.addr.js` → `wallet.tx.js` → `wallet.runtime.js` → `wallet.dom-bind.js`，与依赖一致。
- **全局覆盖**：`goTo`、`goTab`、`doTransfer` 等由 `wallet.runtime.js` 最终定义；与 Round 6 描述一致。
