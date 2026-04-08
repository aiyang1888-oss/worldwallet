# Round 8 修复报告 - 2026-04-08 08:30

## 发现的问题
- [P3] `#homeBalanceChartWrap` 存在重复 `class` 属性（`home-balance-chart-wrap` 与 `u5`），属无效 HTML；若简单合并为同一 `class` 列表，`.u5{display:none}` 会隐藏近 7 日资产图（与底栏注释「勿加 .u5」一致）。承接 round_7「剩余问题」。

## 修复内容
- 文件：`wallet.html`
- 元素：`#homeBalanceChartWrap`
- 修改：保留单一 `class="home-balance-chart-wrap"`，去掉误加的第二个 `class="u5"`，既消除重复属性又避免图表被隐藏。

## 修改文件
- `wallet.html`

## 剩余问题
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 存在大量同名函数，后加载文件覆盖前者（架构债，本轮未改）。
- [P3] TOTP 解锁弹窗内按钮仍存在重复 `class`（`btn-primary` 与 `u13`），可后续合并为单一 `class` 列表。
- [P1/P2] `wallet.runtime.js` 中 `setAmt`、`randomBlessing` 等对 `#hbAmount`/`#hbMessage` 仍假定节点存在，极端精简 DOM 时可加固。

## 测试结果
- TEST-A: PASS — 仅 `data-ww-fn="selectTransferCoin"`；`wallet.ui.js` 与 `wallet.runtime.js` 末尾 `wwExposeDataWwFnHandlers` 均保证 `window.selectTransferCoin` 可用。
- TEST-B: PASS — 无 `data-ww-go`。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`sendTransfer`、`createGift`、`claimGift`、`openSend`、`openReceive` 在 `wallet.ui.js` / `wallet.runtime.js` 中均有非空函数体或实质逻辑。

Git：`56ba685` — `fix: remove duplicate class on home balance chart wrap (valid HTML, keep chart visible)`
