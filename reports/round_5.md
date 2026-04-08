# Round 5 修复报告 - 2026-04-08 08:23

## 发现的问题
- [P1] `submitClaim` 假定 `ww_hongbaos` 中每条记录均为 runtime「完整版」结构（`claimed` 为数组等）；`wallet.ui.js` 的 `createGift` 写入的精简结构使用 `claimed: false`（布尔），访问 `hb.claimed.length` / `.find` 会抛 `TypeError`，领取流程崩溃。
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 仍存在大量同名函数，后加载覆盖前者（与 Round 4 一致，架构债务）。
- [P3] `wallet.html` 中 `#homeBalanceChartWrap` 存在重复 `class` 属性（`class="..." class="u5"`），第二个类名可能被忽略。

## 修复内容
- 文件：wallet.runtime.js
- 函数：submitClaim
- 修改：在过期/领完校验前将精简版礼物记录规范化为数组型 `claimed`，并补全缺省的 `expireAt`、`count`、`totalAmount`、`perPerson`（与 `amount` 对齐），避免对布尔值取 `.length`。

## 修改文件
- wallet.runtime.js

## 剩余问题
- [P3] 同名函数双文件覆盖、DOM 可选链与 `_safeEl` 未在全项目统一。
- [P3] `switchHbType` / `selectHbType` 等在精简 DOM 无对应节点时若被调用仍可能抛错（当前入口较少）。
- [P1] `fillKeyword` 等对 `claimInput` 仍为直接链式访问（未纳入本轮单点修复）。

## 测试结果
- TEST-A: PASS — `data-ww-fn` 仅 `selectTransferCoin`；`wallet.runtime.js` 末尾 `wwExposeDataWwFnHandlers` 将其挂到 `window`。
- TEST-B: PASS — `wallet.html` 中无 `data-ww-go` 属性。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`sendTransfer`、`createGift`、`claimGift`、`openSend`、`openReceive` 在 `wallet.ui.js` / `wallet.runtime.js` 中均有非空函数体。
