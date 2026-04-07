# Round 1 修复报告 - 2026-04-08

## 发现的问题

- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 存在大量同名全局函数，加载顺序以后者为准；属架构冗余，非本轮功能阻塞项。
- [P3] `wallet.html` 中部分组件使用内联样式，与 `wallet.css` 并存，维护成本略高。

## 修复内容

- 文件：无（静态审查与自动化核对未要求修改代码）
- 函数：无
- 修改：本轮仅新增本报告；核心逻辑、绑定与导航已一致

## 修改文件

- `reports/round_1.md`

## 剩余问题

- 无（P3 项可作为后续重构候选，不阻碍发布）

## 测试结果

- TEST-A: PASS — `data-ww-fn` 共 41 处，均在 `wallet.runtime.js` 的 `wwExposeDataWwFnHandlers` / 别名块或先加载脚本中具备对应全局函数；`node` 核对无缺失项。
- TEST-B: PASS — `data-ww-go` / `data-ww-go-with-opts` / `data-ww-go-keyback` 目标页均在 `wallet.html` 中存在 `id="page-*"`。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`sendTransfer`、`createGift`、`claimGift`、`openSend`、`openReceive` 函数体均非空（含别名包装）。

### STEP 1 摘要

- **data-ww-fn（41）**：含 `createNewWallet`、`startVerify`、`checkVerify`、`goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`promptWalletNotifications`、`copyHomeAddr`、`goHomeTransfer`、`loadTxHistory`、`copyNative`、`openCustomizeAddr`、`hideQR`、`doTransfer`、`closeTransferConfirm`、`confirmTransfer`、`shareSuccess`、`openPinSettingsDialog`、`wwOpenBackupFromSettings`、`deleteWalletRow`、`wwSwapRecordsToast`、`setSwapMax`、`doSwap`、`doImportWallet`、`createGift`、`copyHbCreatedKeyword`、`shareHbCreatedKeyword`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`submitClaim`、`pinUnlockBackspace`、`pinUnlockClear`、`closePinUnlock`、`submitTotpUnlock`、`closeTotpUnlock`、`confirmTotpSetup`、`closeTotpSetup`、`closePinSetupOverlay`、`wwHideHbSuccessOverlay`。
- **id="page-*"（22）**：`page-welcome`、`page-password-restore`、`page-create`、`page-key`、`page-key-verify`、`page-pin-setup`、`page-pin-confirm`、`page-pin-verify`、`page-home`、`page-addr`、`page-transfer`、`page-swoosh`、`page-transfer-success`、`page-settings`、`page-swap`、`page-import`、`page-hongbao`、`page-hb-keyword`、`page-claim`、`page-claimed`、`page-hb-records`、`page-faq`。
- **data-ww-go 目标页**：与上述列表一致，无孤立目标。
- **wallet.css 花括号**：`{` 与 `}` 均为 330，平衡。

### STEP 2 摘要

- **脚本顺序**：`ethers` → `storage.js` → `core/*` → `wallet.core.js` → `wallet.ui.js` → `wallet.addr.js` → `wallet.tx.js` → `wallet.runtime.js` → `wallet.dom-bind.js`；依赖关系合理。
- **全局冲突**：同名函数以后加载的 `wallet.runtime.js` 为准；`wallet.addr.js` / `wallet.tx.js` 提供的仅声明于前序文件的函数仍保留。

### STEP 3 摘要

- 抽查：`goTo('page-home')` 前对 `wwWalletHasAnyChainAddress` / `loadWallet` 有防护；`JSON.parse(localStorage…)` 在关键路径多带 `try/catch`；`confirmPin` / `pinVerifyEnterWallet` 等 `async` 路径含 `await`；未发现需立即修复的 P1 级单点崩溃模式。
