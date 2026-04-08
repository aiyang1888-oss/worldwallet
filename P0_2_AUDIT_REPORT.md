# 🔍 P0-2 代码审核报告

**审核人**: 小郭  
**审核日期**: 2026-04-08  
**状态**: ❌ **不通过** — 检查到 4 个关键问题

---

## ⚠️ 发现的关键问题

### 问题 1️⃣：createRealWallet() — 顺序错误（HIGH）

**代码现状** (Line 240-245):
```javascript
const w = { /* 完整钱包 */ };

window.REAL_WALLET = w;    // ❌ 问题：在 saveWallet() 前赋值！
REAL_WALLET = w;
CHAIN_ADDR = w.trxAddress || '--';

saveWallet(w);             // saveWallet 是异步的！
applyReferralCredit();
```

**问题分析**:
- ❌ `window.REAL_WALLET = w` 在第 240 行
- ❌ `saveWallet(w)` 在第 244 行（异步操作）
- ❌ 存在**时间窗口漏洞**：saveWallet 完成前，w 已暴露

**风险**:
```
时间线：
1. T0: window.REAL_WALLET = w  (立即暴露)
2. T1-T100: saveWallet() 执行中 (异步)
3. T50: 恶意脚本可在此读取 w
4. T100: saveWallet() 完成
```

**预期修复**:
```javascript
const w = { /* ... */ };

// 先完成所有初始化
await saveWallet(w);
applyReferralCredit();

// 再暴露（用 Object.defineProperty）
Object.defineProperty(window, 'REAL_WALLET', {
  value: w,
  writable: false,
  configurable: false
});
REAL_WALLET = window.REAL_WALLET;
```

---

### 问题 2️⃣：restoreWallet() — 顺序错误（HIGH）

**代码现状** (Line 277-290):
```javascript
var pub = { /* 公开信息 */ };

REAL_WALLET = pub;          // ❌ 立即赋值
window.REAL_WALLET = pub;   // ❌ 立即赋值
CHAIN_ADDR = (pub && pub.trxAddress) ? pub.trxAddress : '--';

if (pin) {
  await saveWalletSecure(...);  // 异步！
} else {
  _saveWalletPlainPublicOnly(...);
}
```

**问题分析**:
- ❌ 保存操作（异步/同步）前就赋值 REAL_WALLET
- ❌ 如果 saveWalletSecure() 或 _saveWalletPlainPublicOnly() 失败，钱包仍存在于内存
- ❌ 无半成品防护

**预期修复**:
```javascript
var pub = { /* ... */ };

try {
  if (pin) {
    await saveWalletSecure(...);
  } else {
    _saveWalletPlainPublicOnly(...);
  }
  
  // 保存成功后才赋值
  Object.defineProperty(window, 'REAL_WALLET', {
    value: pub,
    writable: false,
    configurable: false
  });
  REAL_WALLET = window.REAL_WALLET;
} catch (e) {
  console.error('保存失败:', e);
  return null;  // 返回 null，不暴露半成品
}
```

---

### 问题 3️⃣：loadWalletPublic() — 完全没用 Object.defineProperty（HIGH）

**代码现状** (Line 103-113):
```javascript
function loadWalletPublic() {
  try {
    var d = Store.getWallet();
    if (!d || !d.ethAddress) return null;
    
    window.REAL_WALLET = {
      ethAddress: d.ethAddress,
      // ... 其他字段
    };
    REAL_WALLET = window.REAL_WALLET;
    CHAIN_ADDR = (REAL_WALLET && REAL_WALLET.trxAddress) ? REAL_WALLET.trxAddress : '--';
  }
}
```

**问题分析**:
- ❌ **没有用 Object.defineProperty**，直接赋值
- ❌ window.REAL_WALLET **可以被覆盖**
- ❌ window.REAL_WALLET **可以被删除**
- ❌ 完全没有防护

**验证**:
```javascript
window.REAL_WALLET = null;  // ✅ 成功覆盖（不应该！）
delete window.REAL_WALLET;  // ✅ 成功删除（不应该！）
```

**预期修复**:
```javascript
function loadWalletPublic() {
  try {
    var d = Store.getWallet();
    if (!d || !d.ethAddress) return null;
    
    var walletObj = {
      ethAddress: d.ethAddress,
      // ...
    };
    
    Object.defineProperty(window, 'REAL_WALLET', {
      value: walletObj,
      writable: false,
      configurable: false
    });
    REAL_WALLET = window.REAL_WALLET;
    CHAIN_ADDR = (REAL_WALLET && REAL_WALLET.trxAddress) ? REAL_WALLET.trxAddress : '--';
  } catch (e) {
    console.error('[loadWalletPublic] error:', e);
  }
}
```

