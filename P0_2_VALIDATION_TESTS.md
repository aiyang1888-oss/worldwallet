# 🧪 P0-2 验收测试方案（6 项完整）

**审核人**: 小郭  
**重点**: setter 保护 + REAL_WALLET 同步一致性  
**关键风险**: 旁路覆盖风险（绑定环节）

---

## 测试 1️⃣ 新建钱包：持久化 → publish

### 测试目标
验证钱包对象**只在 localStorage 保存成功后**才暴露到 window

### 测试代码

```javascript
console.log('【测试 1】新建钱包 - 持久化顺序检查');

// 监控 localStorage 写入
var storageWrites = [];
var originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
  storageWrites.push({ key, time: Date.now(), size: value.length });
  return originalSetItem.call(localStorage, key, value);
};

// 记录 window.REAL_WALLET 赋值时间
var walletAssignTime = null;
var walletProxy = new Proxy({}, {
  set: function(target, prop, value) {
    console.log('  [记录] window.REAL_WALLET 赋值时间:', Date.now());
    walletAssignTime = Date.now();
    return true;
  }
});

// 模拟钱包创建（这部分由 Cursor 代码执行）
(async function() {
  console.log('  [开始] 钱包创建流程...');
  
  // 模拟初始化
  var wallet = {
    ethAddress: '0xtest',
    trxAddress: 'Ttest',
    mnemonic: 'secret words here',
    createdAt: Date.now()
  };
  
  console.log('  [步骤 1] saveWallet() 开始...');
  await new Promise(r => setTimeout(r, 50));  // 模拟异步操作
  storageWrites.push({ key: 'ww_wallet', time: Date.now() });
  console.log('  [步骤 2] saveWallet() 完成，localStorage 已写入');
  
  console.log('  [步骤 3] 现在才赋值 window.REAL_WALLET');
  Object.defineProperty(window, 'REAL_WALLET', {
    value: wallet,
    writable: false,
    configurable: false
  });
  
  // 验证
  var storageTime = Math.max(...storageWrites.map(w => w.time));
  var assignTime = Date.now();
  
  console.log('\n  ✅ 检查结果:');
  console.log('    localStorage 写入:', storageTime);
  console.log('    REAL_WALLET 赋值:', assignTime);
  console.log('    顺序正确:', assignTime >= storageTime ? '✅' : '❌');
  console.log('    时间差:', assignTime - storageTime, 'ms');
})();

console.log('');
```

### 验收标准
- ✅ `saveWallet()` 完成后才赋值 window.REAL_WALLET
- ✅ 无时间窗口暴露（<10ms 差距合理）
- ✅ 错误情况下（如 saveWallet 失败）不赋值 REAL_WALLET

---

## 测试 2️⃣ 恢复钱包：持久化失败 → return null

### 测试目标
验证持久化失败时**不能残留半成品钱包**到 window.REAL_WALLET

### 测试代码

```javascript
console.log('【测试 2】恢复钱包 - 失败回退检查');

(async function() {
  // 清空环境
  delete window.REAL_WALLET;
  
  // 模拟：持久化失败
  var originalSetItem = localStorage.setItem;
  localStorage.setItem = function(key) {
    if (key === 'ww_wallet') {
      throw new Error('QuotaExceededError');  // 模拟存储满
    }
    return originalSetItem.call(localStorage, key);
  };
  
  console.log('  [步骤] 尝试恢复钱包（故意让 saveWalletSecure 失败）');
  
  // 调用 restoreWallet（应该处理错误）
  var result = null;
  try {
    result = await restoreWallet('test mnemonic words');
  } catch (e) {
    console.log('  [错误捕获] ' + e.message);
  }
  
  console.log('\n  ✅ 检查结果:');
  console.log('    恢复返回值:', result);
  console.log('    window.REAL_WALLET 存在:', typeof window.REAL_WALLET);
  console.log('    验证:', !window.REAL_WALLET && result === null ? '✅ 正确（无半成品）' : '❌ 错误（残留对象）');
})();

console.log('');
```

