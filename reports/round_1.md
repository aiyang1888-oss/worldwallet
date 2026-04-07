# Round 1 修复报告 - 2026-04-07

## 发现的问题
- [P3] `wallet.runtime.js` 中 `goTo` 对 `.page` 使用 `style.display=''` 清空内联样式，与先加载的 `wallet.ui.js` 中「非活动页 `display:none`、当前页 `display:flex`」不一致；在部分 WebView/CSS 叠层场景下可能导致多页同时参与布局或首页表现异常。

## 修复内容
- 文件：`wallet.runtime.js`
- 函数：`goTo`
- 修改：将隐藏/显示逻辑与 `wallet.ui.js` 对齐——遍历 `.page` 时设为 `display:none`，激活页设为 `display:flex`。

## 修改文件
- `wallet.runtime.js`

## 剩余问题
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 仍存在大量同名函数重复定义（由加载顺序决定最终行为），长期维护建议逐步收敛，非本回合范围。

## 测试结果
- TEST-A: PASS — `data-ww-fn` 中 41 个函数均在 `wwExposeDataWwFnHandlers` 或全局函数中有对应实现（`deleteWalletRow` 由 `wallet.dom-bind.js` 特殊处理）。
- TEST-B: PASS — 所有 `data-ww-go` 目标在 `wallet.html` 中均有对应 `id="page-*"`。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`createGift` 均有非空实现；`sendTransfer`/`claimGift`/`openSend`/`openReceive` 在 `wallet.runtime.js` 末尾别名块中映射到既有函数。
