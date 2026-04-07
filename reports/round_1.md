# Round 1 修复报告 - 2026-04-08 01:46

## 发现的问题

- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 存在大量同名顶层函数，最终以后加载的 `wallet.runtime.js` 为准；长期维护需避免双份逻辑分叉。

## 修复内容

- 文件：无
- 函数：无
- 修改：本轮 STEP 4（TEST-A/B/C）与架构扫描均无 P0/P1 阻塞项，无需改代码

## 修改文件

- 无

## 剩余问题

- 无

## 测试结果

- TEST-A: PASS — `wallet.html` 中全部 `data-ww-fn`（41 处）均可在加载链中找到对应全局函数，且 `wallet.runtime.js` 中 `wwExposeDataWwFnHandlers` / `wwExposeCoreAliases` 将所需名称挂到 `window`，与内联捕获阶段委托及 `wallet.dom-bind.js` 一致。
- TEST-B: PASS — 全部 `data-ww-go` 目标（如 `page-welcome`、`page-password-restore`、`page-home`、`page-claim` 等）均存在同名 `id="page-…"` 容器。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`sendTransfer`、`createGift`、`claimGift`、`openSend`、`openReceive` 均含实质逻辑（含 `sendTransfer`/`claimGift`/`openSend`/`openReceive` 别名包装）。

## STEP 1 摘录（扫描）

- **data-ww-fn**：41 处（去重后同名按钮函数与 `wwExposeDataWwFnHandlers` 一致）。
- **id="page-*"`**：`page-welcome`、`page-password-restore`、`page-create`、`page-key`、`page-key-verify`、`page-pin-setup`、`page-pin-confirm`、`page-pin-verify`、`page-home`、`page-addr`、`page-transfer`、`page-swoosh`、`page-transfer-success`、`page-settings`、`page-swap`、`page-import`、`page-hongbao`、`page-hb-keyword`、`page-claim`、`page-claimed`、`page-hb-records`、`page-faq`。
- **data-ww-go**：均指向已存在的 `page-*` id。
- **wallet.runtime.js + wallet.ui.js**：顶层 `function` / `window.*` 由 runtime 末尾统一暴露 `data-ww-fn` 所需名称；`copyHomeAddr` 等在 `wallet.addr.js`。
- **wallet.css 花括号**：`{` 与 `}` 均为 330，平衡。
