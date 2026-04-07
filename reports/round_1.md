# Round 1 修复报告 - 2026-04-08

## 发现的问题
- [P1] `copyKeyword` 依赖浏览器隐式全局 `event`，在严格模式或程序化调用时可能抛出 `ReferenceError` 或无法更新按钮反馈

## 修复内容
- 文件：wallet.runtime.js
- 函数：copyKeyword
- 修改：为 `copyKeyword` 增加显式参数 `ev`，并回退到 `window.event`，避免依赖未声明的 `event` 标识符

## 修改文件
- wallet.runtime.js

## 剩余问题
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 存在大量同名全局函数，由后加载的 runtime 覆盖；属架构层面，本轮未改动
- [P3] 未对 `wallet.html` 中全部 `class` 与 `wallet.css` 做穷尽对照（本轮未报告缺失类名）

## 测试结果
- TEST-A: PASS — `data-ww-fn` 列出的 42 个名称均在仓库 `*.js` 中有对应 `function` 定义（含 `wallet.addr.js` 中的 `copyHomeAddr`）
- TEST-B: PASS — 全部 `data-ww-go` 目标在 `wallet.html` 中存在 `id="page-*"` 的页面节点
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`sendTransfer`、`createGift`、`claimGift`、`openSend`、`openReceive` 均具有非空实现（含 runtime 中的别名包装函数）
