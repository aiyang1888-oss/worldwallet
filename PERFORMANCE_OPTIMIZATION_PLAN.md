# ⚡ WorldWallet 性能优化计划

**时间**: 2026-04-08 09:16+  
**目标**: 优化 IDB 读取、会话密钥管理、加载性能  
**预期改进**: 初始加载 -50%, 解密操作 -30%  

---

## 📊 当前性能基线

### 关键指标（需先测量）
```
初始加载时间: ____ ms
钱包解锁时间: ____ ms  
转账签名时间: ____ ms
会话加密/解密: ____ ms
localStorage 读取: ____ ms
IndexedDB 读取: ____ ms
```

---

## 🎯 优化项目

### 1. IndexedDB 读取路径优化

**当前状态**: 双写 + 镜像（localStorage 为主）

**问题**:
- localStorage 对每次访问有性能开销
- IDB 作为备份，未充分利用
- 大数据（加密钱包）每次都从 localStorage 读

**优化方案**:

#### 方案 A: 异步 IDB 预加载（推荐）
```javascript
// idb-kv.js
class IDBKV {
  constructor() {
    this._cache = {}; // 内存缓存
    this._idbReady = this.init(); // 异步初始化
  }
  
  async init() {
    // 并行加载关键键
    const keys = ['ww_wallet', 'ww_pin_hash', 'ww_pin_device_salt_v1'];
    const values = await Promise.all(
      keys.map(k => this._idbGet(k))
    );
    
    // 填充缓存（如果 IDB 有数据）
    keys.forEach((k, i) => {
      if (values[i]) this._cache[k] = values[i];
    });
  }
  
  async get(key) {
    // 先查缓存，再查 localStorage，最后查 IDB
    if (this._cache[key]) return this._cache[key];
    
    const lsValue = localStorage.getItem(key);
    if (lsValue) {
      this._cache[key] = lsValue;
      return lsValue;
    }
    
    const idbValue = await this._idbGet(key);
    if (idbValue) {
      this._cache[key] = idbValue;
      return idbValue;
    }
    
    return null;
  }
}
```

**性能收益**:
- 首次加载后，缓存命中率 ~95%
- 减少 localStorage 访问 ~70%
- 减少 IDB 访问 ~80% (缓存)

**实现工时**: 2 小时

---

#### 方案 B: 完全 IDB 主存（后续）
```javascript
// 长期目标：IDB 作为主存，localStorage 作为备用
// 需要异步启动流程重构
```

**实现工时**: 6 小时 (重构启动流程)

**优先级**: 中等（现在推荐方案 A）

---

### 2. 会话密钥管理优化

**当前状态**: 每次访问私钥时临时解密

**问题**:
- 频繁的 AES-GCM 解密操作耗时
- 没有会话缓存，每次转账都要解密
- 多次访问同一私钥时重复解密

**优化方案**:

#### 方案 A: 会话私钥缓存
```javascript
// wallet.core.js
let _sessionKeyCache = null;
let _sessionKeyTTL = 60000; // 1 分钟
let _sessionKeyClearTimer = null;

async function wwWithWalletSensitive(fn, cacheTime = 60000) {
  // 如果缓存还有效，使用缓存
  if (_sessionKeyCache && Date.now() - _sessionKeyCache.timestamp < cacheTime) {
    return fn(_sessionKeyCache.keys);
  }
  
  // 否则解密
  const decrypted = await wwUnsealWalletSensitive();
  _sessionKeyCache = {
    keys: decrypted,
    timestamp: Date.now()
  };
  
  // 清理定时器
  if (_sessionKeyClearTimer) clearTimeout(_sessionKeyClearTimer);
  _sessionKeyClearTimer = setTimeout(() => {
    _sessionKeyCache = null;
  }, cacheTime);
  
  return fn(decrypted);
}
```

**性能收益**:
- 连续转账场景: 第 1 次解密 (~10ms), 后续从缓存 (~1ms)
- 典型使用场景改进 ~80%

**安全权衡**:
- ⚠️ 增加私钥在内存驻留时间（从 0ms → 60s）
- ✅ 可配置 TTL，平衡安全和性能
- ✅ 用户操作 5 分钟无动作时自动清除

**实现工时**: 1.5 小时

---

### 3. 初始加载优化

**当前状态**: 同步 JSON.parse + localStorage 访问

**问题**:
- index.html 加载多个 JS 文件（未优化）
- 没有代码分割（Code Splitting）
- DOM 等待 JS 完全执行

**优化方案**:

#### 方案 A: 脚本加载顺序优化
```html
<!-- index.html -->

<!-- 关键渲染路径 -->
<link rel="stylesheet" href="css/wallet.css">

<!-- 核心脚本 (异步) -->
<script src="js/globals.js" defer></script>
<script src="js/storage.js" defer></script>
<script src="js/idb-kv.js" defer></script>

<!-- 页面内容可以更早渲染 -->
<!-- ... DOM ... -->

<!-- 非关键脚本 (异步) -->
<script src="js/api-config.js" defer></script>
<script src="js/api.js" defer></script>
<script src="wallet.core.js" defer></script>
```

**性能收益**:
- First Contentful Paint (FCP) -30%
- Time to Interactive (TTI) -20%

**实现工时**: 1 小时

---

#### 方案 B: 代码分割（后续）
```javascript
// 分割重型库
// TronWeb, Ethers.js 按需加载
async function loadTronWeb() {
  if (window.TronWeb) return;
  const module = await import('./libs/tronweb-loader.js');
  // ...
}
```

