# Round 1 修复报告 - 2026-04-07 23:15

## 发现的问题

- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 存在大量同名顶层函数；运行期以**后加载**的 `wallet.runtime.js` 为准。`createGift`、`submitClaim` 等仅在前序脚本定义时仍被 `wwExposeDataWwFnHandlers` 挂到 `window`。属维护复杂度，不阻塞功能。
- 本轮未发现 [P0]（`data-ww-fn` / `data-ww-go` 与页面 id 不一致）、[P1]（本流程静态审查中需立即打补丁的崩溃点）、[P2]（TEST-C 所列函数为空实现）。

## 修复内容

- 文件：无（STEP 5 最高优先级问题为「无 P0–P2 阻塞项」）
- 函数：无
- 修改：无需代码补丁；仅复验并更新本报告

## 修改文件

- `reports/round_1.md`

## 剩余问题

- 无（P3 架构备注见上，不阻塞发布）

## 测试结果

- TEST-A: PASS — `data-ww-fn` 共 41 个；均在合并加载的 JS 中对应 `function name` / `window.name`（`wallet.runtime.js` 末尾 `wwExposeDataWwFnHandlers` + `wwExposeCoreAliases` 显式挂载；`sendTransfer`→`confirmTransfer`、`claimGift`→`submitClaim`、`openSend`→`goHomeTransfer`、`openReceive`→`goTab('tab-addr')`）
- TEST-B: PASS — `data-ww-go` 去重目标均存在对应 `id="page-*"`（含 `page-password-restore`、`page-faq` 等）
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText` 在 `wallet.runtime.js` 中有实质实现；`createGift` 在 `wallet.ui.js`；`submitClaim`、`confirmTransfer`、`goHomeTransfer` 分别为 `claimGift`/`sendTransfer`/`openSend` 的实现或别名来源

---

### 附录 · STEP 1 速查

| 项目 | 结果 |
|------|------|
| `data-ww-fn` | 41 个（见 `wallet.html`） |
| `id="page-*"` | 22 个页面容器 |
| `data-ww-go` 目标 | 12 个去重，均有对应 `page-*` |
| `wallet.css` `{` / `}` | 330 / 330（平衡） |
| Script 顺序 | … → `wallet.ui.js` → `wallet.addr.js` → `wallet.tx.js` → `wallet.runtime.js` → `wallet.dom-bind.js` |
