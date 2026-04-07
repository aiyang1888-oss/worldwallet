# Round 1 修复报告 - 2026-04-08 05:57

## 发现的问题

- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 均含完整 `goTo` / `goTab` 等实现；脚本顺序为 `wallet.ui.js` → `wallet.addr.js` → `wallet.tx.js` → `wallet.runtime.js`，**运行期以后加载的 runtime 为准**，存在双份逻辑长期漂移风险；当前 TEST-A/B/C 均通过。

## 修复内容

- 文件：无（STEP 5 未识别需改代码的 P0/P1/P2 阻塞项）
- 函数：—
- 修改：本轮审计确认绑定与核心函数体完整；代码库无需功能性 patch。

## 修改文件

- `reports/round_1.md`

## 剩余问题

- P3：后续可将导航相关逻辑收敛为单一来源，降低 ui/runtime 双份 `goTo` 不一致风险。

## 测试结果

- TEST-A: PASS — `wallet.html` 中去重后 **41** 个 `data-ww-fn` 均在 `wallet.ui.js` / `wallet.addr.js` / `wallet.tx.js` / `wallet.runtime.js` 中有对应 `function` / `async function`（含 `async`）；`wallet.runtime.js` 末尾 `wwExposeDataWwFnHandlers` 等对关键 handler 显式 `window.X =`。
- TEST-B: PASS — **12** 个 `data-ww-go` 目标均存在对应 `id="page-*"`（含 `page-password-restore`）。
- TEST-C: PASS — `goToPinConfirm`, `confirmPin`, `pinVerifyEnterWallet`, `shareSuccess`, `copyKw`, `shareKw`, `showHbQR`, `copyShareText`, `sendTransfer`, `createGift`, `claimGift`, `openSend`, `openReceive` 均具非空函数体（`sendTransfer`/`claimGift`/`openSend`/`openReceive` 为 runtime 内别名实现）。

### STEP 1 摘要（扫描）

| 类别 | 结果 |
|------|------|
| `data-ww-fn`（去重） | 41 个 |
| `id="page-*"` | 22 个 |
| `data-ww-go` 目标（去重） | 12 个，均有对应页面 |
| `wallet.css` `{` / `}` | 330 / 330，平衡 |

### STEP 2 摘要（架构）

- 脚本顺序：`safeLog` → `ethers` / `scrypt-js` → `api-config` → `storage` → `wallet.derive.paths` → `core/security` → `core/wallet` → `wordlists` → `wallet.core` → `wallet.ui` → `wallet.addr` → `wallet.tx` → `wallet.runtime` → `wallet.dom-bind`；依赖链合理。
- 全局：`goTo` 等在 runtime 中覆盖 ui 同名实现，以最终加载为准。
- CSS：`wallet.css` 已对 `#qrOverlay` 等做例外，避免 `.pages > :not(.page)` 误藏弹层。

### STEP 3 摘要（静态逻辑）

- `goTo('page-home')` 已含 `wwWalletHasAnyChainAddress` + `loadWallet()` 补救路径；`page-password-restore` 亦有存储校验；未发现需本轮必改的 P1 单点。

---

**结论**：全部自动化检查项通过 → 见下方输出标记。
