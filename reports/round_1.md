# Round 1 修复报告 - 2026-04-08 05:03

## 发现的问题
- [P2] `wallet.ui.js` 中 `changeCount` 对 `hbCountVal` 无空值判断：在精简版 `wallet.html` 无对应节点时可能抛错；且与同名的 `wallet.runtime.js` 实现不一致（runtime 已使用安全写法）。

## 修复内容
- 文件：wallet.ui.js
- 函数：changeCount
- 修改：与 runtime 对齐——先 `getElementById` 再写入 `textContent`，并分别更新 `hbCountVal` / `hbCountDisplay`。

## 修改文件
- wallet.ui.js

## 剩余问题
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 仍存在大量同名全局函数，由后加载的 runtime 覆盖；属架构层面，本轮仅对齐一处易错分支。
- [P3] 未对 `wallet.html` 中全部 `class` 与 `wallet.css` 做穷尽对照。

## 扫描摘要（STEP 1）
- `data-ww-fn`：41 个唯一处理器名（示例：createNewWallet、goToPinConfirm、submitClaim、pinUnlockBackspace 等）。
- `id="page-*"`：page-welcome、page-password-restore、page-create、page-key、page-key-verify、page-pin-setup、page-pin-confirm、page-pin-verify、page-home、page-addr、page-transfer、page-swoosh、page-transfer-success、page-settings、page-swap、page-import、page-hongbao、page-hb-keyword、page-claim、page-claimed、page-hb-records、page-faq。
- `data-ww-go`：12 个唯一目标（page-create、page-password-restore、page-import、page-faq、page-key-verify、page-pin-setup、page-settings、page-home、page-claim、page-hb-records、page-hongbao）。
- `wallet.css`：花括号开/闭均为 330，平衡。
- `wallet.runtime.js` + `wallet.ui.js`：大量 `function X()` / `window.X =`（runtime 末尾 `wwExposeDataWwFnHandlers` 显式挂出 data-ww-fn 与 dom-bind 所需名）。

## 测试结果
- TEST-A: PASS — 全部 `data-ww-fn` 在已加载脚本中有对应全局函数定义。
- TEST-B: PASS — 全部 `data-ww-go` 在 `wallet.html` 中存在对应 `id="page-*"`。
- TEST-C: PASS — 所列核心函数均具非空实现（含 runtime 中别名函数）。
