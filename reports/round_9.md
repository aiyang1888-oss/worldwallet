# Round 9 修复报告 - 2026-04-08

## 发现的问题
- 无新增 P0–P2：接续 Round 8「剩余问题：无」，本轮自动化 TEST-A / TEST-B / TEST-C 全部通过。
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 仍存在同名全局函数由后加载文件覆盖的既有架构（与 Round 7/8 一致），不作为本轮必须修复项。

## 修复内容
- 本轮无业务代码修改；仅新增本报告。

## 修改文件
- `reports/round_9.md`（本报告）

## 剩余问题
- 无

## 测试结果
- TEST-A: PASS — 41 个 `data-ww-fn` 均在已扫描的 JS 中可解析为 `function`/`async function` 或通过 `wallet.runtime.js` 末尾 `wwExposeDataWwFnHandlers` 挂到 `window`，与内联 `window[fnName]` 一致。
- TEST-B: PASS — 12 个 `data-ww-go` 目标均在 `wallet.html` 中存在对应 `id="page-…"`。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`sendTransfer`、`createGift`、`claimGift`、`openSend`、`openReceive` 均具非空实现（含指向 `confirmTransfer`/`submitClaim`/`goHomeTransfer` 的薄包装）。

## STEP 1 摘要
- **data-ww-fn（41）**：`checkVerify`、`closePinSetupOverlay`、`closePinUnlock`、`closeTotpSetup`、`closeTotpUnlock`、`closeTransferConfirm`、`confirmPin`、`confirmTotpSetup`、`confirmTransfer`、`copyHbCreatedKeyword`、`copyHomeAddr`、`copyKw`、`copyNative`、`copyShareText`、`createGift`、`createNewWallet`、`deleteWalletRow`、`doImportWallet`、`doSwap`、`doTransfer`、`goHomeTransfer`、`goToPinConfirm`、`hideQR`、`loadTxHistory`、`openCustomizeAddr`、`openPinSettingsDialog`、`pinUnlockBackspace`、`pinUnlockClear`、`pinVerifyEnterWallet`、`promptWalletNotifications`、`setSwapMax`、`shareHbCreatedKeyword`、`shareKw`、`shareSuccess`、`showHbQR`、`startVerify`、`submitClaim`、`submitTotpUnlock`、`wwHideHbSuccessOverlay`、`wwOpenBackupFromSettings`、`wwSwapRecordsToast`。
- **id="page-*"（22）**：`page-welcome`、`page-password-restore`、`page-create`、`page-key`、`page-key-verify`、`page-pin-setup`、`page-pin-confirm`、`page-pin-verify`、`page-home`、`page-addr`、`page-transfer`、`page-swoosh`、`page-transfer-success`、`page-settings`、`page-swap`、`page-import`、`page-hongbao`、`page-hb-keyword`、`page-claim`、`page-claimed`、`page-hb-records`、`page-faq`。
- **data-ww-go（12）**：`page-welcome`、`page-password-restore`、`page-create`、`page-import`、`page-faq`、`page-key-verify`、`page-pin-setup`、`page-settings`、`page-home`、`page-claim`、`page-hb-records`、`page-hongbao`。
- **wallet.css**：`{` 与 `}` 各 330，平衡。

## STEP 2 摘要
- **脚本顺序**：`js/storage.js` → `core/*` → `wallet.core.js` → `wallet.ui.js` → `wallet.addr.js` → `wallet.tx.js` → `wallet.runtime.js` → `wallet.dom-bind.js`，与依赖一致。
- **全局覆盖**：`goTo`、`goTab`、`doTransfer` 等由 `wallet.runtime.js` 最终定义；属已知行为。

## STEP 3 摘要
- 对 `JSON.parse`、`getElementById` 链式使用等做了抽样：未发现需单独列为 P1 的新崩溃路径；部分 `JSON.parse(localStorage…)` 无外层 try（与既有代码风格并存），未作为本轮阻断项。
