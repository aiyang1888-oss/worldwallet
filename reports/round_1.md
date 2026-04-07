# Round 1 修复报告 - 2026-04-07 20:33

## 发现的问题
- [P2] `wallet.ui.js` 中 `goTo('page-home')` 分支用 `REAL_WALLET.ethAddress` 作为 `updateQRCode` 的前置条件，与同文件下方「勿仅用 ethAddress」注释及 `wallet.runtime.js` 中 `wwWalletHasAnyChainAddress` 不一致；在仅存在 TRX/BTC 链上地址时可能导致首页收款二维码刷新被跳过（与「page-home 空白/不完整」类问题同源）。
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 存在大段重复的 `goTo`、`submitPageRestorePin` 等定义，后者加载顺序在后并覆盖全局绑定，增加维护成本（本轮未改动结构）。
- [P3] 脚本链依赖 ethers CDN；离线时创建钱包会失败（已知环境限制）。

## 修复内容
- 文件：`wallet.ui.js`
- 函数：`goTo`（`pageId === 'page-home'` 分支）
- 修改：将首页 `updateQRCode` 的触发条件改为 `wwWalletHasAnyChainAddress(REAL_WALLET)`，与 runtime 及余额/历史加载逻辑一致。

## 修改文件
- `wallet.ui.js`

## 剩余问题
- `wallet.ui.js` / `wallet.runtime.js` 重复逻辑可后续收敛为单模块，避免双份 `goTo` 漂移。
- 未运行浏览器 E2E；建议在真机验证首页与收款二维码在仅 TRX 钱包场景下的表现。

## 测试结果
- TEST-A: PASS — `data-ww-fn` 所列函数均在已扫描 JS 中有对应全局函数定义（含 runtime 末尾显式挂到 `window` 的处理器）。
- TEST-B: PASS — `data-ww-go` 目标均存在 `id="page-*"` 页面节点。
- TEST-C: PASS — 所列核心函数均有非空实现；`sendTransfer`/`claimGift`/`openSend` 为 runtime 中指向 `confirmTransfer`/`submitClaim`/`goHomeTransfer` 的别名，`openReceive` 为内联函数并调用 `goTab('tab-addr')`。
