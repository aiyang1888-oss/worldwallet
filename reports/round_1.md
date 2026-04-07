# Round 1 修复报告 - 2026-04-07 19:01

## 发现的问题
- [P1] `selectHbType` / `changeCount`（`wallet.runtime.js`）在缺少 `#hbTypeNormal`、`#hbTypeLucky`、`#hbCountVal` 等节点时仍访问 `.style` / `.textContent`，可能抛错（当前 `wallet.html` 未包含这些 id，属潜在崩溃路径）。
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 均定义 `goTo`、`changeCount` 等同名全局函数，以**后加载**的 `wallet.runtime.js` 为准；属架构重复但当前运行一致。
- [P2/P3] 其余：`script` 加载顺序合理；`data-ww-fn` 均在 runtime 末尾 `wwExposeDataWwFnHandlers` 挂到 `window`；`wallet.css` 花括号平衡（329/329）。

## 修复内容
- 文件：`wallet.runtime.js`
- 函数：`selectHbType`、`changeCount`
- 修改：对礼物类型与数量相关节点使用存在性判断后再写样式与文案，避免 `getElementById` 为 `null` 时抛异常。

## 修改文件
- `wallet.runtime.js`

## 剩余问题
- 无（自动化 TEST-A/B/C 均通过；若未来恢复带 `hbTypeNormal` 等控件的 HTML，现有逻辑仍兼容）。

## 测试结果
- TEST-A: PASS — 所有 `data-ww-fn` 均在合并后的 JS 中有对应 `function` 定义（或 runtime 显式 `window.*` 赋值）。
- TEST-B: PASS — 所有 `data-ww-go` 目标均存在 `id="page-*"` 页面容器。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`createGift`、`submitClaim`、`goHomeTransfer` 等核心函数体非空；`sendTransfer`/`claimGift`/`openSend`/`openReceive` 由 runtime 别名映射至既有实现。
