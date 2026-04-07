# Round 6 修复报告 - 2026-04-08 06:41

## 发现的问题
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 仍存在同名全局函数、由后加载脚本覆盖的架构特点；与 Round 5 一致，不视为本轮新增缺陷。
- 经 STEP 3 抽样与 STEP 4 自动化核对，未发现新的 P0（绑定/导航缺失）或 P1（明显未判空崩溃路径）项。

## 修复内容
- 本轮无需修改业务代码：TEST-A / TEST-B / TEST-C 全部通过。

## 修改文件
- `reports/round_6.md`（本报告）

## 剩余问题
- 无

## 测试结果
- TEST-A: PASS — 41 个 `data-ww-fn` 均在 `wallet.ui.js` / `wallet.addr.js` / `wallet.runtime.js` 等加载链上存在对应 `function`/`async function` 声明，且 `wallet.runtime.js` 末尾 `wwExposeDataWwFnHandlers` 将核心处理函数挂到 `window`（与内联捕获脚本 `window[fnName]` 一致）。
- TEST-B: PASS — 12 个 `data-ww-go` 目标均在 `wallet.html` 中存在同名 `id="page-…"`。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`sendTransfer`、`createGift`、`claimGift`、`openSend`、`openReceive` 均具非空实现（`createGift` 在 `wallet.ui.js`；别名与红包相关在 `wallet.runtime.js` 约 5956–5968 行）。

## STEP 1 摘要
- **data-ww-fn（41）**：`createNewWallet`, `startVerify`, `checkVerify`, `goToPinConfirm`, `confirmPin`, `pinVerifyEnterWallet`, `promptWalletNotifications`, `copyHomeAddr`, `goHomeTransfer`, `loadTxHistory`, `copyNative`, `openCustomizeAddr`, `hideQR`, `doTransfer`, `closeTransferConfirm`, `confirmTransfer`, `shareSuccess`, `openPinSettingsDialog`, `wwOpenBackupFromSettings`, `deleteWalletRow`, `wwSwapRecordsToast`, `setSwapMax`, `doSwap`, `doImportWallet`, `createGift`, `copyHbCreatedKeyword`, `shareHbCreatedKeyword`, `copyKw`, `shareKw`, `showHbQR`, `copyShareText`, `submitClaim`, `pinUnlockBackspace`, `pinUnlockClear`, `closePinUnlock`, `submitTotpUnlock`, `closeTotpUnlock`, `confirmTotpSetup`, `closeTotpSetup`, `closePinSetupOverlay`, `wwHideHbSuccessOverlay`。
- **id="page-*"（22）**：`page-welcome`, `page-password-restore`, `page-create`, `page-key`, `page-key-verify`, `page-pin-setup`, `page-pin-confirm`, `page-pin-verify`, `page-home`, `page-addr`, `page-transfer`, `page-swoosh`, `page-transfer-success`, `page-settings`, `page-swap`, `page-import`, `page-hongbao`, `page-hb-keyword`, `page-claim`, `page-claimed`, `page-hb-records`, `page-faq`。
- **data-ww-go（12）**：均对应上表中的 `page-*`。
- **wallet.css**：`{` 与 `}` 各 330，平衡。

## STEP 2 摘要
- **脚本顺序**：`storage.js` → `core/*` → `wallet.core.js` → `wallet.ui.js` → `wallet.addr.js` → `wallet.tx.js` → `wallet.runtime.js` → `wallet.dom-bind.js`，与既有依赖一致。
- **CSS**：未做全量 class 与 HTML 交叉枚举；核心页面与 `wallet.css` 一致。
