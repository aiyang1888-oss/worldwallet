# Round 1 修复报告 - 2026-04-07 23:54

## 发现的问题
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 存在大量同名全局函数；后加载的 `wallet.runtime.js` 覆盖前者，属预期加载顺序，但增加维护成本。
- [P3] `wallet.html` 底部捕获阶段 `data-ww-fn` 委托与 `wallet.dom-bind.js` 冒泡委托并存；当前依赖捕获阶段 `stopPropagation`，底栏等特殊分支以实际运行路径为准。

## 修复内容
- 本轮 **无新增代码 patch**：静态测试 TEST-A/B/C 均通过；历史提交 `7a717e5` 已移除 `wallet.runtime.js` 内重复的 `loadBalances` / `getPrices`，保留 `wallet.tx.js` 实现。

## 修改文件
- `reports/round_1.md`（本报告）

## 剩余问题
- 无阻塞性 P0–P2；长期可考虑合并 UI/Runtime 重复逻辑或命名空间化（非本轮范围）。

## 测试结果
- TEST-A: PASS — `data-ww-fn` 共 41 项，均在项目 `*.js` 中存在对应 `function name` / `window.name` 定义；`wallet.runtime.js` 末尾 `wwExposeDataWwFnHandlers` 将关键处理器挂到 `window`。
- TEST-B: PASS — `data-ww-go` 所列 `page-*` 均在 `wallet.html` 中存在 `id="page-…"`。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`createGift`、`submitClaim` 及别名 `sendTransfer`→`confirmTransfer`、`claimGift`→`submitClaim`、`openSend`→`goHomeTransfer`、`openReceive`→`goTab('tab-addr')` 均含实质逻辑。

## STEP 1 摘录
- `wallet.css` 花括号：`{` 与 `}` 均为 330，平衡。
- 脚本顺序：`safeLog` → CDN → `api-config` → `storage` → `wallet.derive.paths` → `security` → `core/wallet` → `wordlists` → `wallet.core` → `wallet.ui` → `wallet.addr` → `wallet.tx` → `wallet.runtime` → `wallet.dom-bind`，与依赖一致。
- `page-home` 进入路径：`wallet.runtime.js` 中 `goTo('page-home')` 在 `wwWalletHasAnyChainAddress` / `loadWallet()` 失败时回退 `page-welcome`，并控制底栏显示。
