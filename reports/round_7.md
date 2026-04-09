# Round 7 修复报告 - 2026-04-08

## 发现的问题
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 仍重复定义 `getRecentTransferAddrs`、`submitClaim`（与 Round 6 已处理的 `copyKw` 同类），运行后以 runtime 为准，UI 侧副本增加维护成本与行为漂移风险。

## 修复内容
- 文件：wallet.ui.js
- 函数：getRecentTransferAddrs、submitClaim（删除 UI 侧重复实现）
- 修改：移除与 runtime 等价的两个函数体，由 `wallet.runtime.js` 中的实现作为唯一来源；保留 `WW_RECENT_ADDR_KEY` 与 `saveRecentTransferAddr`（其调用在运行时解析为 runtime 的 `getRecentTransferAddrs`）。

## 修改文件
- wallet.ui.js

## 剩余问题
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 仍存在其它重复块（如 `getTransferContacts` / `deleteWallet` / `goTo` 等），若需单一来源可继续收敛。
- [P3] 精简 HTML 仍无独立节点：`page-transfer-success`、`page-swoosh`、`page-hb-keyword`、`page-verify-success` 等；可按产品需求补 DOM。

## 测试结果
- TEST-A: PASS — `data-ww-fn` 仅 `selectTransferCoin`；`wallet.runtime.js` 中 `wwExposeDataWwFnHandlers` 将 `window.selectTransferCoin` 挂出。
- TEST-B: PASS — `wallet.html` 中无 `data-ww-go` 属性（无导航目标需校验）。
- TEST-C: PASS — 所列核心函数在 `wallet.ui.js` + `wallet.runtime.js` 合并后均有非空实现（`submitClaim` / `getRecentTransferAddrs` 仅以 runtime 为定义来源）。
