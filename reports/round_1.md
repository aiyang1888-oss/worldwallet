# Round 1 修复报告 - 2026-04-08

## 发现的问题
- [P1] `confirmTransfer` 在 `broadcastRealTransfer` 失败或异常时仍调度「嗖」动画与 `page-transfer-success` 跳转，用户可能看到成功页与动画，与广播结果不一致。
- [P3] `wallet.ui.js` 与 `wallet.runtime.js` 存在大量同名全局函数，以后加载的 `wallet.runtime.js` 覆盖前者；属架构冗余但当前可运行。
- [P3] `wallet.css` 花括号已平衡（开/闭均为 330）。

## 修复内容
- 文件：`wallet.runtime.js`
- 函数：`confirmTransfer`
- 修改：将「嗖」动画与跳转 `page-transfer-success` 移入广播成功分支，仅在 `ok === true` 时执行。

## 修改文件
- `wallet.runtime.js`

## 剩余问题
- 无（本轮针对 P1 已修复；P3 架构重复未改，避免大范围重构）

## 测试结果
- TEST-A: PASS — `data-ww-fn` 所列名称均在合并后的全局函数或 `window` 暴露逻辑中有对应实现。
- TEST-B: PASS — 所有 `data-ww-go` 目标在 `wallet.html` 中均有对应 `id="page-*"`。
- TEST-C: PASS — `goToPinConfirm`、`confirmPin`、`pinVerifyEnterWallet`、`shareSuccess`、`copyKw`、`shareKw`、`showHbQR`、`copyShareText` 在 `wallet.runtime.js` 中有实质函数体；`sendTransfer`/`claimGift`/`openSend`/`openReceive` 由 `wwExposeCoreAliases` 映射；`createGift` 由先加载的 `wallet.ui.js` 提供并保持全局可用。
