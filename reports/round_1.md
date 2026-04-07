# Round 1 修复报告 - 2026-04-07 20:15

## 发现的问题
- [P3] `wallet.runtime.js` 中 `shakeTransferAmountTooHigh` 被完整定义两次，后者覆盖前者，首段为死代码，增加维护成本且易误导。

## 修复内容
- 文件：wallet.runtime.js
- 函数：shakeTransferAmountTooHigh（移除较早的重复定义，保留使用 `#transferAmountBox` 与 `wt-transfer-shake` 的实现）
- 修改：删除未再被解析生效的第一段 `shakeTransferAmountTooHigh`，行为与修复前一致（此前仅最后一段定义生效）。

## 修改文件
- wallet.runtime.js

## 剩余问题
- 无

## 测试结果
- TEST-A: PASS — 所有 `data-ww-fn` 均在 JS 中有对应全局函数或 `window` 赋值。
- TEST-B: PASS — 所有 `data-ww-go` 目标均在 `wallet.html` 中存在对应 `id="page-*"`。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`sendTransfer`（别名）、`createGift`、`claimGift`（别名）、`openSend`（别名）、`openReceive` 均具非空实现或正确别名。
