# Round 1 修复报告 - 2026-04-07 21:41

## 发现的问题
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 均声明 `submitPageRestorePin`，后加载的 runtime 会覆盖前者，UI 副本为死代码，易造成后续修改不同步。
- [P3] `wallet.ui.js` / `wallet.runtime.js` / `wallet.tx.js` 中存在多组同名全局函数（如 `goTo`、`doTransfer`、`confirmTransfer`），最终以 `wallet.runtime.js` 为准，属架构冗余（未在本次修改）。
- [P3] `wallet.css` 花括号已平衡（开/闭均为 329）。
- [STEP 2] 脚本顺序：`storage.js` → `core/*` → `wallet.core.js` → `wallet.ui.js` → `wallet.addr.js` → `wallet.tx.js` → `wallet.runtime.js` → `wallet.dom-bind.js`，与运行时覆盖策略一致。

## 修复内容
- 文件：`wallet.ui.js`
- 函数：`submitPageRestorePin`（删除本文件中的重复实现）
- 修改：移除已由 `wallet.runtime.js` 提供的重复 `submitPageRestorePin`，避免双份逻辑分叉。

## 修改文件
- `wallet.ui.js`

## 剩余问题
- 其他文件间仍存在同名函数重复定义（由加载顺序覆盖），若需彻底收敛需在后续轮次分批删除死代码或合并模块。

## 测试结果
- TEST-A: PASS — 所有 `data-ww-fn` 均在 `wallet.runtime.js` 末尾 `wwExposeDataWwFnHandlers` / `wwExposeCoreAliases` 中挂到 `window`。
- TEST-B: PASS — 所有 `data-ww-go` 目标在 `wallet.html` 中均有对应 `id="page-*"`。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`createGift` 在 runtime/ui 中有非空实现；`sendTransfer`/`claimGift`/`openSend` 通过 runtime 别名指向 `confirmTransfer`/`submitClaim`/`goHomeTransfer`；`openReceive` 为内联函数。
