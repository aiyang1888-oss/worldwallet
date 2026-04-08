# Round 5 修复报告 - 2026-04-08 09:46

## 发现的问题
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 重复定义 `selectTransferCoin` 及 `window.selectTransferCoin` 赋值；运行时已以后加载脚本与 `wwExposeDataWwFnHandlers` 为单一来源，UI 侧副本增加体积与维护成本（延续 round_4「剩余问题」）。

## 修复内容
- 文件：wallet.ui.js
- 函数：selectTransferCoin（删除 UI 侧重复实现）
- 修改：移除与 runtime 等价的 `selectTransferCoin` 函数及紧随其后的 `window.selectTransferCoin = selectTransferCoin`，由 `wallet.runtime.js` 中的实现与显式挂窗统一提供。

## 修改文件
- wallet.ui.js

## 剩余问题
- [P3] `wallet.ui.js` 仍可能与 `wallet.runtime.js` 存在其它转账辅助重复块（如 `getRecentTransferAddrs` 等），若需单一来源可继续收敛。
- [P3] 精简 HTML 仍无独立节点：`page-transfer-success`、`page-swoosh`、`page-hb-keyword`、`page-verify-success` 等；`goTo` 已对缺失 id 回退，可按产品需求补 DOM。

## 测试结果
- TEST-A: PASS — `data-ww-fn="selectTransferCoin"` 对应运行时 `selectTransferCoin`（`wallet.runtime.js`）并由 `wwExposeDataWwFnHandlers` 挂到 `window`。
- TEST-B: PASS — `wallet.html` 中无 `data-ww-go` 属性。
- TEST-C: PASS — 所列核心函数在合并后的 `wallet.ui.js` / `wallet.runtime.js` 中均有非空实现。
