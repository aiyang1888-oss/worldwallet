# Round 1 修复报告 - 2026-04-07 20:00

## 发现的问题
- [P2] `wallet.ui.js` 中 `copyKw` 在 `#copyKwBtn` 或内部 label 缺失时会抛错；与 `wallet.runtime.js` 中已覆盖实现不一致，脚本顺序变化时存在风险。

## 修复内容
- 文件：wallet.ui.js
- 函数：copyKw
- 修改：为复制口令按钮增加空节点判断，与 runtime 侧防御性逻辑一致。

## 修改文件
- wallet.ui.js

## 剩余问题
- 无（本轮静态测试 TEST-A/B/C 均通过；架构上 wallet.ui.js 与 wallet.runtime.js 仍存在大量同名全局函数，由加载顺序决定最终行为，未在本轮改动。）

## 测试结果
- TEST-A: PASS — `data-ww-fn` 共 41 个，均在合并脚本中存在对应 `function` / `async function` / `window.*` 定义。
- TEST-B: PASS — 所有 `data-ww-go` 目标在 `wallet.html` 中均有 `id="page-*"` 页面节点。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`sendTransfer`（映射 `confirmTransfer`）、`createGift`、`claimGift`（映射 `submitClaim`）、`openSend`（映射 `goHomeTransfer`）、`openReceive` 均含有效函数体。
