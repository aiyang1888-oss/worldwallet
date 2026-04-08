# 🔍 WorldWallet 深度安全检查报告

**检查日期**: 2026-04-08  
**检查深度**: 代码级安全审计  
**检查范围**: wallet-shell 核心模块  
**评审人**: AI Security Scout  

---

## 📊 发现的问题清单

### HIGH 优先级 (已发现 3 个)

#### 1. atob() 缺少错误处理 (SECURITY-002)
**文件**: wallet-shell/core/security.js  
**行号**: 54, 55, 56  
**严重程度**: 🔴 HIGH  

**现象**:
```javascript
var salt = Uint8Array.from(atob(bundle.salt), function(c) { return c.charCodeAt(0); });
var iv = Uint8Array.from(atob(bundle.iv), function(c) { return c.charCodeAt(0); });
var data = Uint8Array.from(atob(bundle.data), function(c) { return c.charCodeAt(0); });
```

**问题**: 
- atob() 在接收无效的 base64 字符串时会抛出 SyntaxError
- 无 try-catch 包装，直接导致应用崩溃
- 用户无法解密钱包数据

**影响范围**:
- 应用可用性：LOW
- 用户隐私：HIGH
- 用户资金：CRITICAL (无法访问)

**修复建议**:
```javascript
// ✅ 修复后
async function decryptWithPin(bundle, pin) {
  try {
    const salt = Uint8Array.from(atob(bundle.salt), c => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(bundle.iv), c => c.charCodeAt(0));
    const data = Uint8Array.from(atob(bundle.data), c => c.charCodeAt(0));
    const key = await deriveKeyFromPin(pin, salt);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv }, key, data
    );
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    console.error('Decryption failed:', e.message);
    throw new Error('Failed to decrypt wallet data');
  }
}
```

**工作量**: 低 (1 小时)  
**修复截止**: 3 天内  
**优先级**: P0  

---

### MEDIUM 优先级 (建议立即处理)

#### 2. 硬编码 Salt (SECURITY-003)
**文件**: wallet-shell/core/security.js  
**行号**: 110  
**严重程度**: 🟡 MEDIUM  

**现象**:
```javascript
async function hashPin(pin) {
  const enc = new TextEncoder();
  const data = enc.encode(pin + 'ww_salt_v1_2026');  // ❌ 硬编码全局 salt
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  // ...
}
```

**问题**:
- PIN hash 使用硬编码的全局 salt
- 所有用户使用相同 salt
- 所有相同 PIN 会生成相同 hash
- 易被预计算攻击（彩虹表）
- 多用户场景下 PIN 隐私性严重降低

**修复建议**:
```javascript
// ✅ 修复：用户特定的 salt
async function savePinSecure(pin) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const enc = new TextEncoder();
  const data = new Uint8Array([...salt, ...enc.encode(pin)]);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const saltStr = btoa(String.fromCharCode(...salt));
  const hashStr = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
  Store.set('ww_pin_secure', `${saltStr}:${hashStr}`);
}

async function verifyPin(pin) {
  const stored = Store.get('ww_pin_secure');
  if (!stored) return false;
  const [saltStr, storedHash] = stored.split(':');
  const salt = Uint8Array.from(atob(saltStr), c => c.charCodeAt(0));
  const enc = new TextEncoder();
  const data = new Uint8Array([...salt, ...enc.encode(pin)]);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const computedHash = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
  return computedHash === storedHash;
}
```

**工作量**: 中等 (2 小时)  
**修复截止**: 1 周内  
**优先级**: P1  

---

#### 3. 会话私钥在内存中未加密存储 (SECURITY-005)
**文件**: wallet-shell/core/security.js  
**行号**: 136-150  
**严重程度**: 🔴 HIGH (对安全性)  

**现象**:
```javascript
var _sessionPrivateKeys = null;  // ❌ 明文存储在内存中

function setSessionKeys(keys) {
  _sessionPrivateKeys = keys;  // ❌ 直接保存敏感数据
  _keysClearTimer = setTimeout(function() {
    _sessionPrivateKeys = null;
  }, 300000);  // 5分钟后清除
}
```

**问题**:
- 私钥以明文存储在闭包变量中
- 即使 5 分钟后清除，XSS 攻击仍可窃取
- 内存转储可恢复数据
- 无加密或混淆，无零化清除

**影响范围**:
- XSS 攻击：CRITICAL
- 内存转储：CRITICAL
- 用户资金：CRITICAL

**修复建议**:
```javascript
// ✅ 修复：使用 Web Crypto API 临时密钥
let _sessionEncryptionKey = null;
let _sessionClearTimer = null;

async function initSessionKeys(keys) {
  // 生成临时加密密钥（不用于交易，仅用于内存保护）
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  
  // 加密敏感数据
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(JSON.stringify(keys))
  );
  
  _sessionEncryptionKey = { key, iv, encrypted };
  
  // 1 分钟后清除（减少风险时间窗口）
  if (_sessionClearTimer) clearTimeout(_sessionClearTimer);
  _sessionClearTimer = setTimeout(clearSessionKeys, 60000);
}

async function getSessionKeys() {
  if (!_sessionEncryptionKey) return null;
  const { key, iv, encrypted } = _sessionEncryptionKey;
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted
  );
  return JSON.parse(new TextDecoder().decode(decrypted));
}

function clearSessionKeys() {
  _sessionEncryptionKey = null;
  if (_sessionClearTimer) {
    clearTimeout(_sessionClearTimer);
    _sessionClearTimer = null;
  }
  console.log('[Safe] Session keys cleared');
}
```

**工作量**: 高 (4 小时)  
**修复截止**: 立即 (P0)  
**优先级**: P0  

