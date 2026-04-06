# Phase 1 安全加固 — 实施检查清单

> 状态更新：2026-04-06 22:35
> 负责人：小郭 + 老郭

---

## ✅ Task 1: PIN 存储安全化（已完成）

**文件：** `wallet-shell/core/security.js`

**已添加的函数：**
- [x] `hashPin(pin)` — PIN 转 SHA-256 hash
- [x] `verifyPin(pin)` — 验证 PIN（自动迁移旧数据）
- [x] `savePinSecure(pin)` — 安全保存 PIN
- [x] `setSessionKeys(keys)` — 设置会话私钥（5分钟自动清除）
- [x] `getSessionKeys()` — 获取会话私钥
- [x] `clearSessionKeys()` — 手动清除会话私钥
- [x] `isSessionUnlocked()` — 检查会话是否已解锁

---

## 🔄 Task 2: 代码适配（需要修改调用方）

### 2.1 查找所有 PIN 相关调用

需要检查的文件：
- `wallet-shell/index.html`
- `wallet-shell/wallet.runtime.js`
- `wallet-shell/wallet.core.js`
- `wallet-shell/wallet.ui.js`

### 2.2 替换规则

| 旧代码 | 新代码 | 说明 |
|--------|--------|------|
| `Store.setPin(pin)` | `await savePinSecure(pin)` | 保存 PIN |
| `Store.getPin()` | ❌ 删除 | 不再明文读取 |
| `pin === Store.getPin()` | `await verifyPin(pin)` | 验证 PIN |
| `localStorage.setItem('ww_pin', ...)` | `await savePinSecure(pin)` | 直接保存 |
| `localStorage.setItem('ww_unlock_pin', ...)` | `await savePinSecure(pin)` | 修复 key 不一致 |

### 2.3 需要修改的场景

**场景 1：设置 PIN 页面**
```javascript
// 旧代码
function setupPinDone() {
  var pin = getInputPin();
  Store.setPin(pin); // ❌
  goTo('page-home');
}

// 新代码
async function setupPinDone() {
  var pin = getInputPin();
  await savePinSecure(pin); // ✅
  goTo('page-home');
}
```

**场景 2：验证 PIN（解锁钱包）**
```javascript
// 旧代码
function unlockWallet() {
  var pin = getInputPin();
  if (pin !== Store.getPin()) { // ❌
    showToast('PIN 错误');
    return;
  }
  // ... 解锁逻辑
}

// 新代码
async function unlockWallet() {
  var pin = getInputPin();
  var valid = await verifyPin(pin); // ✅
  if (!valid) {
    showToast('PIN 错误');
    return;
  }
  
  // 解锁钱包，设置会话私钥
  var sensitive = await decryptWalletSensitive(pin);
  if (sensitive) {
    setSessionKeys(sensitive); // ✅ 私钥存闭包，不存全局
  }
  
  // ... 其他逻辑
}
```

**场景 3：创建钱包后保存**
```javascript
// 旧代码
async function confirmCreateWallet() {
  var pin = getInputPin();
  Store.setPin(pin); // ❌
  saveWallet(TEMP_WALLET); // ❌ 明文保存
  goTo('page-home');
}

// 新代码
async function confirmCreateWallet() {
  var pin = getInputPin();
  await savePinSecure(pin); // ✅
  await saveWalletSecure(TEMP_WALLET, pin); // ✅ 加密保存
  
  // 钱包已加密保存，设置会话私钥以便立即使用
  setSessionKeys({
    mnemonic: TEMP_WALLET.mnemonic,
    ethKey: TEMP_WALLET.eth.privateKey,
    trxKey: TEMP_WALLET.trx.privateKey,
    btcKey: TEMP_WALLET.btc.privateKey
  });
  
  TEMP_WALLET = null; // 清除临时钱包
  goTo('page-home');
}
```

**场景 4：转账时使用私钥**
```javascript
// 旧代码
async function sendTransaction() {
  var toAddr = getInputAddress();
  var amount = getInputAmount();
  var privateKey = REAL_WALLET.privateKey; // ❌ 全局暴露
  await sendTx('eth', toAddr, amount, privateKey);
}

// 新代码
async function sendTransaction() {
  var keys = getSessionKeys(); // ✅ 从会话获取
  if (!keys) {
    showToast('请先解锁钱包');
    goTo('page-unlock');
    return;
  }
  
  var toAddr = getInputAddress();
  var amount = getInputAmount();
  await sendTx('eth', toAddr, amount, keys.ethKey);
}
```

