# 🔍 P0-2 重新审核：markBackupDone 根因分析

**审核人**: 小郭  
**重点**: 确认 markBackupDone 的真实问题（不要默认 writable:false）

---

## 🔎 markBackupDone 问题溯源

### 当前代码（Line 731）
```javascript
function markBackupDone() {
  const w = JSON.parse(localStorage.getItem('ww_wallet')||'{}');
  w.backedUp = true;
  localStorage.setItem('ww_wallet', JSON.stringify(w));
  
  if(REAL_WALLET) REAL_WALLET.backedUp = true;  // ← 这行是否会出错？
  
  const el = document.getElementById('backupStatus');
  if(el) { el.textContent='已备份 ✓'; el.style.color='var(--green,#26a17b)'; }
  // ...
}
```

### 问题候选清单

#### 可能性 A：writable:false 导致报错
```javascript
Object.defineProperty(window, 'REAL_WALLET', {
  value: { backedUp: false },
  writable: false  // ← 这阻止了重新赋值
});

REAL_WALLET.backedUp = true;  // ❌ TypeError?
```

**检验**:
```javascript
// 创建只读对象
var obj = {};
Object.defineProperty(window, 'testObj', {
  value: obj,
  writable: false
});

// 尝试修改属性
window.testObj.x = 1;  // 这个会失败吗？
```

**答案**: `writable: false` 只限制**重新赋值整个变量**，不限制**修改对象内部属性**
```javascript
window.testObj = null;  // ❌ TypeError（因为 writable:false）
window.testObj.x = 1;   // ✅ 成功（对象属性可修改）
```

#### 可能性 B：Object.freeze 导致报错
如果代码中用了 `Object.freeze()` 冻结对象：
```javascript
const w = { backedUp: false };
Object.freeze(w);  // 冻结对象
Object.defineProperty(window, 'REAL_WALLET', {
  value: w,
  writable: false,
  configurable: false
});

REAL_WALLET.backedUp = true;  // ❌ TypeError（对象被冻结）
```

#### 可能性 C：属性描述符限制
如果对象属性被定义为不可写：
```javascript
const w = { backedUp: false };
Object.defineProperty(w, 'backedUp', {
  value: false,
  writable: false  // ← 属性级别不可写
});

REAL_WALLET.backedUp = true;  // ❌ TypeError
```

#### 可能性 D：REAL_WALLET 和 window.REAL_WALLET 分离
如果代码中有：
```javascript
var REAL_WALLET = {...};       // 局部变量
Object.defineProperty(window, 'REAL_WALLET', {
  value: {...different...}     // ← 不同的对象！
});

REAL_WALLET.backedUp = true;   // 改的是局部变量
window.REAL_WALLET.backedUp;   // 看不到修改
```

---

## 📋 逐一检验

### 检验 A：writable:false 的实际影响

```javascript
console.log('【检验 A】writable:false 的影响');

(function() {
  // 创建只读变量，但对象属性可修改
  var obj = { backedUp: false };
  Object.defineProperty(window, 'TEST_A', {
    value: obj,
    writable: false,
    configurable: false
  });
  
  // 尝试修改属性
  try {
    window.TEST_A.backedUp = true;
    console.log('  ✅ 可以修改属性:', window.TEST_A.backedUp);
  } catch (e) {
    console.log('  ❌ 报错:', e.message);
  }
  
  // 尝试重新赋值变量
  try {
    window.TEST_A = null;
    console.log('  ⚠️ 可以重新赋值');
  } catch (e) {
    console.log('  ✅ 无法重新赋值:', e.message);
  }
})();
```

**预期结果**:
- ✅ 可以修改属性（backedUp = true）
- ❌ 无法重新赋值（writable:false）

---

### 检验 B：Object.freeze 的影响

```javascript
console.log('【检验 B】Object.freeze 的影响');

(function() {
  // 创建冻结对象
  var obj = { backedUp: false };
  Object.freeze(obj);  // 冻结
  
  Object.defineProperty(window, 'TEST_B', {
    value: obj,
    writable: false,
    configurable: false
  });
  
  // 尝试修改属性
  try {
    window.TEST_B.backedUp = true;
    console.log('  ✅ 可以修改属性:', window.TEST_B.backedUp);
  } catch (e) {
    console.log('  ❌ 报错（被冻结）:', e.message);
  }
})();
```

