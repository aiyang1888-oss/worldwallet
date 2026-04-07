# Round 1 修复报告 - 2026-04-08 03:17

## 发现的问题
- [P3] `wallet.runtime.js` 启动时对已不存在的 DOM 元素 `#welcomeLangGrid` 执行 `scrollTop=0`，为历史欢迎页残留逻辑，无功能影响但增加噪音。

## 架构与扫描摘要（STEP 1–4）
- **data-ww-fn**：共 43 处绑定；均在 `wallet.ui.js` / `wallet.addr.js` / `wallet.tx.js` / `wallet.runtime.js` 等脚本中通过全局 `function` 定义，并由 `wallet.runtime.js` 末尾 `wwExposeDataWwFnHandlers` 挂到 `window`（`deleteWalletRow` 等在 `wallet.dom-bind.js` 中有特判）。
- **id="page-*"**：共 20 个页面块（含 `page-welcome`、`page-password-restore`、`page-home` 等）。
- **data-ww-go**：全部目标均有对应 `id="page-…"`。
- **wallet.css**：花括号计数 330/330，平衡。
- **TEST-A**：通过（每个 `data-ww-fn` 均有对应全局实现）。
- **TEST-B**：通过（每个 `data-ww-go` 目标页存在）。
- **TEST-C**：所列核心函数均非空；`createGift` 实现在 `wallet.ui.js`（runtime 仅做 `typeof createGift === 'function'` 暴露）。

## 修复内容
- 文件：`wallet.runtime.js`
- 函数：启动初始化（全局顶层，原 `welcomeLangGrid` 一行）
- 修改：删除对已移除欢迎语网格元素的 `scrollTop` 初始化。

## 修改文件
- `wallet.runtime.js`
- `reports/round_1.md`

## 剩余问题
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 存在大量同名全局函数，由后加载的 runtime 覆盖；属既有架构，未在本轮改动。
- 无 P0/P1 阻塞项（本轮扫描范围内）。

## 测试结果
- TEST-A: PASS — 全部 `data-ww-fn` 均有全局函数实现并可由 runtime 暴露到 `window`。
- TEST-B: PASS — 全部 `data-ww-go` 指向的 `page-*` 存在于 `wallet.html`。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`sendTransfer`、`createGift`、`claimGift`、`openSend`、`openReceive` 均有非空实现（`createGift` 在 `wallet.ui.js`）。
