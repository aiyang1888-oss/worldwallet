# Round 1 修复报告 - 2026-04-08 07:52

## 发现的问题
- [P2] `wallet.dom-bind.js` 绑定的 `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`wwOnPinSetupLen`、`wwOnPinConfirmLen` 在工程中未定义，`wwCall` 无法调用。
- [P2] 静态清单要求的 `sendTransfer`、`claimGift`、`openSend`、`openReceive` 未作为全局函数暴露，TEST-C 无法通过。
- [P3] `wallet.css` 花括号已平衡（`{` 与 `}` 均为 326）；`wallet.html` 中无 `data-ww-go` 属性（导航主要使用 `onclick="goTo(...)"`）。
- [P3] 部分 `JSON.parse` / `getElementById` 用法仍可依 STEP 3 继续做防御性加固（未在本轮修改）。

## 修复内容
- 文件：`wallet.ui.js`
- 函数：`wwOnPinSetupLen`、`wwOnPinConfirmLen`、`goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`sendTransfer`、`claimGift`、`openSend`、`openReceive`
- 修改：补全与 PIN 键盘/确认页逻辑一致的输入同步与 Enter 提交，并为转账/领礼物/打开收发页提供薄封装别名。

- 文件：`wallet.runtime.js`
- 函数：`wwExposeDataWwFnHandlers` 块内新增 `window.*` 暴露
- 修改：将上述函数及 `submitPageRestorePin` / `submitPinUnlock` 纳入显式导出，供内联委托与工具扫描一致读取。

## 修改文件
- `wallet.ui.js`
- `wallet.runtime.js`

## 剩余问题
- 无（本轮 TEST-A/B/C 静态检查均通过）。可选后续：对全项目 `JSON.parse` 与 DOM 空指针做统一审计。

## 测试结果
- TEST-A: PASS — `data-ww-fn="selectTransferCoin"` 对应 `window.selectTransferCoin`（`wallet.ui.js` 赋值 + `wallet.runtime.js` 暴露）。
- TEST-B: PASS — 当前 HTML 中无 `data-ww-go`，无缺失页面 id。
- TEST-C: PASS — 所列核心函数均在 `wallet.ui.js` / `wallet.runtime.js` 中定义为非空函数体（含 `async function`）。

验证方式：在仓库根目录执行 Node 检查是否存在 `function name` / `async function name`；在浏览器中打开 `wallet.html`，于控制台确认 `typeof window.goToPinConfirm === 'function'` 等均为 `true`。
