# Round 3 修复报告 - 2026-04-08 09:41

## 发现的问题
- [P1] `wallet.ui.js` 中 `copyKw` 在 `getElementById('copyKwBtn')` 可能为 `null`（精简 HTML 无口令详情区）时仍调用 `querySelector`，会导致运行时异常；与 `wallet.runtime.js` 已存在的防护不一致。

## 修复内容
- 文件：wallet.ui.js
- 函数：copyKw
- 修改：在更新按钮文案前校验 `copyKwBtn` 与最后一个子节点存在，与 runtime 版行为对齐，避免空引用。

## 修改文件
- wallet.ui.js

## 剩余问题
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 仍重复定义 `selectTransferCoin`、`transferCoin` 及相关转账辅助函数，运行时以后加载者为准；若需单一来源可后续收敛到 runtime 并删除 ui 中重复块。
- 精简 HTML 仍无独立页面节点：`page-transfer-success`、`page-swoosh`、`page-hb-keyword`、`page-verify-success` 等；`goTo` 已对缺失 id 回退 `page-home`，专用页可视需求后续补 DOM。

## 测试结果
- TEST-A: PASS — `data-ww-fn="selectTransferCoin"` 对应 `window.selectTransferCoin`（`wallet.runtime.js` 中 `wwExposeDataWwFnHandlers` 挂载）。
- TEST-B: PASS — `wallet.html` 中无 `data-ww-go` 属性。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`sendTransfer`、`createGift`、`claimGift`、`openSend`、`openReceive` 在 `wallet.ui.js` / `wallet.runtime.js` 中均有非空实现。
