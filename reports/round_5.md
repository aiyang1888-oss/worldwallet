# Round 5 修复报告 - 2026-04-08 06:40

## 发现的问题
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 存在大量同名全局函数，由后加载的 `wallet.runtime.js` 覆盖前者，属已知架构特点，非本轮回归缺陷。
- [P3] 部分 `localStorage` 的 `JSON.parse` 调用已用 try-catch 包裹；其余在独立 try 块或默认值路径中，静态审查未发现新的未保护崩溃点。

## 修复内容
- 本轮无需修改业务代码：上一轮（Round 4）已修复 `setAmount` / `runBatchTransfer` 判空；当前 `TEST-A`/`TEST-B`/`TEST-C` 全部通过。

## 修改文件
- `reports/round_5.md`（本报告）

## 剩余问题
- 无（与架构说明中的 P3 为长期认知项，不阻塞发布）

## 测试结果
- TEST-A: PASS — `wallet.html` 中 41 个 `data-ww-fn` 均在 `wallet.ui.js` / `wallet.runtime.js` 中具备对应 `function`/`async function` 或 `window.*` 暴露（以后加载脚本为准）。
- TEST-B: PASS — 12 个 `data-ww-go` 目标均在 `wallet.html` 中存在同名 `id="page-…"`。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`sendTransfer`、`createGift`、`claimGift`、`openSend`、`openReceive` 均有有效实现（别名函数在 `wallet.runtime.js` 约 5956–5968 行）。

## STEP 1 摘要
- **data-ww-fn（41）**：`createNewWallet`, `startVerify`, `checkVerify`, `goToPinConfirm`, `confirmPin`, `pinVerifyEnterWallet`, `promptWalletNotifications`, `copyHomeAddr`, `goHomeTransfer`, `loadTxHistory`, `copyNative`, `openCustomizeAddr`, `hideQR`, `doTransfer`, `closeTransferConfirm`, `confirmTransfer`, `shareSuccess`, `openPinSettingsDialog`, `wwOpenBackupFromSettings`, `deleteWalletRow`, `wwSwapRecordsToast`, `setSwapMax`, `doSwap`, `doImportWallet`, `createGift`, `copyHbCreatedKeyword`, `shareHbCreatedKeyword`, `copyKw`, `shareKw`, `showHbQR`, `copyShareText`, `submitClaim`, `pinUnlockBackspace`, `pinUnlockClear`, `closePinUnlock`, `submitTotpUnlock`, `closeTotpUnlock`, `confirmTotpSetup`, `closeTotpSetup`, `closePinSetupOverlay`, `wwHideHbSuccessOverlay`。
- **id="page-*"（22）**：`page-welcome`, `page-password-restore`, `page-create`, `page-key`, `page-key-verify`, `page-pin-setup`, `page-pin-confirm`, `page-pin-verify`, `page-home`, `page-addr`, `page-transfer`, `page-swoosh`, `page-transfer-success`, `page-settings`, `page-swap`, `page-import`, `page-hongbao`, `page-hb-keyword`, `page-claim`, `page-claimed`, `page-hb-records`, `page-faq`。
- **data-ww-go（12）**：均对应上表中的 `page-*`。
- **wallet.css**：`{` 与 `}` 各 330，平衡。

## STEP 2 摘要
- **脚本顺序**：`storage.js` → `core/*` → `wallet.core.js` → `wallet.ui.js` → `wallet.addr.js` → `wallet.tx.js` → `wallet.runtime.js` → `wallet.dom-bind.js`，依赖关系合理；`wallet.runtime.js` 末尾 `wwExposeDataWwFnHandlers` 将 `data-ww-fn` 处理函数挂到 `window`。
- **CSS**：未做全量 class 交叉校验；核心页面 class 与既有样式一致。
