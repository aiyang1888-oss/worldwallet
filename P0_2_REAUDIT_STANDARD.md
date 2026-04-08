# ✅ P0-2 重新审核标准

**审核人**: 小郭  
**修正口径**: 三个 publish 路径 + markBackupDone 根因确认  
**审核模式**: 严格

---

## 📋 4 个检查点（修正版）

### 检查点 1️⃣：createRealWallet — publish 顺序

**标准**:
```
业务逻辑完成 
  ↓ 
localStorage 写入成功
  ↓
通过 Object.defineProperty 发布 window.REAL_WALLET
```

**验收标准**:
```javascript
async function createRealWallet(forcedWordCount) {
  // 1. 生成钱包
  const w = { mnemonic, ethAddress, trxAddress, ... };
  
  // 2. 本地持久化（必须 await 完成）
  await saveWallet(w);
  applyReferralCredit();
  
  // 3. 再发布到 window（受控发布）
  Object.defineProperty(window, 'REAL_WALLET', {
    value: w,
    writable: false,
    configurable: false
  });
  REAL_WALLET = window.REAL_WALLET;  // ← 同步引用
  
  return w;
}
```

**验证方法**:
```javascript
// 监控 localStorage 写入时间 vs window.REAL_WALLET 赋值时间
var storeTime = null;
var assignTime = null;

// 代码执行中：
// storeTime < assignTime  ✅ 正确
// assignTime - storeTime < 10ms  ✅ 正确顺序
```

**通过条件**: ✅ 持久化完成 → 再发布

---

### 检查点 2️⃣：restoreWallet — publish 顺序 + 半成品防护

**标准**:
```
业务逻辑完成
  ↓
localStorage 写入（try-catch）
  ↓
失败 → return null（不发布）
成功 → 发布 window.REAL_WALLET
```

**验收标准**:
```javascript
async function restoreWallet(mnemonic) {
  // 1. 验证和导入
  var result = importWalletFlexible(raw);
  if (!result) return null;
  
  // 2. 生成公开对象
  var pub = {
    ethAddress: result.eth.address,
    trxAddress: result.trx.address,
    // ... 仅公开字段
  };
  
  // 3. 持久化（must succeed or fail completely）
  try {
    if (pin) {
      await saveWalletSecure(flatForStore, pin);
    } else {
      _saveWalletPlainPublicOnly({...});
    }
  } catch (e) {
    console.error('保存失败:', e);
    return null;  // ← 关键：失败时返回 null，不发布
  }
  
  // 4. 成功后才发布
  Object.defineProperty(window, 'REAL_WALLET', {
    value: pub,
    writable: false,
    configurable: false
  });
  REAL_WALLET = window.REAL_WALLET;
  
  return pub;
}
```

**通过条件**: 
- ✅ 持久化成功 → 发布
- ✅ 持久化失败 → return null（无半成品）

---

### 检查点 3️⃣：loadWalletPublic — 受控 publish 路径

**标准**: 必须走同一套受控 publish 路径，不能直接赋值

**验收标准**:
```javascript
function loadWalletPublic() {
  try {
    var d = Store.getWallet();
    if (!d || !d.ethAddress) return null;
    
    // 构建对象
    var walletObj = {
      ethAddress: d.ethAddress,
      trxAddress: d.trxAddress,
      btcAddress: d.btcAddress || '',
      createdAt: d.createdAt,
      backedUp: d.backedUp || false,
      hasEncrypted: !!d.encrypted
    };
    
    // 发布（受控）
    Object.defineProperty(window, 'REAL_WALLET', {
      value: walletObj,
      writable: false,
      configurable: false
    });
    REAL_WALLET = window.REAL_WALLET;  // ← 同步引用
    CHAIN_ADDR = (REAL_WALLET && REAL_WALLET.trxAddress) ? REAL_WALLET.trxAddress : '--';
    
    return walletObj;
  } catch (e) {
    console.error('[loadWalletPublic] error:', e);
    return null;
  }
}
```

**通过条件**: ✅ 用 Object.defineProperty + 同步引用

---

### 检查点 4️⃣：markBackupDone — 根因确认后修复

**标准**: 根据真实根因选择正确修复

**场景 A：如果只是 writable:false（变量级）**
```javascript
// ✅ 可以直接改属性
REAL_WALLET.backedUp = true;  // 成功
```

**场景 B：如果是 Object.freeze 或属性级 writable:false**
```javascript
// ❌ 不能直接改属性，必须重新赋值
REAL_WALLET.backedUp = true;  // 报错

// ✅ 正确做法
var updated = Object.assign({}, REAL_WALLET, { backedUp: true });
Object.defineProperty(window, 'REAL_WALLET', {
  value: updated,
  writable: false,
  configurable: false
});
REAL_WALLET = updated;
```

**验收标准**:
- ✅ 如果能直接改属性，就直接改
- ✅ 如果不能，就重新赋值对象
- ✅ localStorage 和内存同步
- ✅ 无报错

**通过条件**: ✅ backedUp 正确更新，无报错

---

## 📊 重新审核矩阵

| 检查点 | 标准 | 验收条件 | 通过标志 |
|--------|------|---------|---------|
| **1. createRealWallet** | 持久化 → 发布 | saveWallet 完成后赋值 | ✅ / ❌ |
| **2. restoreWallet** | 持久化 → 发布 / 失败 → null | try-catch + 返回 null | ✅ / ❌ |
| **3. loadWalletPublic** | 受控发布 | Object.defineProperty + 同步 | ✅ / ❌ |
| **4. markBackupDone** | 根因确认 + 正确修复 | 可改属性或重新赋值 | ✅ / ❌ |

---

## 🎯 4 个维度的审核

### 1️⃣ 主流程 — 是否破坏？

**检查**:
- [ ] 创建钱包流程：完整生成 → 完整保存 → 完整发布
- [ ] 导入钱包流程：验证 → 保存 → 发布（或失败 → null）
- [ ] 首页加载流程：读 localStorage → 发布
- [ ] 标记备份流程：修改内存和存储 → backedUp 同步
- [ ] markBackupDone 无报错

**通过标准**: 4 个流程都正常 ✅

---

### 2️⃣ 全局污染 — 是否增加污染？

**检查**:
- [ ] 无新全局变量
- [ ] 无新全局函数
- [ ] Object.defineProperty 是标准 API
- [ ] 代码结构清晰

**通过标准**: 零污染 ✅

---

### 3️⃣ 兼容性 — 是否有冲突？

**检查**:
- [ ] window.REAL_WALLET 和 REAL_WALLET 始终同一引用
- [ ] markBackupDone 能正确更新 backedUp
- [ ] 无属性修改冲突
- [ ] 无引用分离问题

**通过标准**: 兼容性完整 ✅

---

### 4️⃣ 上线适配 — 是否安全？

**检查**:
- [ ] 时间窗口关闭（持久化 → 发布）
- [ ] 半成品防护完整（失败 → null）
- [ ] publish 路径统一受控
- [ ] 防护措施有效（无法覆盖/删除）

**通过标准**: 可安全上线 ✅

---

## ✅ 最终判断标准

**全部通过** (4 个维度都 ✅) → **APPROVED**

**任何一个不通过** → **REJECTED** (列出具体问题，重新修改)

---

**现在按照这个标准，Cursor 重新实现 P0-2，我会按这个矩阵重新审核。**
