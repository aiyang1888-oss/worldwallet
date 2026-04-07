# Round 1 修复报告 - 2026-04-07 21:24

## 发现的问题
- [P3] `wallet.dom-bind.js` 与首页逻辑通过 `window.loadTrxResource` 调用 TRX 资源刷新，依赖脚本全局隐式绑定；在 `wwExposeDataWwFnHandlers` 中未显式赋值，与同类 API（如 `loadBalances`）不一致，不利于静态检查与长期维护。

## 修复内容
- 文件：wallet.runtime.js
- 函数：wwExposeDataWwFnHandlers（立即执行函数内）
- 修改：在暴露 `loadBalances` 后增加 `window.loadTrxResource = loadTrxResource`（带 typeof 守卫）。

## 修改文件
- wallet.runtime.js

## 剩余问题
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 仍存在大量同名全局函数重复定义，以后加载的 runtime 为准；若需减负可后续合并或拆分模块（非本轮范围）。
- 无阻塞性 P0/P1/P2 项（本轮 TEST-A/B/C 均通过）。

## 测试结果
- TEST-A: PASS — `data-ww-fn` 所列函数均在合并后的 JS 中以 `function` / `window.*` 形式存在（脚本扫描）。
- TEST-B: PASS — 所有 `data-ww-go` 目标在 `wallet.html` 中均有对应 `id="page-*"`。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`sendTransfer`（映射 `confirmTransfer`）、`createGift`、`claimGift`（映射 `submitClaim`）、`openSend`（映射 `goHomeTransfer`）、`openReceive` 均存在且函数体非空。

## 提交
- `5c516ca` — fix: expose loadTrxResource on window for TRX resource refresh binding
