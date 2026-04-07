# Round 1 修复报告 - 2026-04-08 05:45

## 发现的问题

- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 均含完整 `goTo`/`goTab` 等实现；加载顺序为 ui → addr → tx → runtime，**运行期以后加载的 runtime 为准**，存在长期双份维护漂移风险，但当前 TEST-A/B 未失败。

## 修复内容

- 文件：无（STEP 5 未识别需改代码的 P0/P1/P2 阻塞项）
- 函数：—
- 修改：本轮仅刷新审计报告与测试结果；代码库无需 patch。

## 修改文件

- `reports/round_1.md`

## 剩余问题

- P3：可考虑将导航相关逻辑收敛为单一来源，避免 ui/runtime 双份 `goTo` 长期不一致。

## 测试结果

- TEST-A: PASS — `wallet.html` 中 41 个去重后的 `data-ww-fn` 均在 `wallet.ui.js` / `wallet.addr.js` / `wallet.tx.js` / `wallet.runtime.js` 中解析为全局 `function` 声明；`wallet.runtime.js` 末尾 `wwExposeDataWwFnHandlers` 等对关键 handler 显式 `window.X =`。
- TEST-B: PASS — 12 个 `data-ww-go` 目标均存在对应 `id="page-*"`（含 `page-password-restore`）。
- TEST-C: PASS — `goToPinConfirm`, `confirmPin`, `pinVerifyEnterWallet`, `shareSuccess`, `copyKw`, `shareKw`, `showHbQR`, `copyShareText`, `sendTransfer`, `createGift`, `claimGift`, `openSend`, `openReceive` 均具非空函数体（含 runtime 中 `sendTransfer`/`claimGift`/`openSend`/`openReceive` 别名包装）。

### STEP 1 摘要（扫描）

| 类别 | 结果 |
|------|------|
| `data-ww-fn`（去重） | 41 个 |
| `id="page-*"` | 21 个 |
| `data-ww-go` 目标 | 12 个，均有对应页面 |
| `wallet.css` `{` / `}` | 330 / 330，平衡 |

---

**结论**：全部自动化检查项通过 → 见下方输出标记。
