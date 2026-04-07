# Round 1 修复报告 - 2026-04-08

## 发现的问题

- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 存在大量同名全局函数（后者覆盖前者），长期维护时需避免双份逻辑漂移；当前加载顺序下行为以 `wallet.runtime.js` 为准。
- [P3] 部分 `JSON.parse(localStorage…)` 路径未统一包在 try-catch 中，若本地存储损坏可能抛错（非本轮阻断）。

## 修复内容

- 文件：无（本轮静态与绑定测试已全部通过，未引入功能性代码变更）
- 函数：—
- 修改：—

## 修改文件

- `reports/round_1.md`（本报告）

## 剩余问题

- 无（与本轮 TEST-A/B/C 相关的阻断项）；可选后续：收敛重复函数、加固 JSON 解析。

## 测试结果

- TEST-A: PASS — `wallet.html` 中 41 个唯一 `data-ww-fn` 均在 `wallet.ui.js` / `wallet.runtime.js` / `wallet.addr.js` / `wallet.tx.js` 等中存在对应 `function` 或经 `wallet.runtime.js` 末尾 `wwExposeDataWwFnHandlers` / `wwExposeCoreAliases` 挂到 `window`。
- TEST-B: PASS — 所有 `data-ww-go` 目标（`page-create`、`page-password-restore`、`page-import` 等）均存在对应 `id="page-*"`。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`createGift` 均有实质函数体；`sendTransfer`/`claimGift`/`openSend`/`openReceive` 由运行时别名映射至 `confirmTransfer`、`submitClaim`、`goHomeTransfer`、`goTab('tab-addr')`。
