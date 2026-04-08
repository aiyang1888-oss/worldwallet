# Round 7 修复报告 - 2026-04-08 08:27

## 发现的问题
- [P1] `wallet.runtime.js` 中 `switchHbType`、`selectHbType` 在精简 DOM 下对 `btnNormal`/`btnLucky`、`hbTypeNormal`/`hbTypeLucky` 无判空即访问 `.style`，会抛 `TypeError`（承接 round_6「剩余问题」）。
- [P1] `changeCount` 对 `hbCountVal` / 展示节点无判空，节点缺失时同样可能抛错。
- [P3] `wallet.html` 中 `#homeBalanceChartWrap` 仍重复 `class` 属性；`wallet.ui.js` 与 `wallet.runtime.js` 存在大量同名函数，后加载覆盖前者（架构债务）。

## 扫描摘要（STEP 1）
- `data-ww-fn`：`selectTransferCoin`（`#assetRowUsdt`）。
- `id="page-*"`：`page-welcome`、`page-password-restore`、`page-create`、`page-key`、`page-key-verify`、`page-home`、`page-addr`、`page-transfer`、`page-settings`、`page-swap`、`page-import`、`page-hongbao`、`page-claim`、`page-claimed`、`page-hb-records`、`page-faq`。
- `data-ww-go`：无。
- `wallet.css` 花括号：`{` 326 / `}` 326，平衡。

## 修复内容
- 文件：`wallet.runtime.js`
- 函数：`switchHbType`、`selectHbType`、`changeCount`
- 修改：在更新样式或文案前校验 `getElementById` 结果；缺失时仅更新 `hbType` 并调用 `updateHbPreview()` 后返回，避免空引用崩溃。

## 修改文件
- `wallet.runtime.js`

## 剩余问题
- [P3] `#homeBalanceChartWrap` 重复 `class` 属性未合并为单一 `class` 列表。
- [P3] 双文件同名函数覆盖问题未在本轮处理。
- [P2/P3] `setAmt` / `randomBlessing` 等仍假定部分礼物页节点存在，入口较少时可后续加固。

## 测试结果
- TEST-A: PASS — `data-ww-fn` 仅 `selectTransferCoin`；`wallet.runtime.js` 末尾 `wwExposeDataWwFnHandlers` 将其挂到 `window`。
- TEST-B: PASS — `wallet.html` 中无 `data-ww-go` 属性。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`sendTransfer`、`createGift`、`claimGift`、`openSend`、`openReceive` 在 `wallet.ui.js` / `wallet.runtime.js` 中均有非空函数体。

Git：`e89b298` — `fix: guard gift type UI helpers when DOM nodes are missing`
