# Round 1 修复报告 - 2026-04-08

## 发现的问题
- [P1] `checkVerify` 中若 `verifyAnswers[pos]` 为 `undefined`/`null`，调用 `.toLowerCase()` 会抛错，导致整段验证逻辑中断。
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 存在大量同名函数，依赖脚本加载顺序由后者覆盖；`wallet.tx.js` 与 `wallet.runtime.js` 均定义 `confirmTransfer`，运行时为最终版本。
- [P3] CSS：`wallet.css` 花括号开闭数量一致（330/330）。

## 修复内容
- 文件：`wallet.runtime.js`
- 函数：`checkVerify`
- 修改：将 `verifyAnswers[pos]` 先规范为字符串再转小写，空值视为与输入不匹配而非抛异常。

## 修改文件
- `wallet.runtime.js`

## 剩余问题
- 无（本轮未将 P3 架构重复定义列为必须修复项）。

## 测试结果
- TEST-A: PASS — `wallet.html` 中全部 `data-ww-fn` 均在工程 JS 中有对应 `function` 定义，且 `wallet.runtime.js` 末尾对常用名显式挂到 `window`；脚本顺序下全局可调用。
- TEST-B: PASS — 全部 `data-ww-go` 目标在 `wallet.html` 中存在 `id="page-*"` 页面（含 `page-password-restore` 等）。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`sendTransfer`、`createGift`、`claimGift`、`openSend`、`openReceive` 均具非空实现（含别名包装函数体）。
