# Round 1 修复报告 - 2026-04-08 01:54

## 发现的问题

- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 均定义顶层 `goTo`；运行时常以较晚加载的 `wallet.runtime.js` 为准，双份实现存在分叉风险。
- [P3] `wallet.ui.js` 中 `page-home` 分支对 `wwWalletHasAnyChainAddress` 的调用未做 `typeof === 'function'` 守卫，与 `wallet.runtime.js` 不一致；若脚本顺序或拆分变更，存在潜在 `TypeError`。

## 修复内容

- 文件：`wallet.ui.js`
- 函数：`goTo`
- 修改：首页底栏显示判断与 `wallet.runtime.js` 对齐，先校验 `wwWalletHasAnyChainAddress` 为函数再调用。

## 修改文件

- `wallet.ui.js`

## 剩余问题

- 无（`goTo` 双份逻辑仍为长期维护项，建议后续合并为单一实现）

## 测试结果

- TEST-A: PASS — `wallet.html` 中 41 个去重后的 `data-ww-fn` 均在加载链（含 `wallet.addr.js` / `wallet.tx.js` / `wallet.ui.js` 等）中有对应全局函数；`wallet.runtime.js` 末尾 `wwExposeDataWwFnHandlers` 将所需名称挂到 `window`。
- TEST-B: PASS — 全部 `data-ww-go` 目标（12 个去重）均存在同名 `id="page-…"` 容器。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`sendTransfer`、`createGift`、`claimGift`、`openSend`、`openReceive` 函数体均含实质逻辑（含末尾别名包装）。

## STEP 1 摘录（扫描）

- **data-ww-fn（去重 41）**：`checkVerify`、`closePinSetupOverlay`、`closePinUnlock`、`closeTotpSetup`、`closeTotpUnlock`、`closeTransferConfirm`、`confirmPin`、`confirmTotpSetup`、`confirmTransfer`、`copyHbCreatedKeyword`、`copyHomeAddr`、`copyKw`、`copyNative`、`copyShareText`、`createGift`、`createNewWallet`、`deleteWalletRow`、`doImportWallet`、`doSwap`、`doTransfer`、`goHomeTransfer`、`goToPinConfirm`、`hideQR`、`loadTxHistory`、`openCustomizeAddr`、`openPinSettingsDialog`、`pinUnlockBackspace`、`pinUnlockClear`、`pinVerifyEnterWallet`、`promptWalletNotifications`、`setSwapMax`、`shareHbCreatedKeyword`、`shareKw`、`shareSuccess`、`showHbQR`、`startVerify`、`submitClaim`、`submitTotpUnlock`、`wwHideHbSuccessOverlay`、`wwOpenBackupFromSettings`、`wwSwapRecordsToast`。
- **id="page-*"`**：`page-welcome`、`page-password-restore`、`page-create`、`page-key`、`page-key-verify`、`page-pin-setup`、`page-pin-confirm`、`page-pin-verify`、`page-home`、`page-addr`、`page-transfer`、`page-swoosh`、`page-transfer-success`、`page-settings`、`page-swap`、`page-import`、`page-hongbao`、`page-hb-keyword`、`page-claim`、`page-claimed`、`page-hb-records`、`page-faq`。
- **data-ww-go（去重 12）**：均指向已存在的 `page-*` id。
- **wallet.runtime.js + wallet.ui.js**：大量顶层 `function`；`window.*` 赋值集中在 runtime 末尾 IIFE。
- **wallet.css 花括号**：`{` 与 `}` 均为 330，平衡。