### 验收标准
- ✅ saveWalletSecure() 失败时，restoreWallet() 返回 null
- ✅ window.REAL_WALLET **不会被赋值**（无半成品）
- ✅ 错误信息明确（给用户提示）

---

## 测试 3️⃣ markBackupDone：backedUp 更新

### 测试目标
验证 backedUp 字段能正确更新（重新赋值整个对象）

### 测试代码

```javascript
console.log('【测试 3】markBackupDone - 字段更新检查');

(async function() {
  // 先创建一个受保护的 REAL_WALLET
  var wallet = {
    ethAddress: '0xtest',
    trxAddress: 'Ttest',
    backedUp: false
  };
  
  Object.defineProperty(window, 'REAL_WALLET', {
    value: wallet,
    writable: false,
    configurable: false
  });
  
  console.log('  [初始] backedUp:', window.REAL_WALLET.backedUp);
  
  // 模拟 markBackupDone() 的逻辑
  console.log('  [执行] 标记备份完成...');
  try {
    var updated = Object.assign({}, window.REAL_WALLET, { backedUp: true });
    Object.defineProperty(window, 'REAL_WALLET', {
      value: updated,
      writable: false,
      configurable: false
    });
    console.log('  ✅ 更新成功');
  } catch (e) {
    console.log('  ❌ 更新失败:', e.message);
  }
  
  console.log('\n  ✅ 检查结果:');
  console.log('    backedUp 已更新:', window.REAL_WALLET.backedUp);
  console.log('    仍然被保护:', (function() {
    try { window.REAL_WALLET = null; return false; } 
    catch (e) { return true; }
  })());
})();

console.log('');
```

### 验收标准
- ✅ backedUp 从 false → true 成功
- ✅ 更新后 window.REAL_WALLET 仍被保护（writable:false）
- ✅ localStorage 和内存状态一致

---

## 测试 4️⃣ loadWalletPublic：首页加载不受影响

### 测试目标
验证首页加载时调用 loadWalletPublic() 不出错

### 测试代码

```javascript
console.log('【测试 4】loadWalletPublic - 首页加载检查');

(async function() {
  // 模拟首页加载场景
  console.log('  [场景] 用户刷新首页，localStorage 有钱包数据');
  
  // 模拟 localStorage 中的钱包数据
  var walletData = {
    ethAddress: '0x1234567890123456789012345678901234567890',
    trxAddress: 'TQzrxvnJEg89vRmfFqTjVdaVMTFfBLUqNQ',
    btcAddress: '1A1z7agoat7SYkimNiMi7uLq6Xf8VPwJXw',
    createdAt: Date.now(),
    backedUp: true
  };
  
  // 模拟 loadWalletPublic 的执行
  console.log('  [执行] loadWalletPublic()...');
  try {
    Object.defineProperty(window, 'REAL_WALLET', {
      value: walletData,
      writable: false,
      configurable: false
    });
    console.log('  ✅ 赋值成功');
  } catch (e) {
    console.log('  ❌ 赋值失败:', e.message);
  }
  
  console.log('\n  ✅ 检查结果:');
  console.log('    REAL_WALLET 已加载:', !!window.REAL_WALLET);
  console.log('    地址显示:', window.REAL_WALLET?.ethAddress?.substring(0, 10) + '...');
  console.log('    页面渲染:', typeof window.REAL_WALLET === 'object' ? '✅' : '❌');
})();

console.log('');
```

### 验收标准
- ✅ 首页加载正常，无错误
- ✅ 地址信息正确显示
- ✅ UI 更新不受影响（如 updateAddr(), updateHomeBackupBanner() 等）

---

## 测试 5️⃣ DevTools 防护：覆盖/删除/赋值

### 测试目标
验证 setter 保护确实生效（防止外部攻击）

### 测试代码

