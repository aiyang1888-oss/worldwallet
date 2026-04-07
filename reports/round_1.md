# Round 1 修复报告 - 2026-04-07 21:03

## 发现的问题

- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 存在大量同名全局函数；`wallet.runtime.js` 后加载并覆盖前者，增加维护成本与行为不一致风险（已知架构取舍）。
- [P3] `wallet.runtime.js` 与 `wallet.tx.js` 均定义 `loadTxHistory`，运行时为最终生效版本。
- [P1/P2] 静态抽查：`wallet.runtime.js` 中部分 `JSON.parse(localStorage…)` 未统一包在 try-catch（依赖合法 JSON 或仅 demo 路径）；未在本次自动化测试中触发失败。

## 修复内容

- 文件：无（本轮未发现需改代码的 P0/P1 阻塞项）
- 函数：—
- 修改：—

## 修改文件

- `reports/round_1.md`（本报告）

## 剩余问题

- 可考虑长期收敛 `wallet.ui.js` / `wallet.runtime.js` 重复实现，或明确「仅 runtime 为权威」并删减死代码（非本轮必须）。

## 测试结果

- TEST-A: PASS — `data-ww-fn` 共 41 个唯一名，均在 `wallet.ui.js` / `wallet.addr.js` / `wallet.tx.js` / `wallet.runtime.js` 等核心脚本中以 `function X` 或经 `wallet.runtime.js` 末尾 `wwExposeDataWwFnHandlers` 挂到 `window`。
- TEST-B: PASS — 全部 `data-ww-go` 目标均存在对应 `id="page-…"` 页面节点。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`confirmTransfer`（`sendTransfer` 别名）、`createGift`、`submitClaim`（`claimGift` 别名）、`goHomeTransfer`（`openSend` 别名）、`openReceive`（runtime 内联）均存在且函数体非空。
