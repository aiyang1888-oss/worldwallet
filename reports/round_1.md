# Round 1 修复报告 - 2026-04-07 19:15

## STEP 1 摘要

- **data-ww-fn（wallet.html）**：共 43 处绑定，涵盖 `createNewWallet`、`startVerify`、`checkVerify`、`goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`doTransfer`、`confirmTransfer`、`shareSuccess`、`createGift`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`submitClaim`、`submitPageRestorePin`（由 `wallet.dom-bind.js` 绑定表单）等。
- **id="page-*"**：`page-welcome`、`page-password-restore`、`page-create`、`page-key`、`page-key-verify`、`page-pin-setup`、`page-pin-confirm`、`page-pin-verify`、`page-home`、`page-addr`、`page-transfer`、`page-swoosh`、`page-transfer-success`、`page-settings`、`page-swap`、`page-import`、`page-hongbao`、`page-hb-keyword`、`page-claim`、`page-claimed`、`page-hb-records`、`page-faq`。
- **data-ww-go**：目标页均存在对应 `id="page-…"`。
- **wallet.runtime.js + wallet.ui.js**：存在大量顶层 `function` / `window.*`；`wallet.runtime.js` 末尾 `wwExposeDataWwFnHandlers` / `wwExposeCoreAliases` 将关键 `data-ww-fn` 与别名（`sendTransfer`、`claimGift`、`openSend`、`openReceive`）挂到 `window`。
- **wallet.css**：花括号计数 `{` 329、`}` 329，平衡。

## 发现的问题

- [P3] **双份巨型脚本**：`wallet.ui.js` 与 `wallet.runtime.js` 均定义大量同名全局函数，运行时时序以后者为准，增加维护与 diff 成本。
- [P3] **事件绑定**：`wallet.html` 文末内联 `data-ww-fn` 捕获阶段委托与 `wallet.dom-bind.js` 冒泡阶段 `handleWwClick` 可能叠加（内联中部分路径会 `stopPropagation`）；建议真机确认是否重复触发。
- [P3] **全局命名**：多文件顶层函数并存，依赖加载顺序（`wallet.html` 中 script 顺序）保证最终行为。

## 修复内容

- 本轮静态测试（TEST-A/B/C）全部通过，**未对业务代码做结构性修改**；仅新增本报告文件。

## 修改文件

- `reports/round_1.md`

## 剩余问题

- 无阻塞性 P0/P1（见上 P3 项，可按后续轮次逐步收敛）。

## 测试结果

- TEST-A: PASS — 每个 `data-ww-fn` 均在工程 JS 中有对应 `function` / `async function` / `window.*` 暴露。
- TEST-B: PASS — 每个 `data-ww-go` 目标在 `wallet.html` 中存在 `id="page-…"`。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`createGift` 在 `wallet.runtime.js` / `wallet.ui.js` 中有实质函数体；`sendTransfer`、`claimGift`、`openSend`、`openReceive` 由 `wallet.runtime.js` 中 `wwExposeCoreAliases` 映射到既有实现。
