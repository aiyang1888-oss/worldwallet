# 🔍 P0-2 全项目发布收口审核

**审核标准**: 所有非空 REAL_WALLET 赋值是否收敛到唯一 publish helper

**扫描结果**: 18 个赋值点，需要分类

---

## 📊 全项目 REAL_WALLET 赋值点清单

### 非空赋值（需要 publish）

| # | 文件 | 行号 | 代码 | 分类 | 问题 |
|---|------|------|------|------|------|
| 1️⃣ | wallet.core.js | 103 | `window.REAL_WALLET = {ethAddress...}` | **load** (loadWalletPublic) | ❌ 无防护 |
| 2️⃣ | wallet.core.js | 240 | `window.REAL_WALLET = w;` | **create** (createRealWallet) | ⚠️ 无 await |
| 3️⃣ | wallet.core.js | 277 | `REAL_WALLET = pub;` | **restore** (restoreWallet) | ⚠️ 无 try-catch |
| 4️⃣ | wallet.core.js | 278 | `window.REAL_WALLET = pub;` | **restore** (restoreWallet) | ⚠️ 无 try-catch |
| 5️⃣ | wallet.ui.js | 723 | `window.REAL_WALLET = {...}` | **pin setup** (finalizeImportedWalletAfterPin) | ❌ 旁路发布 |
| 6️⃣ | wallet.ui.js | 1562 | `window.REAL_WALLET = REAL_WALLET;` | **sync** (某函数) | ⚠️ 旁路同步 |
| 7️⃣ | wallet.ui.js | 3003 | `REAL_WALLET = {...}` | **verify** (checkVerify) | ❌ 旁路发布 |
| 8️⃣ | wallet.ui.js | 3015 | `window.REAL_WALLET = REAL_WALLET;` | **verify** (checkVerify) | ⚠️ 旁路同步 |
| 9️⃣ | wallet.ui.js | 3380 | `window.REAL_WALLET = {...}` | **unlock** (_resumeWalletAfterUnlock) | ❌ 旁路发布 |
| 🔟 | wallet.runtime.js | 1003 | `window.REAL_WALLET = w;` | **runtime** (某函数) | ❌ 旁路发布 |
| 1️⃣1️⃣ | wallet.runtime.js | 1065 | `window.REAL_WALLET = w;` | **runtime** (某函数) | ❌ 旁路发布 |
| 1️⃣2️⃣ | wallet.runtime.js | 6249 | `window.REAL_WALLET = {};` | **runtime** (某函数) | ❌ 旁路发布 (空对象) |

### null 赋值（清除，可接受）

| # | 文件 | 行号 | 代码 | 分类 | 风险 |
|---|------|------|------|------|------|
| 1 | wallet.dom-bind.js | 143 | `window.REAL_WALLET = null;` | **delete** | ✅ 清除操作 |
| 2 | wallet.ui.js | 2483 | `REAL_WALLET = null;` | **delete** | ✅ 清除操作 |
| 3 | wallet.ui.js | 2484 | `window.REAL_WALLET = null;` | **delete** | ✅ 清除操作 |
| 4 | wallet.runtime.js | 4559 | `window.REAL_WALLET = null;` | **delete** | ✅ 清除操作 |

### 防护性赋值（初始化）

| # | 文件 | 行号 | 代码 | 分类 | 风险 |
|---|------|------|------|------|------|
| 1 | wallet.ui.js | 2994 | `if(!REAL_WALLET) REAL_WALLET = {};` | **防护初始化** | ⚠️ 不应该赋值 |
| 2 | wallet.runtime.js | 6249 | `if(!REAL_WALLET) window.REAL_WALLET = {};` | **防护初始化** | ⚠️ 不应该赋值 |

---

## 🔴 关键问题分析

### 问题 1️⃣：非空赋值散布在 4 个文件中

**应该集中在**:
- wallet.core.js: createRealWallet / restoreWallet / loadWalletPublic
- (可选) wallet.runtime.js: 少数几个全局初始化

**实际分布**:
- ✅ wallet.core.js (3 个) - 预期
- ❌ wallet.ui.js (5 个) - **旁路发布**（PIN setup、verify、unlock）
- ❌ wallet.runtime.js (4 个) - **旁路发布**（runtime 各地）

### 问题 2️⃣：旁路发布清单

这些非空赋值**完全绕过 wallet.core.js 的 publish 机制**：

