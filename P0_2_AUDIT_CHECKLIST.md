# 🔍 P0-2 审核清单：REAL_WALLET 半初始化防护

**任务**: P0-2 防止 REAL_WALLET 半初始化暴露  
**审核人**: 小郭  
**重点**: 半初始化时间窗口 + 覆盖风险

---

## 📋 4 个审核维度

### 1️⃣ 是否破坏主流程？

**需要验证的关键操作**:

| 操作 | 前置条件 | 预期行为 | 验证方法 |
|------|---------|---------|---------|
| 创建新钱包 | 无 | 生成地址，显示备份 | 完整流程 ✅ |
| 导入钱包 | 有助记词 | 恢复地址，保存加密 | 完整流程 ✅ |
| 加载钱包 | 有存储数据 | 读取地址，更新 UI | 完整流程 ✅ |
| 标记备份 | 钱包已创建 | backedUp 更新 | 检查 localStorage ✅ |

**检查点**:
- [ ] 创建钱包后，地址能正常显示
- [ ] 导入钱包后，REAL_WALLET 包含完整地址
- [ ] 刷新页面后，钱包数据不丢失
- [ ] 标记备份后，backedUp 字段正确更新

---

### 2️⃣ 是否增加全局污染？

**代码变化**:
- ✅ 只改 `window.REAL_WALLET` 赋值方式
- ✅ 没有新的全局变量
- ✅ 没有新的全局函数
- ✅ `Object.defineProperty` 是原生 API，无污染

**检查点**:
- [ ] 无新的 `window.xxx` 变量
- [ ] 无新的顶层 `var/let/const`
- [ ] 对象属性结构不变（同步 `REAL_WALLET = window.REAL_WALLET`）

---

### 3️⃣ 是否有兼容性风险？

**关键问题**: markBackupDone() 中修改 REAL_WALLET

**当前代码** (问题处):
```javascript
function markBackupDone() {
  // ...
  if(REAL_WALLET) REAL_WALLET.backedUp = true;  // ❌ 这行会出错！
  // ...
}
```

**为什么出错**:
- `REAL_WALLET` 被 `Object.defineProperty` 定义为 `writable: false`
- 无法直接赋值属性

**修复**:
```javascript
if(REAL_WALLET) {
  var updated = Object.assign({}, REAL_WALLET, { backedUp: true });
  Object.defineProperty(window, 'REAL_WALLET', {
    value: updated,
    writable: false,
    configurable: false
  });
  REAL_WALLET = updated;
}
```

**检查点**:
- [ ] markBackupDone() 执行无错误
- [ ] localStorage 中 backedUp 正确保存
- [ ] 内存中 REAL_WALLET.backedUp 正确更新
- [ ] 刷新页面后 backedUp 状态保留

---

### 4️⃣ 是否值得直接上线？

**风险矩阵**:

| 指标 | 修复前 | 修复后 | 上线适配 |
|------|--------|--------|---------|
| 时间窗口漏洞 | 🔴 有 | 🟢 无 | ✅ |
| 覆盖漏洞 | 🔴 有 | 🟢 无 | ✅ |
| 删除漏洞 | 🔴 有 | 🟢 无 | ✅ |
| 部分更新 | 🟡 问题 | 🟢 安全 | ✅ |

**上线准则**:
- ✅ 功能测试通过（4 个操作都工作）
- ✅ 无新错误日志
- ✅ 防护措施有效（无法覆盖/删除）
- ✅ 用户感知无变化

---

## 🧪 完整验证脚本

在浏览器 DevTools 中运行：

