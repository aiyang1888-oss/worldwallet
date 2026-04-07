# Round 1 修复报告 - 2026-04-07 20:46

## 发现的问题
- [P1] `wallet.core.js` 中 `markBackupDone` 对 `localStorage` 中 `ww_wallet` 使用 `JSON.parse` 未做异常处理，数据损坏时会导致整段逻辑抛错并中断备份状态更新（与 `wallet.runtime.js` 中已存在的防护不一致）。

## 修复内容
- 文件：`wallet.core.js`
- 函数：`markBackupDone`
- 修改：解析失败或得到非对象时回退为空对象再写入 `backedUp`，避免异常中断 UI 回调。

## 修改文件
- `wallet.core.js`

## 剩余问题
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 存在大量同名全局函数，依赖加载顺序后者覆盖前者，长期维护易产生行为分叉（本次未改动架构）。
- [P3] 部分 `JSON.parse` / DOM 访问模式可在后续轮次继续收紧（非本轮阻断项）。

## 测试结果
- TEST-A: PASS — 所有 `data-ww-fn` 在合并后的核心 JS 中均有 `function` 或 `window.*` 绑定。
- TEST-B: PASS — 所有 `data-ww-go` 目标在 `wallet.html` 中均有对应 `id="page-*"`。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`createGift` 均有非空函数体；`sendTransfer`、`claimGift`、`openSend`、`openReceive` 由 `wallet.runtime.js` 中 `wwExposeCoreAliases` 映射到既有实现。
