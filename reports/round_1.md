# Round 1 修复报告 - 2026-04-07

## 发现的问题
- [P1] `submitPageRestorePin` / `submitPinUnlock` 未将 PIN 规范为 6 位数字（与 `pinVerifyEnterWallet` 不一致），粘贴含空格或非数字字符时可能误判为 PIN 错误。

## 修复内容
- 文件：wallet.runtime.js
- 函数：submitPageRestorePin, submitPinUnlock
- 修改：使用与验证页相同的 `replace(/\D/g,'').slice(0,6)` 规范化输入；不足 6 位时提示「请输入 6 位数字 PIN」并触发抖动反馈。

## 修改文件
- wallet.runtime.js

## 剩余问题
- 无（TEST-A/B/C 在本次扫描下均通过）

## 测试结果
- TEST-A: PASS — 所有 `data-ww-fn` 均在 `wwExposeDataWwFnHandlers` 中挂到 `window` 或由全局函数提供
- TEST-B: PASS — 所有 `data-ww-go` 目标在 `wallet.html` 中均有对应 `id="page-*"`
- TEST-C: PASS — goToPinConfirm、confirmPin、pinVerifyEnterWallet、shareSuccess、copyKw、shareKw、showHbQR、copyShareText、sendTransfer/claimGift/openSend/openReceive（别名）均有非空实现
