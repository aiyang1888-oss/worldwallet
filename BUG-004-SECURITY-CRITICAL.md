# BUG-004 - 助记词和私钥暴露在全局变量（P0 - 资金安全风险）

**状态：** 🔴 待修复

**发现时间：** 2026-04-07 02:17

---

## 问题现象

在浏览器控制台可直接访问助记词和私钥：

```javascript
window.REAL_WALLET.mnemonic   // "phrase stone cruel wall when then mimic exist decorate huge mechanic picnic"
window.REAL_WALLET.privateKey // 完整私钥（未加密）
```

---

## 安全风险

**P0 级别 - 资金安全直接威胁：**

1. **XSS 攻击可窃取：** 任何 XSS 漏洞都能立即读取助记词
2. **恶意浏览器插件：** Chrome 插件可访问 `window` 对象
3. **用户误操作：** 用户截图控制台可能泄露
4. **第三方脚本：** CDN 被劫持或第三方库可读取

---

## 违反架构设计

**ARCHITECTURE.md Phase 1 要求：**
- ❌ 助记词应 AES-GCM 加密后存 localStorage（当前明文在全局变量）
- ❌ 私钥应在闭包内保护，仅临时保存在会话缓存（当前明文在全局变量）
- ❌ 私钥应 5 分钟自动清除（当前永久驻留内存）
- ❌ 不应暴露到 `window` 全局作用域

---

## 测试证据

**本地测试时间：** 2026-04-07 02:16  
**测试环境：** https://www.worldtoken.cc/wallet.html

```javascript
// 控制台执行
const check = {
  sessionStorage_tmp_mnemonic: sessionStorage.getItem('tmp_mnemonic'),
  localStorage_mnemonic: localStorage.getItem('mnemonic'),
  localStorage_encrypted_mnemonic: localStorage.getItem('encrypted_mnemonic'),
  window_REAL_WALLET_mnemonic: window.REAL_WALLET?.mnemonic
};

// 结果
{
  sessionStorage_tmp_mnemonic: null,         // ✅ 正确
  localStorage_mnemonic: null,                // ✅ 正确（未使用）
  localStorage_encrypted_mnemonic: null,       // ❌ 应该有加密数据
  window_REAL_WALLET_mnemonic: "phrase stone..." // ❌ 严重安全漏洞
}
```

---

## 修复方案

### 1. 立即移除全局变量暴露

**文件：** `wallet-shell/wallet.js` 或相关钱包生成代码

**修改前：**
```javascript
// ❌ 错误：直接赋值给全局对象
window.REAL_WALLET = {
  mnemonic: mnemonic,
  privateKey: privateKey,
  address: address
};
```

**修改后：**
```javascript
// ✅ 正确：使用闭包 + 会话缓存
(function() {
  // 闭包保护，外部无法访问
  let walletData = {
    mnemonic: mnemonic,
    privateKey: privateKey
  };
  
  // 加密存储助记词到 localStorage
  const encryptedMnemonic = await Security.encryptMnemonic(mnemonic, pin);
  Store.setEncryptedMnemonic(encryptedMnemonic);
  
  // 会话缓存私钥（5分钟自动清除）
  Security.setSessionKeys({
    privateKey: privateKey,
    address: address
  });
  
  // 只暴露地址（公开信息）
  window.WALLET_ADDRESS = address;
})();
```

### 2. 使用 Phase 1 已实现的安全函数

**已有安全基础设施（`wallet-shell/core/security.js`）：**

```javascript
// ✅ 已实现（Task 1 完成）
Security.setSessionKeys({ privateKey, address })  // 设置会话私钥（5分钟后自动清除）
Security.getSessionKeys()                          // 获取会话私钥
Security.clearSessionKeys()                         // 手动清除
```

**需要补充实现（Task 2）：**

```javascript
// ⏳ 待实现
Security.encryptMnemonic(mnemonic, pin)  // AES-GCM 加密助记词
Security.decryptMnemonic(encrypted, pin) // 解密助记词
```

---

## 详细修复步骤

### Step 1: 实现助记词加密（补充 Task 2）

在 `wallet-shell/core/security.js` 添加：

```javascript
/**
 * 加密助记词（AES-GCM）
 * @param {string} mnemonic - 明文助记词
 * @param {string} pin - PIN 码（用于派生密钥）
 * @returns {Promise<string>} Base64 加密数据
 */
export async function encryptMnemonic(mnemonic, pin) {
  const encoder = new TextEncoder();
  const data = encoder.encode(mnemonic);
  
  // 使用 PIN hash 派生加密密钥
  const pinHash = await hashPin(pin);
  const keyMaterial = encoder.encode(pinHash);
  const key = await crypto.subtle.importKey(
    'raw',
    keyMaterial.slice(0, 32), // AES-256 需要 32 字节
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  // 生成随机 IV
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // 加密
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    data
  );
  
  // 拼接 IV + 密文，转 Base64
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

/**
 * 解密助记词
 * @param {string} encrypted - Base64 加密数据
 * @param {string} pin - PIN 码
 * @returns {Promise<string>} 明文助记词
 */
export async function decryptMnemonic(encrypted, pin) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  // Base64 解码
  const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  
  // 派生密钥
  const pinHash = await hashPin(pin);
  const keyMaterial = encoder.encode(pinHash);
  const key = await crypto.subtle.importKey(
    'raw',
    keyMaterial.slice(0, 32),
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  
  // 解密
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    data
  );
  
  return decoder.decode(decrypted);
}
```

