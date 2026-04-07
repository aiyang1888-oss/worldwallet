# Round 1 修复报告 - 2026-04-07 22:30

## 发现的问题
- [P3] `setTransferMax` 已在 `wallet.runtime.js` 中实现空值防护，但未在 `wwExposeDataWwFnHandlers` 中挂到 `window`，与 `setSwapMax` 等不一致，外部或调试台调用 `window.setTransferMax` 可能为 `undefined`。

## 修复内容
- 文件：`wallet.runtime.js`
- 函数：`wwExposeDataWwFnHandlers`（末尾自执行块）
- 修改：在暴露列表中增加 `window.setTransferMax = setTransferMax`，与既有 `data-ww-fn` 暴露方式一致。

## 修改文件
- `wallet.runtime.js`

## 剩余问题
- 无

## 测试结果
- TEST-A: PASS — 全部 `data-ww-fn` 均有对应全局函数或经 `wwExposeDataWwFnHandlers` 挂到 `window`。
- TEST-B: PASS — 全部 `data-ww-go` 目标在 `wallet.html` 中存在 `id="page-*"`。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`createGift` 均有非空函数体；`sendTransfer`/`claimGift`/`openSend` 为 `confirmTransfer`/`submitClaim`/`goHomeTransfer` 的 `window` 别名，`openReceive` 为调用 `goTab('tab-addr')` 的包装函数。

## 附录：STEP 1 扫描摘要
- **data-ww-fn**：41 处（含 `createNewWallet`、`confirmPin`、`createGift`、`submitClaim` 等）。
- **id="page-*"`**：`page-welcome` … `page-faq` 共 22 个页面容器。
- **data-ww-go**：均指向已存在的 `page-*`。
- **wallet.css**：花括号 330 / 330，平衡。
- **脚本顺序**：`js/storage.js` → `core/*` → `wallet.core.js` → `wallet.ui.js` → `wallet.addr.js` → `wallet.tx.js` → `wallet.runtime.js` → `wallet.dom-bind.js`。
