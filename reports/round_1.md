# Round 1 修复报告 - 2026-04-08 03:26

## 发现的问题
- [P1] `wallet.core.js` 中 `createRealWallet`：`if (typeof setWalletCreateStep === 'function')` 后未调用 `setWalletCreateStep(n)`，仅执行 `await walletCreateYield()`，导致创建钱包时加载遮罩上的步骤文案（1/3、2/3、3/3）从不更新。
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 存在大量同名全局函数，以后加载的 `wallet.runtime.js` 覆盖前者；依赖显式 `wwExposeDataWwFnHandlers` 将 `data-ww-fn` 处理器挂到 `window`，维护成本高。
- [P3] `wallet.css` 花括号已平衡（330 对）；`data-ww-go` 目标页均在 `wallet.html` 中存在对应 `id="page-*"`。

## 修复内容
- 文件：`wallet.core.js`
- 函数：`createRealWallet`
- 修改：在三处异步阶段分别调用 `setWalletCreateStep(1|2|3)`，再 `await walletCreateYield()`，与 `setWalletCreateStep` 内标签「1/3 生成密钥」「2/3 派生地址」「3/3 完成」一致。

## 修改文件
- `wallet.core.js`

## 剩余问题
- [P3] 双文件重复定义同一全局函数，长期建议合并或模块化以减少覆盖风险。
- [P3] 部分 `JSON.parse(localStorage...)` 未统一包在 try-catch（多数已在调用方处理）；非本轮阻断项。

## 测试结果
- TEST-A: PASS — `data-ww-fn` 所列名称在运行时由 `wallet.runtime.js` 末尾 `wwExposeDataWwFnHandlers` 挂到 `window`，或由先加载脚本中的全局函数提供；内联委托与 `wallet.dom-bind.js` 使用 `window[fn]`。
- TEST-B: PASS — 所有 `data-ww-go` 目标（如 `page-welcome`、`page-password-restore`、`page-home`、`page-hongbao` 等）在 `wallet.html` 中均有对应 `id="page-*"` 的 `.page` 容器。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`confirmTransfer`（转账确认）、`createGift`、`submitClaim`（与 `claimGift` 别名一致）、`goHomeTransfer`（与 `openSend` 别名一致）、`goTab('tab-addr')`（`openReceive`）均含非空可执行逻辑。