**预期结果**:
- ❌ 无法修改属性（对象被冻结）

---

### 检验 C：属性级别 writable:false

```javascript
console.log('【检验 C】属性级别 writable:false');

(function() {
  // 在对象属性上设置 writable:false
  var obj = {};
  Object.defineProperty(obj, 'backedUp', {
    value: false,
    writable: false  // ← 属性级别
  });
  
  Object.defineProperty(window, 'TEST_C', {
    value: obj,
    writable: false,
    configurable: false
  });
  
  // 尝试修改属性
  try {
    window.TEST_C.backedUp = true;
    console.log('  ✅ 可以修改属性:', window.TEST_C.backedUp);
  } catch (e) {
    console.log('  ❌ 报错（属性不可写）:', e.message);
  }
})();
```

**预期结果**:
- ❌ 无法修改属性

---

### 检验 D：引用不同步

```javascript
console.log('【检验 D】REAL_WALLET 和 window.REAL_WALLET 是否同步');

(function() {
  // 场景：两个不同的对象
  var REAL_WALLET = { backedUp: false };  // 局部变量
  var windowObj = { backedUp: false };    // window 对象
  
  Object.defineProperty(window, 'TEST_D', {
    value: windowObj,  // ← 不同的对象！
    writable: false,
    configurable: false
  });
  
  // 修改局部变量
  REAL_WALLET.backedUp = true;
  console.log('  局部 REAL_WALLET.backedUp:', REAL_WALLET.backedUp);
  console.log('  window.REAL_WALLET.backedUp:', window.TEST_D.backedUp);
  
  if (REAL_WALLET.backedUp !== window.TEST_D.backedUp) {
    console.log('  ❌ 不同步！两个对象不是同一个引用');
  }
})();
```

---

## 🎯 确认真实根因

在 markBackupDone 中：

```javascript
if(REAL_WALLET) REAL_WALLET.backedUp = true;
```

这行**是否会出错**取决于：

| 条件 | 会出错？ | 原因 |
|------|---------|------|
| ✅ 对象可写，属性无限制 | ❌ 不会 | 正常赋值 |
| ✅ writable:false，但没有 Object.freeze | ❌ 不会 | 只限制变量重新赋值，不限制属性修改 |
| ❌ Object.freeze() 冻结对象 | ✅ 会 | 对象被冻结，属性无法修改 |
| ❌ 属性定义了 writable:false | ✅ 会 | 属性级别不可写 |
| ❌ REAL_WALLET ≠ window.REAL_WALLET | ❌ 不会（但不同步） | 修改的对象与 window.REAL_WALLET 不同 |

---

## 📊 修复建议

### 如果真实根因是 Object.freeze
```javascript
// ❌ 错误的做法
const w = { backedUp: false };
Object.freeze(w);  // 冻结
Object.defineProperty(window, 'REAL_WALLET', { value: w, ... });

// ✅ 正确的做法（重新赋值整个对象）
function markBackupDone() {
  const w = JSON.parse(localStorage.getItem('ww_wallet')||'{}');
  w.backedUp = true;
  localStorage.setItem('ww_wallet', JSON.stringify(w));
  
  if(REAL_WALLET) {
    // 创建新对象
    var updated = Object.assign({}, REAL_WALLET, { backedUp: true });
    // 重新赋值
    Object.defineProperty(window, 'REAL_WALLET', {
      value: updated,
      writable: false,
      configurable: false
    });
    REAL_WALLET = updated;
  }
}
```

### 如果真实根因是属性级别 writable:false
```javascript
// 同上，必须重新赋值
```

### 如果真实根因是引用不同步
```javascript
// 确保：REAL_WALLET = window.REAL_WALLET
// 每次赋值都要同步两个引用
```

---

## ✅ 确认清单

在重新审核前，需要验证：

- [ ] writable:false 是否真的限制了属性修改？（可能不是）
- [ ] 对象是否被 Object.freeze() 冻结？
- [ ] 对象属性是否被定义为不可写？
- [ ] REAL_WALLET 和 window.REAL_WALLET 是否始终同一个引用？
- [ ] markBackupDone 中 `REAL_WALLET.backedUp = true` 实际会如何表现？

**建议**: 在浏览器中运行上面的 5 个检验脚本，确认真实根因。

---

**不要盲目假设 writable:false 是根本原因，必须逐一验证。**