---

## 🔍 Task 3: 查找和替换工具

老郭，你可以用以下命令快速查找需要修改的地方：

```bash
cd /Users/daxiang/Desktop/WorldWallet/wallet-shell

# 查找所有 Store.setPin 调用
grep -rn "Store.setPin\|Store.getPin" .

# 查找所有 ww_pin / ww_unlock_pin
grep -rn "ww_pin\|ww_unlock_pin" .

# 查找所有 REAL_WALLET.privateKey
grep -rn "REAL_WALLET.privateKey\|REAL_WALLET.mnemonic" .

# 查找所有 saveWallet( 调用
grep -rn "saveWallet(" .
```

---

## 📋 Task 4: CSP + SRI（待添加）

### 4.1 添加 CSP meta 标签

找到 `wallet-shell/index.html` 的 `<head>` 部分，添加：

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline';
  connect-src 'self' https://api.trongrid.io https://rpc.ankr.com https://min-api.cryptocompare.com;
  img-src 'self' data: https:;
  font-src 'self' data:;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
">
```

### 4.2 添加 SRI 到 ethers.js

找到 `<script src="https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js"></script>`

改为：

```html
<script 
  src="https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js"
  integrity="sha384-xxx"
  crossorigin="anonymous"
></script>
```

**生成 SRI hash：**
```bash
curl -s https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js | \
  openssl dgst -sha384 -binary | openssl base64 -A
```

---

## 🧪 Task 5: 测试清单

完成所有修改后，必须手动测试：

### 测试 1：创建新钱包
- [ ] 创建新钱包
- [ ] 设置 6 位 PIN
- [ ] 刷新页面
- [ ] 输入 PIN 解锁
- [ ] **验证：** 打开控制台，输入 `REAL_WALLET`，确认没有 `privateKey` 字段
- [ ] **验证：** `localStorage.getItem('ww_pin')` 返回 `null`
- [ ] **验证：** `localStorage.getItem('ww_pin_hash')` 返回一个 hash 字符串
- [ ] **验证：** 钱包数据已加密：`JSON.parse(localStorage.getItem('ww_wallet')).encrypted` 存在

### 测试 2：导入钱包
- [ ] 导入已有助记词
- [ ] 设置 PIN
- [ ] 解锁
- [ ] 验证数据加密状态

### 测试 3：转账
- [ ] 解锁钱包
- [ ] 发起转账
- [ ] 确认交易签名成功
- [ ] **验证：** 控制台输入 `getSessionKeys()`，可以看到私钥（说明会话解锁了）
- [ ] 等待 5 分钟
- [ ] **验证：** 控制台输入 `getSessionKeys()`，返回 `null`（说明自动清除了）

### 测试 4：兼容性测试（如果有旧数据）
- [ ] 旧版本创建的钱包（明文 PIN + 明文助记词）
- [ ] 打开新版本
- [ ] 输入 PIN 解锁
- [ ] **验证：** 控制台显示 `[PIN 迁移] 已转为 hash 存储`
- [ ] 刷新页面
- [ ] 再次输入 PIN 解锁
- [ ] **验证：** 功能正常

---

## 🚨 注意事项

1. **所有异步函数必须 await**
   - `await savePinSecure(pin)`
   - `await verifyPin(pin)`
   - 不要忘记 `async` 关键字

2. **会话私钥使用规范**
   - 解锁后立即调用 `setSessionKeys()`
   - 转账前必须先 `getSessionKeys()` 检查
   - 锁定钱包时调用 `clearSessionKeys()`

3. **不要直接操作 localStorage**
   - 用 `Store.get()` / `Store.set()`
   - PIN 用新的 `savePinSecure()` / `verifyPin()`

4. **REAL_WALLET 不能存私钥**
   - 只存公开信息（地址、创建时间）
   - 私钥通过 `getSessionKeys()` 获取

---

## 下一步行动

老郭，你可以：

**选项 A：** 让我继续（把需要修改的文件发给我，我来改）  
**选项 B：** 你自己用 grep 查找所有调用点，按上面的规则改  
**选项 C：** 我们分工：你改业务代码，我改架构部分

**你的选择？**
