# Round 1 修复报告 - 2026-04-08 04:07

## STEP 1 扫描摘要

- **data-ww-fn**：共 41 处绑定（`wallet.html`）。
- **id="page-*"**：22 个页面容器。
- **data-ww-go**：12 个唯一目标。
- **wallet.css**：花括号 `{` 330 / `}` 330，平衡。
- **wallet.ui.js + wallet.runtime.js**：顶层 `function` / `window.*` 赋值由脚本末尾显式导出（见 `wallet.runtime.js` 中 `wwExposeDataWwFnHandlers`）。

## 发现的问题

- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 存在重复的 `goTo` / `goTab` 等定义，后加载文件覆盖前者；当前行为一致，长期维护可能分叉。
- [P3] `wallet.html` 捕获阶段 `data-ww-fn` 委托与 `wallet.dom-bind.js` 冒泡处理并存；成功路径下捕获阶段会 `stopPropagation`，通常不会双触发。

## 修复内容

- 文件：无（产品代码）
- 函数：无
- 修改：本轮静态与绑定测试全部通过，未对 `wallet.html` / `wallet.*.js` 做功能性修改；仅新增本报告。

## 修改文件

- `reports/round_1.md`

## 剩余问题

- 无（若需降低 P3 风险，可后续单独重构合并 `goTo` 实现）。

## 测试结果

- TEST-A: PASS — 全部 `data-ww-fn` 均有对应全局函数定义，且 `wallet.runtime.js` 对关键名显式挂到 `window`。
- TEST-B: PASS — 全部 `data-ww-go` 目标在 HTML 中存在 `id="page-…"`。
- TEST-C: PASS — 所列核心函数均含实质语句（含 `sendTransfer`/`claimGift`/`openSend`/`openReceive` 别名与 `wallet.ui.js` 内 `createGift`）。
