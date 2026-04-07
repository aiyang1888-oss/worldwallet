# Round 1 修复报告 - 2026-04-08 02:02

## 发现的问题
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 中存在大量同名全局函数，后者后加载会覆盖前者；当前关键路径（`goTo`、`renderTxHistoryFromCache`、`confirmPin` 等）以 `wallet.runtime.js` 为准，需在后续迭代中收敛重复实现以免行为分叉。
- [P3] 部分 `JSON.parse(localStorage…)` 未统一包在 try-catch（静态抽查）；多数已在 try 块内。

## 修复内容
- 文件：无代码变更（本轮静态与绑定测试均通过，未引入功能性补丁）
- 函数：—
- 修改：—

## 修改文件
- `reports/round_1.md`（本报告）

## 剩余问题
- 与上「发现的问题」中 P3 项相同：双文件重复定义的技术债，建议长期合并或明确「唯一实现源」。

## 测试结果
- TEST-A: PASS — `wallet.html` 中 41 个 `data-ww-fn` 均在 `wallet.runtime.js` 末尾 `window.*` 暴露块中有对应赋值（`node` 脚本校验 `missing: NONE`）。
- TEST-B: PASS — 全部 12 个 `data-ww-go` 目标在 `wallet.html` 中存在同名 `id="page-*"`。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`sendTransfer`（别名→`confirmTransfer`）、`createGift`（`wallet.ui.js`）、`claimGift`（别名→`submitClaim`）、`openSend`（别名→`goHomeTransfer`）、`openReceive` 在 `wallet.runtime.js` / `wallet.ui.js` 中均有非空可执行函数体。