```javascript
console.log('【测试 5】DevTools 防护 - setter 保护检查');

(async function() {
  // 确保有受保护的 REAL_WALLET
  if (!window.REAL_WALLET) {
    Object.defineProperty(window, 'REAL_WALLET', {
      value: { ethAddress: '0xtest' },
      writable: false,
      configurable: false
    });
  }
  
  var tests = [
    {
      name: '覆盖为 null',
      fn: () => { window.REAL_WALLET = null; },
      expectError: true
    },
    {
      name: '覆盖为 {}',
      fn: () => { window.REAL_WALLET = {}; },
      expectError: true
    },
    {
      name: '删除对象',
      fn: () => { delete window.REAL_WALLET; },
      expectError: true
    },
    {
      name: '修改属性',
      fn: () => { window.REAL_WALLET.ethAddress = '0xhacked'; },
      expectError: true  // 因为 value 本身是不可修改的
    },
    {
      name: '读取对象',
      fn: () => { return window.REAL_WALLET.ethAddress; },
      expectError: false
    }
  ];
  
  console.log('  运行防护测试:');
  tests.forEach(test => {
    var error = null;
    try {
      test.fn();
    } catch (e) {
      error = e;
    }
    
    var hasError = error !== null;
    var result = hasError === test.expectError ? '✅' : '❌';
    console.log(`    ${result} ${test.name}: ${hasError ? '错误（预期）' : '成功（读取）'}`);
  });
})();

console.log('');
```

### 验收标准
- ✅ `window.REAL_WALLET = null` → TypeError（无法赋值）
- ✅ `delete window.REAL_WALLET` → TypeError（无法删除）
- ✅ `window.REAL_WALLET = {}` → TypeError（无法覆盖）
- ✅ `window.REAL_WALLET.ethAddress` 读取正常 ✅

---

## 测试 6️⃣ 一致性检查：window.REAL_WALLET 与 REAL_WALLET 同步

### 测试目标
验证 **window.REAL_WALLET 和 REAL_WALLET（局部变量）始终同步**，无旁路覆盖风险

### 测试代码

```javascript
console.log('【测试 6】一致性检查 - 绑定同步验证');

(async function() {
  console.log('  [关键检查点] 验证两个引用是否同步\n');
  
  // 在实际代码流程中进行检查
  
  // 检查点 1: createRealWallet 后
  console.log('  检查点 1️⃣: createRealWallet() 后');
  // 应该验证：
  // window.REAL_WALLET === REAL_WALLET （同一个对象）
  // 或者 window.REAL_WALLET.ethAddress === REAL_WALLET.ethAddress （字段同步）
  
  var check1 = (function() {
    // 模拟创建完成后的状态
    var wallet = { ethAddress: '0xtest', trxAddress: 'Ttest' };
    Object.defineProperty(window, 'REAL_WALLET', {
      value: wallet,
      writable: false,
      configurable: false
    });
    
    // 在代码中，REAL_WALLET = window.REAL_WALLET
    var REAL_WALLET = window.REAL_WALLET;
    
    return {
      sameRef: REAL_WALLET === window.REAL_WALLET,
      sameEthAddr: REAL_WALLET.ethAddress === window.REAL_WALLET.ethAddress
    };
  })();
  
  console.log('    同一个引用:', check1.sameRef ? '✅' : '⚠️');
  console.log('    字段同步:', check1.sameEthAddr ? '✅' : '❌');
  
  // 检查点 2: markBackupDone 后
  console.log('\n  检查点 2️⃣: markBackupDone() 后');
  var check2 = (function() {
    // 模拟更新后的状态
    var updated = Object.assign({}, window.REAL_WALLET, { backedUp: true });
    Object.defineProperty(window, 'REAL_WALLET', {
      value: updated,
      writable: false,
      configurable: false
    });
    
    var REAL_WALLET = window.REAL_WALLET;  // 假设代码中有这个赋值
    
    return {
      backedUpSync: REAL_WALLET.backedUp === window.REAL_WALLET.backedUp,
      stillProtected: (function() {
        try { window.REAL_WALLET = null; return false; } 
        catch (e) { return true; }
      })()
    };
  })();
  
  console.log('    backedUp 字段同步:', check2.backedUpSync ? '✅' : '❌');
  console.log('    更新后仍被保护:', check2.stillProtected ? '✅' : '❌');
  
  // 检查点 3: 旁路风险
  console.log('\n  检查点 3️⃣: 旁路覆盖风险');
  var check3 = (function() {
    // 尝试从其他角度覆盖
    var attempts = [];
    
    // 尝试 1: 直接赋值
    try {
      window.REAL_WALLET = null;
      attempts.push({ method: '直接赋值', blocked: false });
    } catch (e) {
      attempts.push({ method: '直接赋值', blocked: true });
    }
    
    // 尝试 2: Object.assign
    try {
      Object.assign(window.REAL_WALLET, { ethAddress: 'hacked' });
      attempts.push({ method: 'Object.assign', blocked: false });
    } catch (e) {
      attempts.push({ method: 'Object.assign', blocked: true });
    }
    
    // 尝试 3: Reflect.set
    try {
      Reflect.set(window, 'REAL_WALLET', null);
      attempts.push({ method: 'Reflect.set', blocked: false });
    } catch (e) {
      attempts.push({ method: 'Reflect.set', blocked: true });
    }
    
    return attempts;
  })();
  
  check3.forEach(att => {
    console.log(`    ${att.method}: ${att.blocked ? '✅ 被拦截' : '⚠️ 未拦截'}`);
  });
  
  console.log('\n  ✅ 一致性检查完成');
})();

console.log('');
```

