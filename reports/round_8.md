# Round 8 修复报告 - 2026-04-08

## 发现的问题
- [P0] `wallet.runtime.js` 与 `wallet.ui.js` 均定义全局 `doImportWallet`；脚本加载顺序使 **runtime 覆盖 UI**，导入钱包实际执行的是 runtime 内简化版（`restoreWallet` 直接回首页），用户无法走 UI 中的 **PIN 设置与 `finalizeImportedWalletAfterPin` 加密保存** 流程，与 `wallet.html` 产品设计不一致。

## 修复内容
- 文件：wallet.runtime.js
- 函数：doImportWallet（删除 runtime 侧重复实现）
- 修改：仅保留 `wallet.ui.js` 中的 `async function doImportWallet` 作为唯一全局入口；`wwExposeDataWwFnHandlers` 仍会将 `window.doImportWallet` 指向该实现。

## 修改文件
- wallet.runtime.js

## 剩余问题
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 仍存在其它重复全局函数（如 `goTo`、`deleteWallet`、`getTransferContacts` 等），runtime 后加载会覆盖 UI；若需单一来源可继续收敛。
- [P3] 精简 HTML 仍无独立节点：`page-transfer-success`、`page-swoosh`、`page-hb-keyword`、`page-verify-success` 等；`goTo` 已对缺失页降级到首页，可按产品需求补 DOM。

## 测试结果
- TEST-A: PASS — `data-ww-fn` 仅 `selectTransferCoin`；`wwExposeDataWwFnHandlers` 挂载 `window.selectTransferCoin`。
- TEST-B: PASS — `wallet.html` 中无 `data-ww-go` 属性。
- TEST-C: PASS — 所列核心函数在 `wallet.ui.js` + `wallet.runtime.js` 合并解析后均有非空实现；`doImportWallet` 仅以 UI 为定义来源。
