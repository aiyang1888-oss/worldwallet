# Round 1 修复报告 - 2026-04-08

## 发现的问题
- [P1] `shareSuccess` 回退逻辑依赖浏览器非标准的全局 `event`，在严格模式或部分环境下可能无法解析点击目标，导致「已复制」视觉反馈不更新。

## 修复内容
- 文件：`wallet.runtime.js`
- 函数：`shareSuccess`
- 修改：在 `fromEl` 无效时用 `document.activeElement` 与 `closest('[data-ww-fn="shareSuccess"]')` 定位按钮，移除对全局 `event` 的依赖。

## 修改文件
- `wallet.runtime.js`

## 剩余问题
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 存在大量同名全局函数，以后加载的 `wallet.runtime.js` 为准；属既有架构，非本轮阻断项。

## 测试结果
- TEST-A: PASS — 全部 `data-ww-fn` 在核心 JS 中存在对应函数定义，且 `wallet.runtime.js` 末尾 `wwExposeDataWwFnHandlers` 将常用处理器挂到 `window`。
- TEST-B: PASS — 全部 `data-ww-go="page-*"` 在 `wallet.html` 中存在对应 `id`；`data-ww-go-tab` 目标为底栏 `tab-*` id。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`createGift`（`wallet.ui.js`）、`submitClaim`（`wallet.ui.js`）均有非空实现；`sendTransfer`、`claimGift`、`openSend`、`openReceive` 在 `wallet.runtime.js` 中通过别名映射到 `confirmTransfer`、`submitClaim`、`goHomeTransfer`、`goTab('tab-addr')`。