---

#### 4. localStorage 用于存储敏感数据 (SECURITY-006)
**文件**: wallet-shell/core/security.js, wallet.core.js  
**严重程度**: 🟡 MEDIUM  

**现象**:
```javascript
localStorage.setItem('ww_wallet', JSON.stringify(safe));  // ❌ localStorage 易被 XSS 访问
```

**问题**:
- localStorage 可被 XSS 攻击直接读取
- PIN 强度不足（用户倾向选择弱 PIN：1234, 0000）
- 长期存储加密钱包数据
- 浏览器扩展可读取
- 无 PIN 尝试次数限制（可被暴力破解）

**修复建议**:
```javascript
// ✅ 修复：使用 indexedDB + 强制认证
async function saveWalletSecureV2(wallet, pin) {
  // 1. 添加 PIN 尝试次数限制
  if (Store.getPinAttempts() >= 5) {
    throw new Error('PIN locked due to failed attempts');
  }
  
  // 2. 使用 indexedDB（对 XSS 更安全）
  const db = await openIndexedDB();
  const tx = db.transaction(['wallets'], 'readwrite');
  
  // 3. 加密敏感数据
  const encrypted = await encryptWithPin(
    JSON.stringify({
      mnemonic: wallet.mnemonic,
      ethKey: wallet.eth.privateKey,
      trxKey: wallet.trx.privateKey,
      btcKey: wallet.btc.privateKey
    }),
    pin
  );
  
  // 4. 保存（不含私钥）
  await tx.objectStore('wallets').put({
    ethAddress: wallet.eth.address,
    trxAddress: wallet.trx.address,
    btcAddress: wallet.btc.address,
    encrypted: encrypted,
    createdAt: wallet.createdAt,
    pinHashedAt: Date.now()
  });
}
```

**工作量**: 中等 (3 小时)  
**修复截止**: 1 周内  
**优先级**: P1  

---

### LOW 优先级 (建议改进)

#### 5. 缺少输入验证 (SECURITY-009)
**文件**: wallet.core.js  
**严重程度**: 🟢 LOW  

**问题**: bundle 参数未验证，无效输入直接导致崩溃

**修复建议**:
```javascript
function validateBundle(bundle) {
  if (!bundle || typeof bundle !== 'object') {
    throw new Error('Invalid bundle');
  }
  if (!bundle.salt || !bundle.iv || !bundle.data) {
    throw new Error('Missing required bundle fields');
  }
  if (typeof bundle.salt !== 'string' || typeof bundle.iv !== 'string') {
    throw new Error('Bundle fields must be strings');
  }
  // 验证 base64
  try {
    atob(bundle.salt);
    atob(bundle.iv);
    atob(bundle.data);
  } catch (e) {
    throw new Error('Invalid base64 in bundle');
  }
}
```

**工作量**: 低 (1 小时)  
**优先级**: P2  

---

#### 6. 硬编码 CDN 依赖 (SECURITY-008)
**文件**: wallet.core.js  
**严重程度**: 🟢 LOW  

**修复建议**:
- 添加 SRI (Subresource Integrity) 校验
- 或本地托管关键库
- 添加 CSP (Content Security Policy) 头

```javascript
// ✅ 添加 SRI
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/tronweb@5.3.2/dist/TronWeb.js';
script.integrity = 'sha384-XXXXX...'; // 从 CDN 获取
script.crossOrigin = 'anonymous';
document.head.appendChild(script);
```

**工作量**: 低 (1 小时)  
**优先级**: P2  

---

## 📈 问题总结与优先级

| 问题 | 代码 | 严重度 | 优先级 | 工作量 | 截止 |
|------|------|--------|--------|--------|------|
| atob() 错误处理 | SECURITY-002 | HIGH | P0 | 1h | 3天 |
| 会话私钥加密 | SECURITY-005 | HIGH | P0 | 4h | 立即 |
| 硬编码 salt | SECURITY-003 | MEDIUM | P1 | 2h | 1周 |
| localStorage 替代 | SECURITY-006 | MEDIUM | P1 | 3h | 1周 |
| 输入验证 | SECURITY-009 | LOW | P2 | 1h | 2周 |
| CDN 安全 | SECURITY-008 | LOW | P2 | 1h | 2周 |

---

## 🎯 行动计划

### 第一阶段 (立即 - 3 天)
```
🔴 P0 任务
1. 为 atob() 添加 try-catch
2. 实现会话私钥加密存储
3. 运行完整测试
4. 部署到测试环境
```

### 第二阶段 (1 周内)
```
🟡 P1 任务
1. 实现用户特定的 PIN salt
2. 迁移到 indexedDB
3. 添加 PIN 尝试次数限制
4. 代码评审 + 测试
```

### 第三阶段 (2 周内)
```
🟢 P2 任务
1. 添加输入验证
2. 升级 CDN 安全
3. 最终验证 + 部署
```

---

## 🔐 安全建议

### 短期（1-2 周）
✅ 修复所有 HIGH/MEDIUM 优先级问题  
✅ 添加自动化安全测试  
✅ 建立漏洞报告机制  

### 中期（1-3 月）
✅ 定期安全审计（月度）  
✅ 依赖更新管理  
✅ 安全代码审查流程  

### 长期（持续）
✅ 硬件钱包集成  
✅ 生物特征认证  
✅ 多签认证方案  

---

**报告生成**: 2026-04-08 09:03 UTC+7  
**审计工具**: AI Security Scout v1.0  
**下次审计**: 修复完成后验证  

---

*本报告由自动化安全审计系统生成。请由安全专家进行最终审核。*
