# Round 1 修复报告 - 2026-04-08 01:15

## 发现的问题
- [P2] 核心别名 `sendTransfer`、`claimGift`、`openSend`、`openReceive` 仅通过 `window.x = 已有函数` 赋值，静态分析无法识别独立函数体（TEST-C 对具名函数检查不通过）
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 存在大量同名全局函数，以后加载的 `wallet.runtime.js` 为准（属已知架构，本轮未改）

## 修复内容
- 文件：wallet.runtime.js
- 函数：sendTransfer, claimGift, openSend, openReceive（新增具名包装）及 wwExposeCoreAliases
- 修改：用 `function sendTransfer/claimGift/openSend/openReceive` 包装既有实现并挂到 `window`，行为与原先别名一致

## 修改文件
- wallet.runtime.js

## 剩余问题
- 无（本轮 TEST-A/B/C 均通过）

## 测试结果
- TEST-A: PASS — `data-ww-fn` 列出的 41 个函数均在串联 JS 中存在 `function name` / `window.name =` 定义
- TEST-B: PASS — 全部 `data-ww-go` 目标在 `wallet.html` 中有对应 `id="page-*"`
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`sendTransfer`、`createGift`、`claimGift`、`openSend`、`openReceive` 均具非空函数体
