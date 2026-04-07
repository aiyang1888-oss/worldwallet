# Round 10 修复报告 - 2026-04-08

## 发现的问题
- 本轮静态扫描与自动化绑定测试未发现新的 **P0–P2** 阻断项；与 Round 9 一致，**TEST-A / TEST-B / TEST-C** 全部通过。
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 仍存在同名全局函数由后加载文件覆盖的架构特点（已知行为，非本轮必须修复项）。

## 修复内容
- 本轮无业务代码修改；仅新增本报告（Round 10 完整审计留档）。

## 修改文件
- `reports/round_10.md`（本报告）

## 剩余问题
- 无

## 测试结果
- **TEST-A: PASS** — 41 个 `data-ww-fn` 均在已扫描的 `wallet.ui.js` + `wallet.runtime.js` 中可解析为 `function` / `async function`；`wallet.runtime.js` 末尾 `wwExposeDataWwFnHandlers` 将处理器挂到 `window`，与 `wallet.html` 捕获阶段委托及 `window[fnName]` 一致。
- **TEST-B: PASS** — 12 个 `data-ww-go` 目标均在 `wallet.html` 中存在对应 `id="page-…"`。
- **TEST-C: PASS** — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`sendTransfer`、`createGift`（定义于 `wallet.ui.js`）、`claimGift`、`openSend`、`openReceive` 均具非空实现（含指向 `confirmTransfer` / `submitClaim` / `goHomeTransfer` 的薄包装）。

## STEP 1 摘要
- **data-ww-fn（41）**：`checkVerify`、`closePinSetupOverlay`、`closePinUnlock`、`closeTotpSetup`、`closeTotpUnlock`、`closeTransferConfirm`、`confirmPin`、`confirmTotpSetup`、`confirmTransfer`、`copyHbCreatedKeyword`、`copyHomeAddr`、`copyKw`、`copyNative`、`copyShareText`、`createGift`、`createNewWallet`、`deleteWalletRow`、`doImportWallet`、`doSwap`、`doTransfer`、`goHomeTransfer`、`goToPinConfirm`、`hideQR`、`loadTxHistory`、`openCustomizeAddr`、`openPinSettingsDialog`、`pinUnlockBackspace`、`pinUnlockClear`、`pinVerifyEnterWallet`、`promptWalletNotifications`、`setSwapMax`、`shareHbCreatedKeyword`、`shareKw`、`shareSuccess`、`showHbQR`、`startVerify`、`submitClaim`、`submitTotpUnlock`、`wwHideHbSuccessOverlay`、`wwOpenBackupFromSettings`、`wwSwapRecordsToast`。
- **id="page-*"（22）**：`page-welcome`、`page-password-restore`、`page-create`、`page-key`、`page-key-verify`、`page-pin-setup`、`page-pin-confirm`、`page-pin-verify`、`page-home`、`page-addr`、`page-transfer`、`page-swoosh`、`page-transfer-success`、`page-settings`、`page-swap`、`page-import`、`page-hongbao`、`page-hb-keyword`、`page-claim`、`page-claimed`、`page-hb-records`、`page-faq`。
- **data-ww-go（12）**：`page-welcome`、`page-password-restore`、`page-create`、`page-import`、`page-faq`、`page-key-verify`、`page-pin-setup`、`page-settings`、`page-home`、`page-claim`、`page-hb-records`、`page-hongbao`。
- **wallet.css**：`{` 与 `}` 各 330，花括号平衡。

## STEP 2 摘要
- **脚本顺序**：`js/storage.js` → `core/security.js` / `core/wallet.js` → `wallet.core.js` → `wallet.ui.js` → `wallet.addr.js` → `wallet.tx.js` → `wallet.runtime.js` → `wallet.dom-bind.js`，与依赖一致。
- **全局覆盖**：`goTo`、`goTab`、`doTransfer` 等由 `wallet.runtime.js` 最终定义；属已知行为。

## STEP 3 摘要
- 对 `JSON.parse`、`getElementById` 链式使用等抽样：`goTo('page-home')` 已对无钱包数据时重定向 `page-welcome` 等路径做保护；未发现需单独列为本轮 **P1** 的新崩溃路径。

## STEP 4 说明
- 使用脚本对 `wallet.html` 提取 `data-ww-fn` / `data-ww-go` / `page-*`，并在 `wallet.ui.js` + `wallet.runtime.js` 中校验函数定义与 `wwExposeDataWwFnHandlers` 显式导出。

## STEP 5–6
- 未选出需代码修复的最高优先级 **P0–P2** 项；无需应用 patch。
