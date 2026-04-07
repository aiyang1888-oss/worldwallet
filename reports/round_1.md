# Round 1 修复报告 - 2026-04-07 21:56

## 发现的问题

- [P3] `wallet.tx.js` 与 `wallet.runtime.js` 均声明 `loadBalances`、`loadTxHistory`、`confirmTransfer` 等全局函数；加载顺序以 `wallet.runtime.js` 为准（后者覆盖前者），易造成维护时误改「无效」副本。
- [P3] `wallet.css` 中存在 `#settingsWalletTitle` 等选择器，当前 `wallet.html` 无对应节点，属无效规则（不影响运行）。
- [P3] `wallet.html` 内联 `click` 捕获阶段委托与 `wallet.dom-bind.js` 冒泡阶段并存；对带 `data-ww-fn` 的点击由捕获脚本 `stopPropagation`，与底栏导航分工明确，无重复触发问题。

## 修复内容

- 文件：无
- 函数：无
- 修改：本轮静态测试（TEST-A/B/C）全部通过，未引入代码变更

## 修改文件

- 无

## 剩余问题

- P3：`wallet.tx.js` 与 `wallet.runtime.js` 全局函数重复定义，长期建议合并或重命名内部实现以减少歧义。

## 测试结果

- TEST-A: PASS — `data-ww-fn` 共 41 个，均在 `wallet.runtime.js` + `wallet.ui.js` 中有对应 `function`/`async function` 声明，且 `wwExposeDataWwFnHandlers` / `wwExposeCoreAliases` 将所需名称挂到 `window`（含 `sendTransfer`、`claimGift`、`openSend`、`openReceive` 别名）。
- TEST-B: PASS — 所有 `data-ww-go` 目标（如 `page-welcome`、`page-create`、`page-password-restore`、`page-import`、`page-home`、`page-settings`、`page-claim`、`page-hb-records`、`page-hongbao` 等）均存在 `id="page-*"` 页面节点。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`createGift` 等均有非空实现体；`sendTransfer`/`claimGift`/`openSend`/`openReceive` 由 `wallet.runtime.js` 末尾别名块映射到既有函数。

### STEP 1 摘要（扫描）

- **data-ww-fn**：41 个唯一函数名（见 `wallet.html` grep）。
- **id="page-*"**：`page-welcome`、`page-password-restore`、`page-create`、`page-key`、`page-key-verify`、`page-pin-setup`、`page-pin-confirm`、`page-pin-verify`、`page-home`、`page-addr`、`page-transfer`、`page-swoosh`、`page-transfer-success`、`page-settings`、`page-swap`、`page-import`、`page-hongbao`、`page-hb-keyword`、`page-claim`、`page-claimed`、`page-hb-records`、`page-faq`。
- **data-ww-go**：均指向上述已存在页面 id。
- **wallet.css**：花括号 `{` 与 `}` 各 330，平衡。
- **window / function**：`wallet.runtime.js` 含大量顶层 `function` 及文件末尾 `wwExposeDataWwFnHandlers`；`wallet.ui.js` 含 `createNewWallet`、`createGift` 等与 runtime 互补的全局函数。

### STEP 2 摘要（架构）

- **脚本顺序**：`safeLog` → `ethers`/`scrypt` → `api-config` → `storage` → `wallet.derive.paths` → `core/security` → `core/wallet` → `wordlists` → `wallet.core` → `wallet.ui` → `wallet.addr` → `wallet.tx` → `wallet.runtime` → `wallet.dom-bind`，依赖关系合理。
- **全局覆盖**：同一全局名以最后加载文件为准（当前为 `wallet.runtime.js`），属已知模式。

### STEP 3 摘要（逻辑模式抽查）

- `goTo('page-home')` 已对无钱包情况重定向 `page-welcome` 并尝试 `loadWallet()`；`JSON.parse(localStorage.getItem('ww_wallet'))` 在关键路径多带 `try/catch`。
- `confirmPin`、`pinVerifyEnterWallet`、`submitPageRestorePin` 等对 DOM 与 `verifyPin`/`saveWalletSecure` 的处理完整。
