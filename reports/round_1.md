# Round 1 修复报告 - 2026-04-07 22:18

## 发现的问题
- [P1] `setTransferMax`：`getElementById('transferAmount')` 或 `transferCoin` 未就绪时直接赋值可能抛错，导致转账页「全部」等路径异常。
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 存在大量同名函数；后者后加载并覆盖前者（如 `goTo`），后续修改需以 runtime 为准，否则易误判。
- [P3] `wallet.html` 底部内联脚本与 `wallet.dom-bind.js` 均处理 `data-ww-fn`；内联在捕获阶段匹配且 `stopPropagation` 时由该通道优先处理，行为需与 dom-bind 保持一致。

## 修复内容
- 文件：`wallet.runtime.js`
- 函数：`setTransferMax`
- 修改：对 `#transferAmount` 与 `transferCoin` 做空值判断后再写入并调用 `calcTransferFee`。

## 修改文件
- `wallet.runtime.js`

## 剩余问题
- 无（本轮自动化绑定/导航/核心别称测试均通过；P3 项为长期架构注意点，未作为本轮代码修改范围）。

## 测试结果
- TEST-A: PASS — 所有 `data-ww-fn` 均有 `window` 暴露或全局函数定义（`wallet.runtime.js` 末尾 `wwExposeDataWwFnHandlers` + `wallet.ui.js` 中仅 ui 定义的函数如 `createGift`/`submitClaim`）。
- TEST-B: PASS — 所有 `data-ww-go` 目标在 `wallet.html` 中均存在对应 `id="page-*"`。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText`、`sendTransfer`、`createGift`、`claimGift`、`openSend`、`openReceive` 均非空且可解析。

## 附录：STEP 1 扫描摘要
- **data-ww-fn（41 处）**：含 `createNewWallet`、`startVerify`、`checkVerify`、`goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`copyHomeAddr`、`goHomeTransfer`、`loadTxHistory`、`doTransfer`、`confirmTransfer`、`createGift`、`submitClaim`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText` 等。
- **id="page-*"**：`page-welcome`、`page-password-restore`、`page-create`、`page-key`、`page-key-verify`、`page-pin-setup`、`page-pin-confirm`、`page-pin-verify`、`page-home`、`page-addr`、`page-transfer`、`page-swoosh`、`page-transfer-success`、`page-settings`、`page-swap`、`page-import`、`page-hongbao`、`page-hb-keyword`、`page-claim`、`page-claimed`、`page-hb-records`、`page-faq`。
- **data-ww-go**：均指向上述页面 id。
- **wallet.css**：花括号 `330` 对 `330`，平衡。
- **STEP 2**：脚本顺序为 `storage.js` → `core/*` → `wallet.core.js` → `wallet.ui.js` → `wallet.addr.js` → `wallet.tx.js` → `wallet.runtime.js` → `wallet.dom-bind.js`，与依赖关系一致。
