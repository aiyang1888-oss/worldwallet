# Round 1 修复报告 - 2026-04-08 12:00

## 发现的问题
- [P3] `wallet.dom-bind.js` 通过 `wwCall` 仅访问 `window[name]`；部分由 `bindSelect` / `bindInput` 绑定的处理器未在 `wwExposeDataWwFnHandlers` 中显式挂到 `window`，与 `data-ww-fn` 的显式导出策略不一致，不利于维护与在严格/压缩环境下的可靠性。

## 修复内容
- 文件：wallet.runtime.js
- 函数：`wwExposeDataWwFnHandlers`（立即执行函数内）
- 修改：为 `changeMnemonicLength`、`switchLang`、`updateQRCode`、`applyTxHistoryFilter`、`detectAddrType`、`calcTransferFee`、`calcSwap`、`syncImportGrid`、`syncImportPasteFromGrid`、`onClaimInput`、`onHideZeroTokensChange` 增加与 `window` 的显式绑定。

## 修改文件
- wallet.runtime.js

## 剩余问题
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 仍存在大量同名全局函数，由后加载的 runtime 覆盖；属架构层面，本轮未改动。
- [P3] 未对 `wallet.html` 中全部 `class` 与 `wallet.css` 做穷尽对照。

## 测试结果
- TEST-A: PASS — `data-ww-fn` 所列名称均在已加载脚本中有对应 `function` / `window.*` 绑定。
- TEST-B: PASS — 全部 `data-ww-go` 目标在 `wallet.html` 中存在对应 `id="page-*"` 页面节点。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`sendTransfer`、`createGift`、`claimGift`、`openSend`、`openReceive` 均具有非空实现（含 runtime 中的别名包装函数）。
