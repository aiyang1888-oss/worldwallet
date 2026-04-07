# Round 1 修复报告 - 2026-04-08 06:05

## 发现的问题
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 重复定义 `_resumeWalletAfterUnlock`、`continueAfterPinCheck`、`submitPinUnlock`、`closePinUnlock` 及 `wwB64Bytes`；脚本加载顺序下以后者为准，前者易造成误改与逻辑漂移（且旧版 `submitPinUnlock` 未统一规范化 6 位数字 PIN）。

## 修复内容
- 文件：`wallet.ui.js`
- 函数：移除上述重复实现（保留注释指向 `wallet.runtime.js`）
- 修改：删除与 runtime 重复的 PIN 解锁链，单一事实来源避免维护分叉

## 修改文件
- `wallet.ui.js`
- `reports/round_1.md`

## 剩余问题
- `continueAfterPinCheck` 在 `wallet.runtime.js` 中仍无任何调用点（历史遗留）；未在本轮删除，以免扩大范围。

## 测试结果
- TEST-A: PASS（`data-ww-fn` 均能在合并后的 JS 中以 `function`/`async function` 或 `window.` 赋值匹配）
- TEST-B: PASS（`data-ww-go` 目标均存在对应 `id="page-*"`）
- TEST-C: PASS（`goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`sendTransfer`、`createGift`、`claimGift`、`openSend`、`openReceive` 函数体均非空）
