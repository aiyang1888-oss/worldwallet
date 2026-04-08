# Round 6 修复报告 - 2026-04-08 09:49

## 发现的问题
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 重复定义 `copyKw`；运行后以 `wallet.runtime.js` 为准，UI 侧副本与 round_5 已处理的 `selectTransferCoin` 同类，增加维护成本与行为漂移风险。

## 修复内容
- 文件：wallet.ui.js
- 函数：copyKw（删除 UI 侧重复实现）
- 修改：移除与 runtime 等价的 `copyKw` 函数体，由 `wallet.runtime.js` 中的实现作为唯一来源。

## 修改文件
- wallet.ui.js

## 剩余问题
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 仍可能存在其它重复转账/礼物辅助块（如 `getRecentTransferAddrs` / `submitClaim` 等），若需单一来源可继续收敛。
- [P3] 精简 HTML 仍无独立节点：`page-transfer-success`、`page-swoosh`、`page-hb-keyword`、`page-verify-success` 等；`goTo`/转账成功流已对缺失 id 回退，可按产品需求补 DOM。

## 测试结果
- TEST-A: PASS — `data-ww-fn="selectTransferCoin"` 在合并脚本中存在 `selectTransferCoin`，且 runtime 中 `wwExposeDataWwFnHandlers` 将 `window.selectTransferCoin` 挂出。
- TEST-B: PASS — `wallet.html` 中无 `data-ww-go` 属性。
- TEST-C: PASS — 所列核心函数在 `wallet.ui.js` + `wallet.runtime.js` 合并后均有非空实现（含 `copyKw` 仅保留于 runtime）。