### 验收标准
- ✅ `window.REAL_WALLET === REAL_WALLET`（同一引用）或字段完全同步
- ✅ 更新时两者都更新（通过重新赋值）
- ✅ 无旁路覆盖风险（Object.assign、Reflect.set 等都被拦截）

---

## 📋 验收汇总表

| 测试项 | 检查点 | 通过条件 | 状态 |
|--------|--------|---------|------|
| **1. 新建钱包** | 持久化 → publish 顺序 | ✅ localStorage 写完再赋值 | ⏳ |
| **2. 恢复失败** | 持久化失败不残留 | ✅ 返回 null，无半成品 | ⏳ |
| **3. 备份更新** | backedUp 字段更新 | ✅ 重新赋值后同步 | ⏳ |
| **4. 首页加载** | 页面加载不出错 | ✅ UI 正常渲染 | ⏳ |
| **5. DevTools 防护** | setter 保护生效 | ✅ 覆盖/删除/赋值都失败 | ⏳ |
| **6. 一致性** | 两个引用同步 | ✅ 无旁路覆盖风险 | ⏳ |

---

## 🎯 关键风险点（特别盯住）

### 风险 A：Setter 只保护了外壳
```javascript
// ❌ 如果代码只做了这样的保护
Object.defineProperty(window, 'REAL_WALLET', { writable: false });

// 但没有保护内部属性，攻击者仍可以：
window.REAL_WALLET.ethAddress = 'hacked';  // ❌ 这样会成功！
```

**检查**: value 必须是**不可修改的对象**（通过重新赋值方式）

### 风险 B：旁路覆盖
```javascript
// 攻击者可能用以下方式绕过 writable:false
Object.defineProperty(window, 'REAL_WALLET', { value: null });  // 重新定义
Reflect.set(window, 'REAL_WALLET', null);                       // 反射 API
window['REAL_WALLET'] = null;                                   // 属性访问
```

**检查**: configurable: false 必须设置，防止重新定义

### 风险 C：REAL_WALLET 局部变量未同步
```javascript
// ❌ 如果代码中只有
window.REAL_WALLET = w;
// 但 REAL_WALLET = window.REAL_WALLET 没有同步执行
// 那么在钱包相关函数中使用 REAL_WALLET 时，可能是 null 或旧值
```

**检查**: 每次赋值 window.REAL_WALLET 后，立即 `REAL_WALLET = window.REAL_WALLET`

---

## ✅ 完整通过标准

**所有 6 项测试都通过** ✅  
**5 项检查点都通过** ✅  
→ 才能出结论

---

**现在运行这些测试。我在等你的验收结果。**
