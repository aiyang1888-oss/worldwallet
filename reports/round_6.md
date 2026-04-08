# Round 6 修复报告 - 2026-04-08 08:26

## 发现的问题
- [P1] `wallet.runtime.js` 中 `onClaimInput`、`fillKeyword` 对 `claimInput` / `claimInputBox` 直接链式访问，无 null 检查；在节点缺失或脚本早于 DOM 执行时会抛 `TypeError`（上一轮「剩余问题」已指出）。
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 大量同名函数，后加载文件覆盖前者（架构债务，未在本轮改动）。
- [P3] `wallet.html` 中 `#homeBalanceChartWrap` 仍重复 `class` 属性（`class="..." class="u5"`），第二个类名可能被忽略。

## 修复内容
- 文件：wallet.runtime.js
- 函数：onClaimInput、fillKeyword
- 修改：在读取/写入输入框与边框样式前校验 `getElementById` 结果，缺失则安全返回。

## 修改文件
- wallet.runtime.js

## 剩余问题
- [P3] 双文件同名函数覆盖、`#homeBalanceChartWrap` 重复 class 未合并。
- [P3] `switchHbType` / `selectHbType` 等在精简 DOM 无对应节点时若被调用仍可能抛错（入口较少）。

## 测试结果
- TEST-A: PASS — `data-ww-fn` 仅 `selectTransferCoin`；`wallet.runtime.js` 末尾 `wwExposeDataWwFnHandlers` 将其挂到 `window`。
- TEST-B: PASS — `wallet.html` 中无 `data-ww-go` 属性。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`sendTransfer`、`createGift`、`claimGift`、`openSend`、`openReceive` 在 `wallet.ui.js` / `wallet.runtime.js` 中均有非空函数体。