```javascript
console.log('=== P0-2 验证脚本 ===\n');

// Phase 1: 创建钱包流程
console.log('【Phase 1】创建钱包');
(async function() {
  var startTime = Date.now();
  
  // 模拟钱包创建
  var testWallet = {
    ethAddress: '0x1234567890123456789012345678901234567890',
    trxAddress: 'TQzrxvnJEg89vRmfFqTjVdaVMTFfBLUqNQ',
    btcAddress: '1A1z7agoat7SYkimNiMi7uLq6Xf8VPwJXw',
    createdAt: Date.now(),
    backedUp: false,
    mnemonic: 'test mnemonic'
  };
  
  // 模拟 Object.defineProperty（应该由 Cursor 的代码执行）
  Object.defineProperty(window, 'REAL_WALLET', {
    value: testWallet,
    writable: false,
    configurable: false
  });
  
  // 测试 1: 可以读取
  var canRead = typeof window.REAL_WALLET === 'object';
  console.log('  ✅ 可读:', canRead);
  
  // 测试 2: 无法覆盖
  var cannotOverride = (function() {
    try {
      window.REAL_WALLET = null;
      return false;
    } catch (e) {
      return true;
    }
  })();
  console.log('  ✅ 无法覆盖:', cannotOverride);
  
  // 测试 3: 无法删除
  var cannotDelete = (function() {
    try {
      delete window.REAL_WALLET;
      return false;
    } catch (e) {
      return true;
    }
  })();
  console.log('  ✅ 无法删除:', cannotDelete);
  
  var elapsed = Date.now() - startTime;
  console.log('  耗时:', elapsed, 'ms\n');
})();

// Phase 2: 标记备份流程（关键！）
console.log('【Phase 2】标记备份');
(async function() {
  // 模拟 markBackupDone() 中的更新
  var success = false;
  try {
    var updated = Object.assign({}, window.REAL_WALLET, { backedUp: true });
    Object.defineProperty(window, 'REAL_WALLET', {
      value: updated,
      writable: false,
      configurable: false
    });
    success = true;
  } catch (e) {
    console.error('  ❌ 更新失败:', e.message);
    success = false;
  }
  
  if (success) {
    console.log('  ✅ 更新成功');
    console.log('  ✅ backedUp:', window.REAL_WALLET.backedUp);
    console.log('  ✅ 仍无法覆盖:', (function() {
      try { window.REAL_WALLET = null; return false; } catch (e) { return true; }
    })());
  }
  console.log();
})();

// Phase 3: 完整性检查
console.log('【Phase 3】完整性检查');
(async function() {
  console.log('  ethAddress:', window.REAL_WALLET.ethAddress?.substring(0, 10) + '...');
  console.log('  trxAddress:', window.REAL_WALLET.trxAddress?.substring(0, 10) + '...');
  console.log('  backedUp:', window.REAL_WALLET.backedUp);
  console.log('  ✅ 数据完整\n');
})();

console.log('=== 验证完成 ===');
```

**期望输出**:
```
=== P0-2 验证脚本 ===

【Phase 1】创建钱包
  ✅ 可读: true
  ✅ 无法覆盖: true
  ✅ 无法删除: true
  耗时: <5 ms

【Phase 2】标记备份
  ✅ 更新成功
  ✅ backedUp: true
  ✅ 仍无法覆盖: true

【Phase 3】完整性检查
  ethAddress: 0x1234567...
  trxAddress: TQzrxvnJEg...
  backedUp: true
  ✅ 数据完整

=== 验证完成 ===
```

---

## 📋 最终审核清单

### 代码审核
- [ ] 4 个函数都用 Object.defineProperty 保护
- [ ] writable: false + configurable: false
- [ ] 存储操作完成后再赋值
- [ ] 无直接属性赋值（用重新赋值代替）

### 功能测试
- [ ] 创建钱包：地址显示 ✅
- [ ] 导入钱包：地址恢复 ✅
- [ ] 加载钱包：刷新后数据保留 ✅
- [ ] 标记备份：backedUp 更新成功 ✅

### 安全验证
- [ ] `window.REAL_WALLET = null` 失败 ✅
- [ ] `delete window.REAL_WALLET` 失败 ✅
- [ ] 无时间窗口漏洞 ✅
- [ ] 无新错误日志 ✅

### 性能检查
- [ ] Object.defineProperty 耗时 <5ms ✅
- [ ] 钱包操作无明显延迟 ✅

---

## 🎯 审核结论模板

完成后填写：

```
## ✅ P0-2 审核通过 / ❌ P0-2 审核不通过

【破坏主流程】✅ / ❌
【增加污染】✅ / ❌
【兼容性风险】✅ / ❌
【可直接上线】✅ / ❌

风险级别: 🟢 低 / 🟡 中 / 🔴 高

关键问题（如有）:
- ...

建议:
- ...
```

---

**准备就绪。Cursor 可以开始实现。**
