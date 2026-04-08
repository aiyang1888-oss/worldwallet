# Round 9 修复报告 - 2026-04-08 08:09

## 发现的问题
- [P1] `wallet.runtime.js` 中 `markBackupDone` 对 `localStorage` 的 `ww_wallet` 使用 `JSON.parse`，未防护非法 JSON，数据损坏时会在用户确认备份流程中抛错并中断。

## 修复内容
- 文件：`wallet.runtime.js`
- 函数：`markBackupDone`
- 修改：用 try-catch 解析并归一化为对象后再写入 `backedUp`，避免解析异常导致崩溃。

## 修改文件
- `wallet.runtime.js`

## 剩余问题
- `page-home` 上 `#homeBalanceChartWrap` 仍存在重复 `class` 属性（HTML 小问题，不影响脚本）。
- `wallet.core.js` 中同名 `markBackupDone` 仍为无防护解析；当前运行期以 `wallet.runtime.js` 后加载定义为准，若需双文件一致可后续同步。

## 测试结果
- TEST-A: PASS — `data-ww-fn` 仅 `selectTransferCoin`；`wallet.runtime.js` 末尾 `wwExposeDataWwFnHandlers` 将其挂到 `window`，且 `wallet.ui.js` 亦赋值 `window.selectTransferCoin`。
- TEST-B: PASS — `wallet.html` 中无 `data-ww-go` 属性。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`sendTransfer`、`createGift`、`claimGift`、`openSend`、`openReceive` 在加载链中均有非空实现（`wallet.ui.js` / `wallet.runtime.js`）。

验证：将 `localStorage.ww_wallet` 设为非法 JSON 字符串后，在助记词流程触发「已备份」相关逻辑（或控制台调用 `markBackupDone()`），应不再出现未捕获异常，且备份状态可正常写入。
