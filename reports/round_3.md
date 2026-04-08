# Round 3 修复报告 - 2026-04-08 08:18

## 发现的问题
- [P1] `wallet.runtime.js` 中 `shareSuccess` 使用未注入的标识符 `event`（`event?.target`）：在多数调用方式下 `event` 不在函数作用域内，存在 `ReferenceError` 风险；且连续两次 `navigator.clipboard.writeText`，后一次覆盖前一次，分享文案与哈希不一致。
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 仍存在大量同名函数，后加载覆盖前者（上轮遗留，架构债务，本轮未改）。
- [P3] `doTransfer` / `confirmTransfer` 等处对 `document.getElementById(...)` 直接链式 `.value` / `.textContent`，若 DOM 缺失会抛错（静态提示，非本轮修复范围）。

## 修复内容
- 文件：wallet.runtime.js
- 函数：shareSuccess
- 修改：为 `shareSuccess(ev)` 增加事件参数与 `window.event` / `document.activeElement` 回退，去掉对裸 `event` 的依赖；将分享正文与交易哈希合并为一次剪贴板写入；按钮「已复制」反馈逻辑保持不变并收紧 `setTimeout` 闭包。

## 修改文件
- wallet.runtime.js

## 剩余问题
- UI/runtime 双份大文件导致的同名覆盖与维护成本（建议后续合并或按模块拆分）。
- 部分 `getElementById` 链式访问仍可统一为 `_safeEl` 或空值保护（可选加固）。

## 测试结果
- TEST-A: PASS — `data-ww-fn` 仅 `selectTransferCoin`；`wallet.ui.js` 与 `wallet.runtime.js` 末尾 `wwExposeDataWwFnHandlers` 暴露 `window.selectTransferCoin`。
- TEST-B: PASS — `wallet.html` 中无 `data-ww-go` 属性。
- TEST-C: PASS — 所列核心函数在 `wallet.ui.js` / `wallet.runtime.js` 中均有非空实现（runtime 后加载覆盖同名实现）。

## STEP 1 扫描摘要（本轮归档）
- `data-ww-fn`：`selectTransferCoin`
- `id="page-*"`：page-welcome, page-password-restore, page-create, page-key, page-key-verify, page-home, page-addr, page-transfer, page-settings, page-swap, page-import, page-hongbao, page-claim, page-claimed, page-hb-records, page-faq
- `data-ww-go`：无
- `wallet.css` 花括号：`{` 与 `}` 均为 326，平衡
- 全局绑定：`wallet.ui.js` / `wallet.runtime.js` 含大量 `function X` / `window.X =`（详见两文件；runtime 末尾统一挂出 data-ww-fn 相关 handler）