### Step 2: 修改钱包创建流程

找到 `wallet-shell/wallet.js` 中创建钱包的函数（类似 `createNewWallet()` 或 `generateWallet()`）：

```javascript
// ❌ 修改前
async function createNewWallet(mnemonic) {
  const wallet = ethers.Wallet.fromMnemonic(mnemonic);
  
  // 错误：暴露到全局
  window.REAL_WALLET = {
    mnemonic: mnemonic,
    privateKey: wallet.privateKey,
    address: wallet.address
  };
  
  // 错误：明文存储
  localStorage.setItem('mnemonic', mnemonic);
}

// ✅ 修改后
async function createNewWallet(mnemonic, pin) {
  const wallet = ethers.Wallet.fromMnemonic(mnemonic);
  
  // 1. 加密存储助记词
  const encrypted = await Security.encryptMnemonic(mnemonic, pin);
  Store.setEncryptedMnemonic(encrypted);
  
  // 2. 会话缓存私钥（5分钟后自动清除）
  Security.setSessionKeys({
    privateKey: wallet.privateKey,
    address: wallet.address
  });
  
  // 3. 只暴露公开信息
  window.WALLET_ADDRESS = wallet.address;
}
```

### Step 3: 修改所有私钥读取点

查找所有 `window.REAL_WALLET.privateKey` 的使用：

```javascript
// ❌ 修改前
function signTransaction(tx) {
  const privateKey = window.REAL_WALLET.privateKey;
  const wallet = new ethers.Wallet(privateKey);
  return wallet.signTransaction(tx);
}

// ✅ 修改后
function signTransaction(tx) {
  const sessionKeys = Security.getSessionKeys();
  if (!sessionKeys) {
    // 私钥已过期，要求重新解锁
    showPinUnlockDialog();
    throw new Error('Session expired, please unlock wallet');
  }
  
  const wallet = new ethers.Wallet(sessionKeys.privateKey);
  return wallet.signTransaction(tx);
}
```

### Step 4: PIN 解锁时恢复私钥

```javascript
async function unlockWalletWithPin(pin) {
  // 1. 验证 PIN
  const isValid = await Security.verifyPin(pin);
  if (!isValid) {
    throw new Error('Invalid PIN');
  }
  
  // 2. 解密助记词
  const encrypted = Store.getEncryptedMnemonic();
  const mnemonic = await Security.decryptMnemonic(encrypted, pin);
  
  // 3. 重新生成私钥
  const wallet = ethers.Wallet.fromMnemonic(mnemonic);
  
  // 4. 设置会话缓存（5分钟后自动清除）
  Security.setSessionKeys({
    privateKey: wallet.privateKey,
    address: wallet.address
  });
  
  return wallet.address;
}
```

---

## 测试步骤

### Step 1: 创建新钱包
1. 清空 localStorage
2. 访问页面 → 创建新钱包 → 设置 PIN（如 `123456`）
3. 控制台检查：
   ```javascript
   window.REAL_WALLET           // undefined ✅
   localStorage.getItem('encrypted_mnemonic')  // 应该有加密数据 ✅
   localStorage.getItem('mnemonic')            // null ✅
   Security.getSessionKeys()                    // 应返回 { privateKey, address } ✅
   ```

### Step 2: 等待 5 分钟后
```javascript
Security.getSessionKeys()  // null（已自动清除）✅
```

### Step 3: PIN 解锁
1. 输入正确 PIN → 解锁成功
2. 控制台检查：
   ```javascript
   Security.getSessionKeys()  // 返回私钥（重新加载）✅
   ```

### Step 4: 转账签名测试
1. 发起转账
2. 如果私钥已过期 → 自动弹出 PIN 解锁
3. 解锁后 → 签名成功

---

## 修复优先级

**P0 紧急：** 此问题直接影响资金安全，应立即修复

**依赖关系：**
- 依赖 Task 1（已完成）：会话私钥管理
- 需要补充 Task 2：助记词加密/解密

**预计工作量：** 2 小时
- 实现加密函数：30 分钟
- 修改钱包创建流程：30 分钟
- 修改所有私钥读取点：40 分钟
- 测试验证：20 分钟

---

## 修复进度

- [ ] 实现 `encryptMnemonic()` / `decryptMnemonic()`
- [ ] 查找所有 `window.REAL_WALLET` 使用点
- [ ] 修改钱包创建流程
- [ ] 修改钱包导入流程
- [ ] 修改所有私钥读取点（转账签名等）
- [ ] 本地测试通过
- [ ] 线上部署

---

**最后更新：** 2026-04-07（发现 BUG-004）
