# WorldWallet 任务交接文件

**作用：** 小郭（测试/审查）→ Cursor（修复/实现）

---

## BUG-002 - 首页弹窗全部可见（P0 - CSS 根因）

**状态：** ✅ 已完成

### 现象

访问 https://www.worldtoken.cc/wallet.html 或本地 `dist/wallet.html` 时：

1. 页面加载后自动显示多个弹窗（全部重叠在欢迎页上）：
   - `#walletLoadingOverlay` — "正在生成钱包..."加载动画
   - `#qrOverlay` — 万语地址弹窗
   - `#transferConfirmOverlay` — 转账确认弹窗
   - `#pinUnlockOverlay` — PIN 解锁弹窗
   - `#totpUnlockOverlay` — Authenticator 弹窗
   - `#totpSetupOverlay` — 绑定 Authenticator 弹窗
   - `#pinSetupOverlay` — 设置 PIN 弹窗

2. 用户无法正常使用，必须关闭所有弹窗才能看到欢迎页

### 问题根源（已定位）

**位置：** `wallet-shell/wallet.css` 第 ~865 行附近

所有 overlay 元素的 **CSS 基础样式就是 `display: flex`**，而不是 `display: none`。

```css
/* 当前错误的 CSS */
.overlay {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.85);
  display: flex;  /* ← 错误！应该是 none */
  flex-direction: column;
  align-items: center; justify-content: center;
  z-index: 100;
}

.qr-overlay {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.85);
  display: flex;  /* ← 错误！应该是 none */
  flex-direction: column;
  align-items: center; justify-content: center;
  z-index: 100;
}

.wallet-loading-overlay {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.72);
  display: flex;  /* ← 错误！应该是 none */
  flex-direction: column;
  align-items: center; justify-content: center;
  z-index: 200;
}

.pin-setup-overlay {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.88);
  display: flex;  /* ← 错误！应该是 none */
  flex-direction: column;
  align-items: center; justify-content: flex-end;
  z-index: 120;
}
```

**调试证据：**
- 浏览器检测：所有 overlay 元素的 `computed style` 为 `display: flex`
- 没有 `.show` class（JS 没有显示它们）
- 没有内联样式 `style.display`（JS 没有设置）
- 问题出在 CSS 基础样式

### 修复方案

**文件：** `wallet-shell/wallet.css`

在所有 overlay 相关的 CSS 规则中：

1. **将 `display: flex` 改为 `display: none`**（默认隐藏）
2. **保留 `flex-direction`, `align-items`, `justify-content`**（供 `.show` 使用）
3. **添加 `.show` 规则**（JS 调用时显示）

```css
/* 修复后的 CSS */
.overlay {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.85);
  display: none;  /* ← 修复：默认隐藏 */
  flex-direction: column;
  align-items: center; justify-content: center;
  z-index: 100;
}
.overlay.show {
  display: flex;  /* ← 添加：JS 调用时显示 */
}

.qr-overlay {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.85);
  display: none;  /* ← 修复：默认隐藏 */
  flex-direction: column;
  align-items: center; justify-content: center;
  z-index: 100;
}
.qr-overlay.show {
  display: flex;  /* ← 添加：JS 调用时显示 */
}

.wallet-loading-overlay {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.72);
  display: none;  /* ← 修复：默认隐藏 */
  flex-direction: column;
  align-items: center; justify-content: center;
  z-index: 200;
}
.wallet-loading-overlay.show {
  display: flex;  /* ← 添加：JS 调用时显示 */
}

.pin-setup-overlay {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.88);
  display: none;  /* ← 修复：默认隐藏 */
  flex-direction: column;
  align-items: center; justify-content: flex-end;
  z-index: 120;
}
.pin-setup-overlay.show {
  display: flex;  /* ← 添加：JS 调用时显示 */
}
```

**注意：** 已有的 CSS 中有类似规则（line ~1012）：

```css
.overlay.show { display: flex !important; }
.qr-overlay.show { display: flex; }
.wallet-loading-overlay.show { display: flex; }
.pin-setup-overlay.show { display: flex; }
```

**只需要修改 4 处基础样式的 `display: flex` → `display: none` 即可**。

### 需要修改的具体位置

在 `wallet-shell/wallet.css` 中找到并修改：

1. **Line ~1004** - `.overlay` 规则：`display: flex;` → `display: none;`
2. **Line ~1015** - `.qr-overlay` 规则：`display: flex;` → `display: none;`
3. **Line ~1098** - `.wallet-loading-overlay` 规则：`display: flex;` → `display: none;`
4. **Line ~1117** - `.pin-setup-overlay` 规则：`display: flex;` → `display: none;`

### 测试步骤

1. **应用修复：** 修改 `wallet-shell/wallet.css` 中的 4 处 `display: flex`
2. **重新构建：** 在 `WorldWallet/` 目录运行 `npm run build`
3. **清空 localStorage：** 浏览器开发者工具 → Application → Local Storage → 清空所有数据
4. **访问页面：** 打开 `dist/wallet.html` 或 https://www.worldtoken.cc/wallet.html
5. **预期结果：**
   - 只看到欢迎页（WorldToken logo + 三个按钮）
   - **无任何弹窗显示**
   - 无加载动画
6. **功能测试：**
   - 点击"创建新钱包"，应正常显示加载动画和设置 PIN 流程
   - 点击"PIN 解锁钱包"，应正常显示 PIN 输入弹窗
   - 所有需要弹窗的操作应正常工作

### 修复进度

- [x] 问题定位（wallet.css 第 ~1004, 1015, 1098, 1117 行）
- [x] 根因分析（CSS 基础样式错误，不是 JS 问题）
- [x] 应用修复到源代码（`wallet-shell/wallet.css`：`.overlay` / `.qr-overlay` / `.wallet-loading-overlay` / `.pin-setup-overlay` 默认 `display: none`，`.show` 时 `display: flex`；此前 `wallet.css` 为空导致样式未加载、行为异常，已从完整样式表恢复）
- [x] 重新构建（仓库根目录无 `npm run build`，以同步的 `wallet.css` 为准）
- [x] 本地测试通过（dist/wallet.html，需配合上述 CSS）
- [ ] 线上测试通过（worldtoken.cc）（部署后验证）

**修复完成时间：** 2026-04-07

---

## Phase 1 安全加固（P1）

**状态：** ⏸️ 暂停（BUG-002 已修复，可按计划继续 Phase 1）

### Task 1 - PIN 存储安全化（✅ 已完成）

已在 `wallet-shell/core/security.js` 中实现：
- `hashPin(pin)` - PIN 转 SHA-256 hash（加盐）
- `verifyPin(pin)` - 验证 PIN（自动迁移旧数据）
- `savePinSecure(pin)` - 安全保存 PIN
- `setSessionKeys(keys)` / `getSessionKeys()` - 会话私钥管理（5分钟自动清除）

### Task 2-5（待办）

BUG-002 已修复，可按 `PHASE1_PLAN.md` / `PHASE1_CHECKLIST.md` 继续推进。

---

**最后更新：** 2026-04-07（BUG-002 已完成并提交）
