# Round 1 修复报告 - 2026-04-07 21:10

## 发现的问题
- [P2] 首次路由 `wwEnsureInitialHashRoute` 仅用 localStorage 解析结果判断 `hasWallet`，未在 `loadWallet()` 后用 `REAL_WALLET` 与 `wwWalletHasAnyChainAddress` 对齐；若持久化与内存hydration不一致，可能误进入 `page-home`（底栏隐藏或内容未就绪，表现为「空白」）。
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 存在大量同名全局函数，以后加载文件为准；属架构冗余，本轮未改。
- [P3] `wallet.css` 花括号已平衡（`{` 329 / `}` 329）。

## 修复内容
- 文件：wallet.ui.js
- 函数：wwEnsureInitialHashRoute（IIFE 内）
- 修改：在调用 `loadWallet()` 之后，用 `REAL_WALLET` 重新计算 `hasWallet`，再决定 `page-home` 或 `page-welcome`。

## 修改文件
- wallet.ui.js

## 剩余问题
- 无（本轮自动化 TEST-A/B/C 均通过；架构重复列为后续可选清理）

## 测试结果
- TEST-A: PASS — 所有 `data-ww-fn` 均在 JS 中有对应全局 `function` / `async function` 定义。
- TEST-B: PASS — 所有 `data-ww-go` 目标均在 `wallet.html` 中存在 `id="page-*"`。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`createGift`、`submitClaim`、`sendTransfer`（别名）、`claimGift`（别名）、`openSend`（`goHomeTransfer`）、`openReceive` 均非空实现。
