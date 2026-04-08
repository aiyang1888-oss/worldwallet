# Round 7 修复报告 - 2026-04-08 08:04

## 发现的问题
- [P1] `wallet.runtime.js` 中 `selectTransferCoin` 对 `#transferCoinIcon`、`#transferCoinName` 直接赋值，而当前 `wallet.html` 转账页为精简版无上述节点；用户从首页资产卡片（`data-ww-fn="selectTransferCoin"`）进入时会触发对 `null` 的属性访问并抛错，转账入口不可用。

## 修复内容
- 文件：`wallet.runtime.js`
- 函数：`selectTransferCoin`
- 修改：在更新币种展示前判空；若无完整币种条 DOM，则 `goTo('page-transfer')` 并继续 `calcTransferFee()`，与 `wallet.ui.js` 行为对齐。

## 修改文件
- `wallet.runtime.js`

## 剩余问题
- `wallet.runtime.js` 中 `submitClaim` 等对 `localStorage` 的 `JSON.parse` 在数据损坏时仍可能抛错（低概率）；可作后续加固。
- `#homeBalanceChartWrap` 存在重复 `class` 属性（HTML 小问题，不影响脚本）。

## 测试结果
- TEST-A: PASS — `wallet.html` 仅 `data-ww-fn="selectTransferCoin"`；`wallet.runtime.js` 末尾 `wwExposeDataWwFnHandlers` 将 `selectTransferCoin` 挂到 `window`。
- TEST-B: PASS — `wallet.html` 中无 `data-ww-go` 属性，无需校验页面 ID 映射。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`sendTransfer`、`createGift`、`claimGift`、`openSend`、`openReceive` 在 `wallet.ui.js` / `wallet.runtime.js` 中均有非空实现（runtime 中礼物/成功页相关函数含实质逻辑）。

验证：在浏览器打开 `wallet.html`，解锁进入首页后点击 USDT 资产行，应进入转账页且无控制台报错；完整版若存在 `#transferCoinIcon` / `#transferCoinName` 时行为与修复前一致。
