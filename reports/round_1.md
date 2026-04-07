# Round 1 修复报告 - 2026-04-08 03:41

## 发现的问题
- [P1] `wallet.ui.js` 中存在与 `wallet.runtime.js` 重复的 `openPinSettingsDialog`：旧实现将 PIN 明文写入 `localStorage`，与运行时 `savePinSecure` 路径不一致，且脚本加载顺序下为死代码，易造成维护与安全误解。

## 修复内容
- 文件：`wallet.ui.js`
- 函数：`openPinSettingsDialog`（已删除过时存根）
- 修改：移除明文 PIN 存根，仅保留注释说明由 `wallet.runtime.js` 提供实现。

## 修改文件
- `wallet.ui.js`

## 剩余问题
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 仍存在大量同名全局函数，依赖「后加载文件覆盖」；后续可考虑收敛为单模块导出以降低维护成本（非本轮范围）。

## 测试结果
- TEST-A: PASS — `wallet.html` 中全部 `data-ww-fn` 均在 JS 中有对应 `function` / `window.*` 暴露。
- TEST-B: PASS — 全部 `data-ww-go` 目标均存在 `id="page-*"` 页面节点。
- TEST-C: PASS — 所列核心函数（含别名 `sendTransfer` / `claimGift` / `openSend` / `openReceive`）函数体均非空。
