# Round 1 修复报告 - 2026-04-08 00:54

## 发现的问题
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 存在同名全局函数（如 `goTo`、`doTransfer`）；加载顺序以后者为准，属已知架构，非本轮阻断项。
- [P3] `wallet.html` 中除 `wallet.dom-bind.js` 外另有捕获阶段 `data-ww-fn` 委托脚本；与底栏委托互补，静态检查未见冲突。

## 修复内容
- 文件：无（本轮静态与绑定测试均通过，无需改业务代码）
- 函数：—
- 修改：—

## 修改文件
- `reports/round_1.md`（本报告）

## 剩余问题
- 无

## 测试结果
- TEST-A: PASS — 全部 41 个 `data-ww-fn` 在 `wallet.runtime.js` / `wallet.ui.js` / `wallet.addr.js` / `wallet.tx.js` / `wallet.core.js` 中存在对应函数定义。
- TEST-B: PASS — 全部 `data-ww-go` 目标在 `wallet.html` 中存在 `id="page-*"` 页面节点。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`createGift`、`submitClaim` 均有非空实现；`sendTransfer`、`claimGift`、`openSend`、`openReceive` 在 `wallet.runtime.js` 末尾通过别名暴露。
