# Round 1 修复报告 - 2026-04-08 08:12

## 发现的问题
- [P1] `#qrOverlay` 作为 `.pages` 的直接子节点且不含 `.page`，被规则 `.pages > :not(.page)... { display: none !important; }` 永久隐藏，`.qr-overlay.show` 无法覆盖，`showQR()` 打开的地址二维码弹窗不可见。
- [P3] `wallet.html` 未引入 `js/storage.js`（若代码依赖 `Store` 需单独确认加载路径）。
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 存在大量同名函数，依赖后加载文件覆盖行为，维护成本高。

## 修复内容
- 文件：wallet.css
- 函数：N/A（样式选择器）
- 修改：在「隐藏游离子元素」选择器中增加 `:not(#qrOverlay)`，使 `#qrOverlay` 不再被误杀，保留默认 `display:none` 与 `.qr-overlay.show` 的显示逻辑。

## 修改文件
- wallet.css

## 剩余问题
- `js/storage.js` 未在 `wallet.html` 中通过 `<script>` 加载（若业务需要 `Store` 需后续接入）。
- 其他架构/重复定义类问题未在本轮改动。

## 测试结果
- TEST-A: PASS — `data-ww-fn` 仅 `selectTransferCoin`，在 `wallet.ui.js` 中赋值 `window.selectTransferCoin`，且 `wallet.runtime.js` 末尾 `wwExposeDataWwFnHandlers` 再次暴露。
- TEST-B: PASS — `wallet.html` 中无 `data-ww-go` 属性（`wallet.dom-bind.js` 仍支持该属性以备扩展）。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`sendTransfer`、`createGift`、`claimGift`、`openSend`、`openReceive` 在 `wallet.ui.js` 有实质实现；`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText` 在 `wallet.runtime.js` 有实质实现（后加载覆盖 `wallet.ui.js` 中同名函数）。
