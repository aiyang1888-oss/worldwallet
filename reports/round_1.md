# Round 1 修复报告 - 2026-04-08

## 发现的问题
- [P0] `goTo(pageId)` 在目标 `#pageId` 不存在时仍先执行「隐藏全部 `.page`」再 `getElementById`；JS 中多处 `goTo('page-transfer-success')`、`goTo('page-swoosh')` 等指向的页面在精简 `wallet.html` 中不存在，导致转账成功等流程后界面被清空为白屏。
- [P3] `wallet.runtime.js` 与 `wallet.ui.js` 均定义 `selectTransferCoin`（后者先加载、后者被运行时版本覆盖）；`wallet.css` 花括号已平衡（326/326）。
- [P3] `wallet.html` 无 `data-ww-go`；`data-ww-fn` 仅 `selectTransferCoin`。

## 修复内容
- 文件：wallet.ui.js
- 函数：goTo
- 修改：先解析目标节点，若不存在则告警并回退到 `page-home`（若存在），避免在未确认目标页面前清空所有页面。

## 修改文件
- wallet.ui.js

## 剩余问题
- 精简版 HTML 仍缺少 `page-transfer-success`、`page-swoosh`、`page-hb-keyword`、`page-verify-success` 等完整页面结构；现已通过回退首页避免白屏，若需专用成功/动画页可后续补 DOM。
- 其他架构与静态分析问题未在本轮一并改动。

## 测试结果
- TEST-A: PASS — `data-ww-fn="selectTransferCoin"` 对应 `window.selectTransferCoin`（`wallet.ui.js` 赋值 + `wallet.runtime.js` 末尾 `wwExposeDataWwFnHandlers` 再次挂载）。
- TEST-B: PASS — 无 `data-ww-go` 属性，无待校验导航目标。
- TEST-C: PASS — 所列核心函数在 `wallet.ui.js` / `wallet.runtime.js` 中均有非空实现（非仅注释）。