| 旁路点 | 文件位置 | 原因 | 应该做什么 |
|--------|---------|------|----------|
| finalizeImportedWalletAfterPin | wallet.ui.js:723 | PIN 设置完成，导入钱包 | 调用 publish helper |
| checkVerify | wallet.ui.js:3003/3015 | 助记词验证通过 | 调用 publish helper |
| _resumeWalletAfterUnlock | wallet.ui.js:3380 | 解锁钱包（解密敏感数据） | 调用 publish helper |
| wallet.runtime.js 各处 | wallet.runtime.js:1003/1065/6249 | 全局钱包初始化 | 调用 publish helper |

### 问题 3️⃣：wallet.core.js 本身也有问题

即使 wallet.core.js 修复了，其他 4 个地方仍然**旁路绕过**：

```
预期流程:
wallet.core.js publish() → 防护 (Object.defineProperty)

实际流程:
wallet.core.js publish()  ✅
wallet.ui.js 旁路赋值     ❌ (直接覆盖 window.REAL_WALLET)
wallet.runtime.js 旁路赋值 ❌ (直接覆盖 window.REAL_WALLET)
```

---

## 🎯 6 项检查结果

### 检查 1️⃣：grep 全项目非空赋值点

**结果**: ✅ 完成  
**发现**: 12 个非空赋值点

---

### 检查 2️⃣：是否全部收敛到唯一 publish helper

**检查方法**: 
```bash
grep -n "Object.defineProperty.*REAL_WALLET" wallet-shell/*.js
```

**结果**: ❌ **完全未实现**

- 没有 publish helper 函数
- 12 个非空赋值都是直接赋值
- 没有 Object.defineProperty 保护

**判定**: FAILED

---

### 检查 3️⃣：create — persist 后 publish

**wallet.core.js createRealWallet**:
```javascript
window.REAL_WALLET = w;    // ❌ 直接赋值
REAL_WALLET = w;
saveWallet(w);             // ❌ 无 await
```

**问题**:
- ❌ 无 await
- ❌ 无 publish helper
- ❌ 时间窗口漏洞

**判定**: FAILED

---

### 检查 4️⃣：restore — persist 后 publish；失败不留脏

**wallet.core.js restoreWallet**:
```javascript
REAL_WALLET = pub;         // ❌ 直接赋值
window.REAL_WALLET = pub;
await saveWalletSecure();  // ❌ 无 try-catch
```

**问题**:
- ❌ 无 try-catch
- ❌ 无 publish helper
- ❌ 半成品防护缺失

**判定**: FAILED

---

### 检查 5️⃣：load/public — 同一套 publish 机制

**wallet.core.js loadWalletPublic**:
```javascript
window.REAL_WALLET = {...};  // ❌ 直接赋值，无防护
REAL_WALLET = window.REAL_WALLET;
```

**问题**:
- ❌ 无 Object.defineProperty
- ❌ 与其他地方的发布方式不一致（直接赋值）

**判定**: FAILED

---

### 检查 6️⃣：clear-to-null 和 markBackupDone 兼容性

**clear-to-null**:
```javascript
// wallet.dom-bind.js L143 / wallet.ui.js L2484
window.REAL_WALLET = null;  // ✅ 可以接受（清除）
```

**markBackupDone**:
```javascript
if(REAL_WALLET) REAL_WALLET.backedUp = true;  // ❓ 能否修改属性
```

**问题**:
- ✅ null 赋值可以接受
- ❓ backedUp 属性修改（取决于防护实现）

**判定**: PARTIAL（取决于 Object.defineProperty 实现）

---

## 🔴 总结：旁路发布清单

**这 12 个非空赋值都是旁路**（不经过统一 publish helper）：

```
✅ 收敛点（应该存在但不存在）:
  wwPublishRealWallet(wallet, options)

❌ 旁路点（应该被消除）:
  1. wallet.core.js:240    createRealWallet
  2. wallet.core.js:277    restoreWallet
  3. wallet.core.js:103    loadWalletPublic
  4. wallet.ui.js:723      finalizeImportedWalletAfterPin
  5. wallet.ui.js:3003     checkVerify
  6. wallet.ui.js:3380     _resumeWalletAfterUnlock
  7. wallet.runtime.js:1003 (某函数)
  8. wallet.runtime.js:1065 (某函数)
  9. wallet.runtime.js:6249 (防护初始化)
  + 更多...
```

---

## 📋 通过标准判定

**标准**: 不存在任何非空旁路直接赋值

**实际**: 至少 12 个旁路点

**结果**: ❌ **FAILED — P0-2 不通过**

---

**必须**创建统一 publish helper，所有 12 个点都改为调用该 helper。