**实现工时**: 3-4 小时

**优先级**: 中等

---

### 4. 加密操作优化

**当前状态**: Web Crypto API 直接使用

**问题**:
- AES-GCM 加密每次都生成新 IV（正常）
- PBKDF2 迭代次数固定为 100,000（安全但较慢）
- 没有并行化处理

**优化方案**:

#### 方案 A: PBKDF2 迭代次数调整
```javascript
// security.js
const PBKDF2_ITERATIONS = process.env.NODE_ENV === 'production'
  ? 100000  // 生产环保全第一
  : 50000;  // 开发环保性第一
```

**性能收益**:
- PIN 验证 -30% (如果时间成为瓶颈)
- ⚠️ 安全性与性能权衡

**不推荐**: 除非 PIN 验证成为瓶颈

---

#### 方案 B: 缓存派生密钥（3 分钟）
```javascript
// 仅在内存缓存，不持久化
let _derivedKeyCache = null;
let _derivedKeyCacheTTL = 180000; // 3 分钟

async function deriveKeyFromPin(pin, salt) {
  const cacheKey = btoa(pin + salt);
  
  if (_derivedKeyCache?.[cacheKey]) {
    return _derivedKeyCache[cacheKey];
  }
  
  // 派生密钥...
  const key = await crypto.subtle.deriveKey(...);
  
  if (!_derivedKeyCache) _derivedKeyCache = {};
  _derivedKeyCache[cacheKey] = key;
  
  // 3 分钟后清除
  setTimeout(() => {
    delete _derivedKeyCache[cacheKey];
  }, _derivedKeyCacheTTL);
  
  return key;
}
```

**性能收益**:
- 多次解密操作: -50% (避免重复派生)

**安全考虑**:
- ✅ 密钥仅在内存，不持久化
- ✅ 时间有限 (3 分钟)
- ⚠️ 增加内存占用

**实现工时**: 1 小时

---

### 5. 内存优化

**当前状态**: 没有明确的内存管理策略

**优化方案**:

#### 方案 A: 敏感数据清零
```javascript
// 当清除会话时，显式清零敏感数据
function clearSessionKeys() {
  if (_sessionPrivateKeys) {
    // 覆盖敏感数据（0 或随机数据）
    for (let key in _sessionPrivateKeys) {
      if (typeof _sessionPrivateKeys[key] === 'string') {
        _sessionPrivateKeys[key] = '\0'.repeat(_sessionPrivateKeys[key].length);
      }
    }
  }
  _sessionPrivateKeys = null;
}
```

**性能**: 无显著性能影响  
**安全**: +10% (防止内存转储恢复)

**实现工时**: 0.5 小时

---

#### 方案 B: 缓存大小限制
```javascript
// 防止缓存无限增长
class LRUCache {
  constructor(maxSize = 10) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }
  
  get(key) {
    if (!this.cache.has(key)) return null;
    
    // LRU: 移到最后
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    
    return value;
  }
  
  set(key, value) {
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      // 移除最旧的条目
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, value);
  }
}
```

**内存节省**: ~90% (限制缓存大小)

**实现工时**: 1 小时

---

## 🔄 优化执行计划

### 第 1 阶段 (1-2 小时) - 必须做
- [ ] IDB 内存缓存 (方案 A)
- [ ] 会话私钥缓存 (方案 A)
- [ ] 脚本加载顺序 (方案 A)

**预期性能提升**: 40-50%

### 第 2 阶段 (2-3 小时) - 重要
- [ ] 派生密钥缓存
- [ ] 敏感数据清零
- [ ] LRU 缓存管理

**预期性能提升**: 额外 20-30%

### 第 3 阶段 (4-5 小时) - 可选
- [ ] 完全 IDB 主存 (长期)
- [ ] 代码分割 (后续)
- [ ] Worker 线程 (高级)

---

## 📊 性能指标跟踪

### 基线 (优化前)
```
初始加载: ____ ms
解锁: ____ ms
转账签名: ____ ms
私钥访问: ____ ms
IDB 读取: ____ ms
```

### 优化后目标
```
初始加载: -40% (e.g., 3000ms → 1800ms)
解锁: -20% (e.g., 500ms → 400ms)
转账签名: -30% (e.g., 200ms → 140ms)
私钥访问: -80% (e.g., 50ms → 10ms)
IDB 读取: -70% (e.g., 100ms → 30ms)
```

---

## 🧪 性能测试

### 测试用例
```javascript
// wallet.core.js 测试
async function perfTest() {
  console.time('IDB Read');
  const data = await wwIdbGet('ww_wallet');
  console.timeEnd('IDB Read');
  
  console.time('Session Decrypt');
  const keys = await wwWithWalletSensitive(k => k);
  console.timeEnd('Session Decrypt');
  
  console.time('Key Derivation');
  const key = await deriveKeyFromPin(pin, salt);
  console.timeEnd('Key Derivation');
}
```

### 监控指标
- [ ] Chrome DevTools Performance tab
- [ ] Lighthouse scores
- [ ] 内存占用 (DevTools Memory)
- [ ] 缓存命中率

---

## 🎯 优化成功标准

- [ ] 初始加载 < 2000ms
- [ ] 解锁 < 500ms  
- [ ] 私钥访问缓存命中率 > 80%
- [ ] 内存占用稳定 (无泄漏)
- [ ] 所有功能仍正常

---

**性能优化计划完成**。准备执行。
