# Round 1 修复报告 - 2026-04-07 22:04

## 发现的问题
- [P2] `createGift`（礼物页创建口令）未更新全局 `currentKeyword` 与 `#page-hb-keyword` 展示节点；`copyKw`/`shareKw`/`showHbQR` 由 `wallet.runtime.js` 实现且依赖 `currentKeyword`，导致在口令页复制/分享仍为默认演示口令而非新创建口令。

## 修复内容
- 文件：wallet.ui.js
- 函数：createGift
- 修改：创建成功后同步 `currentKeyword` 与 `kwKeyword`/`kwShareKeyword`/`kwBlessingText`/`kwAmtText`，与 runtime 礼物流程一致。

## 修改文件
- wallet.ui.js

## 剩余问题
- 无

## 测试结果
- TEST-A: PASS 全部 `data-ww-fn` 均在核心 JS 链中有对应 `function`/`window.*` 定义。
- TEST-B: PASS 全部 `data-ww-go` 目标在 `wallet.html` 中存在 `id="page-*"`。
- TEST-C: PASS 所列核心函数均有非空实现（`sendTransfer`/`claimGift`/`openSend` 为 runtime 中指向 `confirmTransfer`/`submitClaim`/`goHomeTransfer` 的别名；`openReceive` 为 `goTab('tab-addr')` 包装）。
