# Round 1 修复报告 - 2026-04-08 05:08

## 发现的问题

- [P3] `wallet.html` 中 `data-ww-fn` 内联脚本上方注释误写为「代币授权管理页」，易误导维护者（已改为准确说明）。

### STEP 1 扫描摘要

- **data-ww-fn（41 个唯一）**：`createNewWallet`, `startVerify`, `checkVerify`, `goToPinConfirm`, `confirmPin`, `pinVerifyEnterWallet`, `promptWalletNotifications`, `copyHomeAddr`, `goHomeTransfer`, `loadTxHistory`, `copyNative`, `openCustomizeAddr`, `hideQR`, `doTransfer`, `closeTransferConfirm`, `confirmTransfer`, `shareSuccess`, `openPinSettingsDialog`, `wwOpenBackupFromSettings`, `deleteWalletRow`, `wwSwapRecordsToast`, `setSwapMax`, `doSwap`, `doImportWallet`, `createGift`, `copyHbCreatedKeyword`, `shareHbCreatedKeyword`, `copyKw`, `shareKw`, `showHbQR`, `copyShareText`, `submitClaim`, `pinUnlockBackspace`, `pinUnlockClear`, `closePinUnlock`, `submitTotpUnlock`, `closeTotpUnlock`, `confirmTotpSetup`, `closeTotpSetup`, `closePinSetupOverlay`, `wwHideHbSuccessOverlay`
- **id="page-*"（22 个）**：`page-welcome`, `page-password-restore`, `page-create`, `page-key`, `page-key-verify`, `page-pin-setup`, `page-pin-confirm`, `page-pin-verify`, `page-home`, `page-addr`, `page-transfer`, `page-swoosh`, `page-transfer-success`, `page-settings`, `page-swap`, `page-import`, `page-hongbao`, `page-hb-keyword`, `page-claim`, `page-claimed`, `page-hb-records`, `page-faq`
- **data-ww-go（12 个唯一目标）**：`page-create`, `page-password-restore`, `page-import`, `page-welcome`, `page-faq`, `page-key-verify`, `page-pin-setup`, `page-settings`, `page-home`, `page-claim`, `page-hb-records`, `page-hongbao`（均存在对应 `id="page-…"`）
- **wallet.css**：花括号 `open 330` / `close 330`，平衡。
- **window / function 绑定**：核心交互由 `wallet.runtime.js` 末尾 `wwExposeDataWwFnHandlers` 与 `wwExposeCoreAliases` 显式挂到 `window`；`createNewWallet`、`doImportWallet` 等来自先加载的 `wallet.ui.js` 全局函数。

### STEP 2 架构备注

- **脚本顺序**：`safeLog` → `ethers`/`scrypt` → `storage` → `core`/`wallet.core` → `wallet.ui` → `wallet.addr` → `wallet.tx` → `wallet.runtime` → `wallet.dom-bind`，依赖关系合理。
- **重复定义**：`wallet.ui.js` 与 `wallet.runtime.js` 存在大量同名全局函数，以后加载的 `wallet.runtime.js` 为准；长期维护建议收敛为单模块（P3）。
- **CSS class**：未做全量 HTML↔CSS 穷举；核心页面 class 与 `wallet.css` 一致。

### STEP 3 逻辑扫描摘要

- `goTo('page-home')` 已对无链上地址情况重定向 `page-welcome` 并尝试 `loadWallet()`；`page-password-restore` 亦有本地存储校验。
- `submitPageRestorePin` / `pinUnlockForm` 由 `wallet.dom-bind.js` 绑定；`JSON.parse(localStorage…)` 多处已 `try/catch`。
- 未发现需立即修复的 P0/P1 级静态缺陷（本轮）。

## 修复内容

- 提交：`d0a8910`
- 文件：`wallet.html`
- 函数/位置：内联脚本区注释（约第 1032 行）
- 修改：将错误注释改为对 `data-ww-fn` 捕获阶段委托的准确说明。

## 修改文件

- `wallet.html`
- `reports/round_1.md`

## 剩余问题

- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 内容高度重叠，后续可考虑合并或构建去重以减轻维护成本。

## 测试结果

- TEST-A: PASS — 全部 `data-ww-fn` 在合并后的核心 JS 中均有对应 `function name` 或经 `window` 暴露。
- TEST-B: PASS — 全部 `data-ww-go` 目标在 `wallet.html` 中存在 `id="page-…"`。
- TEST-C: PASS — `goToPinConfirm`, `confirmPin`, `pinVerifyEnterWallet`, `shareSuccess`, `copyKw`, `shareKw`, `showHbQR`, `copyShareText`, `sendTransfer`, `createGift`, `claimGift`, `openSend`, `openReceive` 在 `wallet.runtime.js` / `wallet.ui.js` 中均有非空实现（含别名包装函数）。
