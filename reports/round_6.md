# Round 6 修复报告 - 2026-04-08 08:03

## 发现的问题
- [P1] `goTo('page-import')` 分支在 `wallet.runtime.js` 与 `wallet.ui.js` 中对 `document.getElementById('importError')` 直接设置 `style`，若 DOM 中无该节点（精简版页面）会抛出运行时异常。

## 修复内容
- 文件：`wallet.runtime.js`、`wallet.ui.js`
- 函数：`goTo`
- 修改：在隐藏导入错误提示前先取元素并判空，仅当存在 `#importError` 时再设置 `display`。

## 修改文件
- `wallet.runtime.js`
- `wallet.ui.js`

## 剩余问题
- 无（全项目 `getElementById` / `JSON.parse` 全面审计仍为可选后续工作）

## 测试结果
- TEST-A: PASS — `wallet.html` 中唯一 `data-ww-fn="selectTransferCoin"`；`wallet.runtime.js` 末尾 `wwExposeDataWwFnHandlers` 将 `selectTransferCoin` 挂到 `window`。
- TEST-B: PASS — `wallet.html` 中无 `data-ww-go` 属性，无需校验页面 ID 映射。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`sendTransfer`、`createGift`、`claimGift`、`openSend`、`openReceive` 在 `wallet.ui.js` + `wallet.runtime.js` 加载后均有非空实现（runtime 覆盖同名函数处亦有实现）。

验证：在无 `#importError` 的 HTML 中调用 `goTo('page-import')` 不应再因该行抛错；完整 `wallet.html` 下导入页行为与修复前一致。
