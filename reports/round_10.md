# Round 10 修复报告 - 2026-04-08 08:11

## 发现的问题
- [P1] `wallet.core.js` 中 `markBackupDone` 对 `localStorage` 的 `ww_wallet` 使用无防护 `JSON.parse`，与已加固的 `wallet.runtime.js` 不一致；在存储被损坏或脚本加载顺序变化时仍可能抛错。

## 修复内容
- 文件：`wallet.core.js`
- 函数：`markBackupDone`
- 修改：与 `wallet.runtime.js` 对齐，使用 try-catch 解析、`null`/非对象归一化后再写入 `backedUp`，避免非法 JSON 导致崩溃。

## 修改文件
- `wallet.core.js`
- `reports/round_9.md`（工作区既有改动，随本次提交一并纳入）

## 剩余问题
- `page-home` 上 `#homeBalanceChartWrap` 仍存在重复 `class` 属性（第二个 `class="u5"` 为无效/易混淆的 HTML；若解析行为异常可能误用 `u5` 的 `display:none`）。建议合并为单一 `class="home-balance-chart-wrap"`。

## 测试结果
- TEST-A: PASS — `data-ww-fn` 仅 `selectTransferCoin`；`wallet.runtime.js` 中 `wwExposeDataWwFnHandlers` 与 `wallet.ui.js` 均将 `selectTransferCoin` 挂到 `window`。
- TEST-B: PASS — `wallet.html` 中无 `data-ww-go` 属性。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`sendTransfer`、`createGift`、`claimGift`、`openSend`、`openReceive` 在 `wallet.ui.js` / `wallet.runtime.js` 加载链中均有非空实现。

## 扫描摘要（STEP 1）
- `data-ww-fn`：`selectTransferCoin`
- `id="page-*"`：page-welcome, page-password-restore, page-create, page-key, page-key-verify, page-home, page-addr, page-transfer, page-settings, page-swap, page-import, page-hongbao, page-claim, page-claimed, page-hb-records, page-faq（共 16 个）
- `data-ww-go`：无
- `wallet.css` 花括号平衡：开闭一致（净计数 0）
