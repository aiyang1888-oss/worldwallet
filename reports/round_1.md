# Round 1 修复报告 - 2026-04-07 20:17

## 发现的问题
- [P1] `openCoinPicker` 在 `#coinPickerList` 不存在时对 `list.innerHTML` 赋值会抛错，导致同文件后续脚本无法执行。
- [P1] `switchHbType` 在 `#btnNormal` / `#btnLucky` 不存在时访问 `n.style` / `l.style` 会抛错。

## 修复内容
- 文件：wallet.runtime.js
- 函数：openCoinPicker, switchHbType
- 修改：在操作 DOM 前增加空节点判断并提前返回。

## 修改文件
- wallet.runtime.js

## 剩余问题
- 无（本轮静态与绑定测试均通过；其余为架构/体验类非阻断项可后续迭代）。

## 测试结果
- TEST-A: PASS — 全部 `data-ww-fn` 在已加载脚本中存在 `function` / `window` 绑定。
- TEST-B: PASS — 全部 `data-ww-go` 目标在 `wallet.html` 中存在对应 `id="page-*"`。
- TEST-C: PASS — 所列核心函数在 `wallet.runtime.js` 或别名暴露处均有非空实现。

**Git:** `485abfd` — fix: guard openCoinPicker and switchHbType when optional DOM is missing
