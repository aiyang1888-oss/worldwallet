# Round 1 修复报告 - 2026-04-08 01:26

## 发现的问题
- [P1] `wallet.dom-bind.js` 中 `wwCall` 调用 `async` 表单/动作处理器时未处理返回的 Promise，若内部 `await` 抛错会产生未捕获的 rejection（影响 `submitPageRestorePin`、`confirmPin` 等由 `bindFormSubmit` / 其它绑定触发的异步流程）。
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 存在大量同名全局函数，后加载文件覆盖前者；维护时需以 `wallet.runtime.js` 为准（本轮未改结构，仅记录）。

## 修复内容
- 文件：`wallet.dom-bind.js`
- 函数：`wwCall`
- 修改：对同步错误记录日志；若返回值为 Promise 则附加 `.catch`，将异步错误交给 `safeLog`，避免未处理的 Promise rejection。

## 修改文件
- `wallet.dom-bind.js`

## 剩余问题
- 无（本轮范围内无阻塞项；P3 架构重复属长期重构范畴）

## 测试结果
- TEST-A: PASS — `data-ww-fn` 共 41 个，均在 JS 中有 `function`/赋值定义。
- TEST-B: PASS — 全部 `data-ww-go` 目标在 HTML 中存在对应 `id="page-*"`。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`sendTransfer`、`createGift`、`claimGift`、`openSend`、`openReceive` 在 `wallet.runtime.js` / `wallet.ui.js` 中均有非空实现（含别名包装函数）。
