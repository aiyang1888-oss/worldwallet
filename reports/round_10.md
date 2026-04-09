# Round 10 修复报告 - 2026-04-08 10:00

## 发现的问题
- [P1] 设置页「删除钱包」使用内联脚本：仅移除部分 `localStorage` 键、将 `REAL_WALLET` 置空并跳转，未走 `deleteWallet()`，因此不调用 `wwCleanupMemory()`、不清理 `ww_wallet_nickname` / `ww_ref_install_credited` 等，与产品内统一删除流程不一致，易造成会话与内存状态残留。

## 修复内容
- 文件：wallet.html
- 函数：（无）— 将行内 `onclick` 改为调用全局 `deleteWallet()`
- 修改：设置行改为 `onclick="deleteWallet()"`，由 `wallet.ui.js` 中经 Round 9 延迟恢复的实现执行双重确认与完整清理。

## 修改文件
- wallet.html

## 剩余问题
- [P3] `index.html` 若与 `wallet.html` 同步维护，设置页删除行可能仍为旧内联逻辑，建议对齐。
- [P3] `goTab` 等函数仍可能在 `wallet.runtime.js` 与 `wallet.ui.js` 间重复定义；Round 9 已对 `goTo`/`deleteWallet`/`getTransferContacts` 做延迟恢复，`goTab` 若未来分叉可同样收敛。
- [P3] 仍无独立 DOM 节点：`page-transfer-success`、`page-swoosh`、`page-hb-keyword` 等；`goTo` 等对缺失页已有降级。

## 测试结果
- TEST-A: PASS — `data-ww-fn` 仅 `selectTransferCoin`；`wallet.runtime.js` 末尾 `wwExposeDataWwFnHandlers` 将 `window.selectTransferCoin` 指向实现。
- TEST-B: PASS — `wallet.html` 中无 `data-ww-go`。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`sendTransfer`、`createGift`、`claimGift`、`openSend`、`openReceive` 在 `wallet.ui.js` / `wallet.runtime.js` 中均有非空实现；`deleteWallet` 现由设置页统一调用。
