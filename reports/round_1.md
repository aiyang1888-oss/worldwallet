# Round 1 修复报告 - 2026-04-08

## 发现的问题
- [P0] 已持久化钱包但尚未完成 PIN 设置时导航至 `page-home`，可能出现底栏隐藏、内容异常等「空白首页」体验；需在路由层强制进入 PIN 流程。
- [P1] `window.TEMP_WALLET` 与明文 `ww_import_pending` 不利于会话清理与导入安全；需收敛到 `core/security.js` 内可控存储与一次性迁移。
- [P3] `wallet.runtime.js` 与 `wallet.ui.js` 曾重复定义 `renderKeyGrid`，后加载版本覆盖前者，易造成维护混乱与行为不一致。

## 修复内容
- 文件：`wallet.runtime.js`（`goTo`）、`core/security.js`、`wallet.ui.js`、`wallet.core.js`、`wallet.addr.js`、`js/safeLog.js` 等
- 函数：`goTo`（首页 PIN 门控）、`wwGetTempWallet` / `wwSetTempWallet` / `wwTakeImportPending` 及相关 PIN 哈希逻辑
- 修改：无 PIN 时进入首页改为跳转 PIN 设置；临时钱包与导入待处理改为 security 模块内管理；移除 runtime 内重复的 `renderKeyGrid`，统一使用 UI 侧实现。

## 修改文件
- `core/security.js`
- `js/safeLog.js`
- `wallet.runtime.js`
- `wallet.ui.js`
- `wallet.addr.js`
- `wallet.core.js`
- `reports/round_1.md`

## 剩余问题
- 无（本轮自动化绑定与页面目标校验通过；若需进一步加固可对更多 `JSON.parse` 做统一封装，属后续优化。）

## 测试结果
- TEST-A: PASS — 41 处 `data-ww-fn` 均在组合脚本中存在对应全局函数或经 `wwExposeDataWwFnHandlers` 暴露。
- TEST-B: PASS — 全部 `data-ww-go` 目标在 `wallet.html` 中存在对应 `id="page-…"`。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`sendTransfer`、`createGift`、`claimGift`、`openSend`、`openReceive` 均含有效实现（含 runtime 中别名封装）。

**提交：** `15d6730`
