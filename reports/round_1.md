# Round 1 修复报告 - 2026-04-08 02:34

## 发现的问题
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 存在大量同名全局函数；加载顺序为 `wallet.ui.js` → `wallet.addr.js` → `wallet.tx.js` → `wallet.runtime.js`，后者覆盖前者。`wallet.runtime.js` 末尾 `wwExposeDataWwFnHandlers` 已将 `data-ww-fn` 所需回调挂到 `window`，当前行为一致，长期可重构收敛。
- [P3] 部分 `JSON.parse(localStorage…)` 调用未统一包在 try-catch（多为受控键名）；`submitClaim` / `createHongbao` 等关键路径已防护。

## 修复内容
- 文件：无（STEP 4 TEST-A/B/C 与核心函数非空检查均通过，无 P0–P2 必改项）
- 函数：—
- 修改：—

## 修改文件
- `reports/round_1.md`

## 剩余问题
- 无（架构层重复定义可作为后续重构项，不影响本轮测试结论）

## 测试结果
- TEST-A: PASS — `wallet.html` 中 41 个唯一 `data-ww-fn` 均在 `wallet.ui.js` / `wallet.runtime.js` / `wallet.addr.js` / `wallet.tx.js` 等中有对应 `function` 声明；`wallet.runtime.js` 末尾 `wwExposeDataWwFnHandlers` 显式挂出 `window.*`。
- TEST-B: PASS — 全部 `data-ww-go` 目标（`page-create`、`page-password-restore`、`page-import`、`page-welcome`、`page-faq`、`page-key-verify`、`page-pin-setup`、`page-settings`、`page-home`、`page-claim`、`page-hb-records`、`page-hongbao`）均在 HTML 中存在 `id="page-*"`。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`sendTransfer`（别名至 `confirmTransfer`）、`createGift`、`claimGift`（别名至 `submitClaim`）、`openSend`（别名至 `goHomeTransfer`）、`openReceive` 函数体均含有效逻辑（非仅注释/空行）。

## STEP 1 摘要（扫描）
- `data-ww-fn`：41 个唯一函数名（见上）。
- `id="page-*"`：`page-welcome`、`page-password-restore`、`page-create`、`page-key`、`page-key-verify`、`page-pin-setup`、`page-pin-confirm`、`page-pin-verify`、`page-home`、`page-addr`、`page-transfer`、`page-swoosh`、`page-transfer-success`、`page-settings`、`page-swap`、`page-import`、`page-hongbao`、`page-hb-keyword`、`page-claim`、`page-claimed`、`page-hb-records`、`page-faq`。
- `data-ww-go`：见 TEST-B。
- `wallet.runtime.js` + `wallet.ui.js`：以 `function` 声明为主；runtime 尾部统一暴露回调与 `sendTransfer`/`claimGift`/`openSend`/`openReceive` 别名。
- `wallet.css`：花括号平衡（`{` 与 `}` 各 330）。

## STEP 2 摘要（架构）
- 脚本顺序：`safeLog` → `ethers`/`scrypt` → `api-config` → `storage` → `wallet.derive.paths` → `security` → `wallet.js` → `wordlists` → `wallet.core` → `wallet.ui` → `wallet.addr` → `wallet.tx` → `wallet.runtime` → `wallet.dom-bind`，依赖链合理。
- 全局覆盖：runtime 后加载，覆盖 ui 中同名 `goTo`/`goTab` 等；地址/交易能力由 `wallet.addr.js`/`wallet.tx.js` 注入。

## STEP 3 摘要（静态风险提示）
- `getElementById` 后多数有判空或 `_safeEl` 兜底；未发现必现崩溃级遗漏。
- `wallet.dom-bind.js` 中 `data-ww-go-opts` 的 `JSON.parse` 已 try-catch。
