# Round 1 修复报告 - 2026-04-08 02:25

## 发现的问题
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 存在大量同名全局函数重复定义；脚本顺序为 `wallet.ui.js` → `wallet.addr.js` → `wallet.tx.js` → `wallet.runtime.js`，后者覆盖前者，当前 `wwExposeDataWwFnHandlers` 已显式将 `data-ww-fn` 所需回调挂到 `window`，行为一致，但长期维护成本高。
- [P3] `wallet.css` 花括号已核对平衡（`{` 与 `}` 各 330）。

## 修复内容
- 文件：无（STEP 4/8 自动化绑定与核心函数非空检查均通过，无 P0–P2 必改项）
- 函数：—
- 修改：—

## 修改文件
- `reports/round_1.md`

## 剩余问题
- 无（架构层重复定义可作为后续重构项，不影响本轮测试结论）

## 测试结果
- TEST-A: PASS — `wallet.html` 中 41 个 `data-ww-fn` 均在工程 JS 中有对应 `function` / `window.*` 定义（`wallet.runtime.js` 末尾集中暴露）。
- TEST-B: PASS — 全部 `data-ww-go` 目标（如 `page-create`、`page-password-restore`、`page-import`、`page-welcome`、`page-faq`、`page-key-verify`、`page-pin-setup`、`page-settings`、`page-home`、`page-claim`、`page-hb-records`、`page-hongbao`）均在 HTML 中存在 `id="page-*"`。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`sendTransfer`、`createGift`、`claimGift`、`openSend`、`openReceive` 函数体均含有效逻辑（非仅注释/空行）。

## STEP 1 摘要（扫描）
- `data-ww-fn`：41 个唯一函数名（见上测试）。
- `id="page-*"`：`page-welcome`、`page-password-restore`、`page-create`、`page-key`、`page-key-verify`、`page-pin-setup`、`page-pin-confirm`、`page-pin-verify`、`page-home`、`page-addr`、`page-transfer`、`page-swoosh`、`page-transfer-success`、`page-settings`、`page-swap`、`page-import`、`page-hongbao`、`page-hb-keyword`、`page-claim`、`page-claimed`、`page-hb-records`、`page-faq`。
- `data-ww-go`：见 TEST-B。
- `wallet.runtime.js` / `wallet.ui.js`：全局函数以 `function` 声明与 `window.*` 赋值为主；`wallet.runtime.js` 尾部统一挂出 `data-ww-fn` 与别名。
- `wallet.css`：花括号平衡。