---

### 问题 4️⃣：markBackupDone() — 无法更新 backedUp（HIGH）

**代码现状** (Line 731):
```javascript
function markBackupDone() {
  const w = JSON.parse(localStorage.getItem('ww_wallet')||'{}');
  w.backedUp = true;
  localStorage.setItem('ww_wallet', JSON.stringify(w));
  
  if(REAL_WALLET) REAL_WALLET.backedUp = true;  // ❌ 这行会失败！
  
  // ...
}
```

**问题分析**:
假设 REAL_WALLET 被 Object.defineProperty 保护为 `writable: false`：
```javascript
Object.defineProperty(window, 'REAL_WALLET', {
  value: { backedUp: false },
  writable: false,  // ← 关键！
  configurable: false
});
```

那么 `REAL_WALLET.backedUp = true` 会报错：
```
TypeError: Cannot add property backedUp, object is not extensible
// 或
TypeError: Cannot assign to read only property 'backedUp'
```

**预期修复**:
```javascript
function markBackupDone() {
  const w = JSON.parse(localStorage.getItem('ww_wallet')||'{}');
  w.backedUp = true;
  localStorage.setItem('ww_wallet', JSON.stringify(w));
  
  if(REAL_WALLET) {
    // 不能直接改属性，必须重新赋值整个对象
    var updated = Object.assign({}, REAL_WALLET, { backedUp: true });
    Object.defineProperty(window, 'REAL_WALLET', {
      value: updated,
      writable: false,
      configurable: false
    });
    REAL_WALLET = updated;
  }
  
  // ...
}
```

---

## 📊 审核汇总

| 检查项 | 现状 | 应改为 | 严重度 |
|--------|------|--------|--------|
| createRealWallet 顺序 | ❌ 先赋值后保存 | ✅ 先保存后赋值 | 🔴 HIGH |
| restoreWallet 顺序 | ❌ 先赋值后保存 | ✅ 先保存后赋值 + try-catch | 🔴 HIGH |
| loadWalletPublic 保护 | ❌ 无 defineProperty | ✅ 用 defineProperty 保护 | 🔴 HIGH |
| markBackupDone 更新 | ❌ 直接赋值属性 | ✅ 重新赋值对象 | 🔴 HIGH |

---

## 🎯 4 个维度的审核结论

### 1️⃣ 主流程 — ❌ **破坏**

**现象**:
- createRealWallet() 流程会出现时间窗口漏洞
- restoreWallet() 失败时无半成品防护
- markBackupDone() 会报错（writable:false 冲突）

**结果**: ❌ 主流程有风险

---

### 2️⃣ 全局污染 — ✅ **无污染**

**现象**:
- 没有新的全局变量
- Object.defineProperty 是标准 API
- 代码内部逻辑清晰

**结果**: ✅ 污染程度低（但代码有逻辑问题）

---

### 3️⃣ 兼容性 — ❌ **有问题**

**现象**:
- markBackupDone() 中 `REAL_WALLET.backedUp = true` 会失败
- writable:false 与现有更新逻辑冲突
- 需要改造更新模式（重新赋值整个对象）

**结果**: ❌ 兼容性风险

---

### 4️⃣ 上线适配 — ❌ **不适合上线**

**理由**:
1. ❌ 时间窗口漏洞未完全解决
2. ❌ 半成品防护缺失
3. ❌ markBackupDone 会报错
4. ❌ loadWalletPublic 无防护

**建议**: **拒绝上线，需要重新实现**

---

## ✅ 修复清单

| 位置 | 现状 | 修复 | 优先级 |
|------|------|------|--------|
| createRealWallet | 顺序错 | 先 await saveWallet，再赋值 | P0 |
| restoreWallet | 顺序错 | try-catch，保存失败返回 null | P0 |
| loadWalletPublic | 无防护 | 加 Object.defineProperty | P0 |
| markBackupDone | 属性赋值 | 重新赋值整个对象 | P0 |

---

## 🔴 最终结论

**审核结果**: ❌ **不通过**

**关键问题**: 
- 4 个关键位置都有问题
- 不是"表面安全，实际有漏洞"
- 而是**根本没实现防护**（或实现顺序错误）

**建议**:
1. Cursor 按修复清单重新实现
2. 重点：顺序要对（保存 → 赋值）
3. 重点：loadWalletPublic 必须用 Object.defineProperty
4. 重点：markBackupDone 要重新赋值对象（不能直接改属性）
5. 重新审核

---

**现在通知 Cursor 修改，重新审核。**
