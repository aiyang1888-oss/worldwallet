# Round 1 修复报告 - 2026-04-08 03:53

## 发现的问题
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 中存在大量同名全局函数（如 `goTo`），实际以**后加载**的 `wallet.runtime.js` 为准；长期维护时若只改其一易产生行为分叉（当前 TEST-A/B/C 均通过，非阻塞）。

## 修复内容
- 文件：无（本轮静态分析与 TEST-A/B/C 未暴露 P0–P2 缺陷）
- 函数：—
- 修改：代码库无需变更；本报告仅记录扫描与测试结果

## 修改文件
- reports/round_1.md

## 剩余问题
- [P3] 同上：可考虑后续将「以 `wallet.runtime.js` 为唯一实现源」写入维护说明，或收敛重复定义。

## 测试结果
- TEST-A: PASS — 41 个 `data-ww-fn` 均在项目 JS 中有对应顶层 `function` / `async function`；`wallet.runtime.js` 末尾 `wwExposeDataWwFnHandlers` / `wwExposeCoreAliases` 将所需处理器挂到 `window`（`deleteWalletRow` 等由 `wallet.dom-bind.js` 特判处理，不依赖 `window[fn]`）。
- TEST-B: PASS — 12 个 `data-ww-go` 目标均在 `wallet.html` 中存在对应 `id="page-*"`。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`sendTransfer`、`createGift`、`claimGift`、`openSend`、`openReceive` 函数体均含有效逻辑（非空/非仅注释）。

---

## STEP 1 扫描摘要

### `data-ww-fn`（41）
createNewWallet, startVerify, checkVerify, goToPinConfirm, confirmPin, pinVerifyEnterWallet, promptWalletNotifications, copyHomeAddr, goHomeTransfer, loadTxHistory, copyNative, openCustomizeAddr, hideQR, doTransfer, closeTransferConfirm, confirmTransfer, shareSuccess, openPinSettingsDialog, wwOpenBackupFromSettings, deleteWalletRow, wwSwapRecordsToast, setSwapMax, doSwap, doImportWallet, createGift, copyHbCreatedKeyword, shareHbCreatedKeyword, copyKw, shareKw, showHbQR, copyShareText, submitClaim, pinUnlockBackspace, pinUnlockClear, closePinUnlock, submitTotpUnlock, closeTotpUnlock, confirmTotpSetup, closeTotpSetup, closePinSetupOverlay, wwHideHbSuccessOverlay

### `id="page-*"`（22）
page-welcome, page-password-restore, page-create, page-key, page-key-verify, page-pin-setup, page-pin-confirm, page-pin-verify, page-home, page-addr, page-transfer, page-swoosh, page-transfer-success, page-settings, page-swap, page-import, page-hongbao, page-hb-keyword, page-claim, page-claimed, page-hb-records, page-faq

### `data-ww-go`（12）
page-create, page-password-restore, page-import, page-welcome, page-faq, page-key-verify, page-pin-setup, page-settings, page-home, page-claim, page-hb-records, page-hongbao

### `wallet.ui.js` + `wallet.runtime.js` 全局绑定
- 运行时末尾 IIFE 将 `goTo`、`checkVerify`、PIN/转账/礼物等相关名显式赋给 `window`；`wallet.dom-bind.js` 通过 `window[fn]` 或特判分支调用。

### `wallet.css` 花括号
- `{` 与 `}` 各 **330**，平衡。

---

## STEP 2 架构简评
- **脚本顺序**（`wallet.html`）：`js/storage.js` → `core/security.js` → `core/wallet.js` → `wallet.core.js` → `wallet.ui.js` → `wallet.addr.js` → `wallet.tx.js` → `wallet.runtime.js` → `wallet.dom-bind.js`。依赖 ethers/scrypt、存储与安全模块先于 UI/运行时，顺序合理。
- **同名函数**：`wallet.runtime.js` 覆盖 `wallet.ui.js` 中同名实现，属 P3 维护风险，非当前功能错误。
- **HTML class**：抽样与类名启发式检查未发现「HTML 使用但 `wallet.css` 无对应规则」的明显遗漏。

## STEP 3 逻辑扫描（抽样）
- `getElementById` / `JSON.parse` / `async-await` / `REAL_WALLET`+`saveWalletSecure` 等模式在关键路径上多数已有防护或与既有报告一致；本轮未发现需立即以单 patch 修复的 P1 级必修复项。
