# 🔍 P0-1 审核报告：Constant-Time Compare 实现

**审核人**: 小郭 (Tech Lead)  
**日期**: 2026-04-08  
**任务**: P0-1 PIN 盐值 + Constant-Time Compare  
**状态**: ⏳ 待 Cursor 实现

---

## 📋 审核清单

### ✅ 1. Constant-Time 实现是否正确？

**需要验证**:
- ✅ 长度必须一致才比较
- ✅ 没有提前 return
- ✅ 逐字节比较所有内容

**标准实现**:
```javascript
function constantTimeEqual(a, b) {
  // 长度不同 → 返回 false，但不提前 return
  var equal = a.length === b.length ? 1 : 0;
  
  // 逐字节比较，不论是否已知相等
  for (var i = 0; i < Math.max(a.length, b.length); i++) {
    var aCode = i < a.length ? a.charCodeAt(i) : 0;
    var bCode = i < b.length ? b.charCodeAt(i) : 0;
    equal &= aCode === bCode ? 1 : 0;
  }
  
  return equal === 1;
}

// verifyPin 中使用
async function verifyPin(pin) {
  var stored = Store.get('ww_pin_hash');
  if (!stored) {
    // ... 老版本兼容逻辑
  }
  var computed = await hashPin(pin);
  return constantTimeEqual(computed, stored);  // ✅ 用 constant-time 比较
}
```

**为什么重要**:
- 防止 timing attack：攻击者通过测量比较耗时推断 PIN
- 例如：正确 PIN "123456" 比 "000000" 耗时更长 → 泄露信息

---

### ✅ 2. Compare 范围是否完整？

| 对比位置 | 是否用 constant-time | 检查 |
|---------|-----------------|------|
| PIN hash 比对 | ✅ 必须 | verifyPin() |
| Legacy plaintext 比对 | ✅ 必须 | 老 PIN 兼容分支 |
| Legacy hex 比对 (if any) | ✅ 必须 | 兼容逻辑 |

**当前代码**:
```javascript
async function verifyPin(pin) {
  var stored = Store.get('ww_pin_hash');
  if (!stored) {
    var oldPin = Store.getPin();
    if (oldPin) {
      await savePinSecure(oldPin);
      return pin === oldPin;  // ❌ 这里也需要 constant-time！
    }
    return false;
  }
  var computed = await hashPin(pin);
  return computed === stored;  // ❌ 这里需要 constant-time
}
```

**修复方案**:
```javascript
async function verifyPin(pin) {
  var stored = Store.get('ww_pin_hash');
  if (!stored) {
    var oldPin = Store.getPin();
    if (oldPin) {
      await savePinSecure(oldPin);
      return constantTimeEqual(pin, oldPin);  // ✅ 用 constant-time
    }
    return false;
  }
  var computed = await hashPin(pin);
  return constantTimeEqual(computed, stored);  // ✅ 用 constant-time
}
```

---

### ✅ 3. 没有引入性能问题？

| 项目 | 当前值 | 评估 | 备注 |
|------|--------|------|------|
| PBKDF2 迭代次数 | 100000 | ✅ 合理 | OWASP 推荐 100k+ |
| Constant-time 应用范围 | 仅 compare | ✅ 正确 | 不要用于其他地方 |
| 性能影响 | ~1-2ms 额外 | ✅ 可接受 | PIN 验证本来就慢（PBKDF2） |

**检查要点**:
```javascript
// ✅ 正确：只在最终 compare 时用 constant-time
var computed = await hashPin(pin);  // PBKDF2: ~100ms
return constantTimeEqual(computed, stored);  // constant-time compare: <1ms

// ❌ 错误：不要在 PBKDF2 中用 constant-time（不必要）
// ❌ 错误：不要在字符串连接中用 constant-time
```

---

### ✅ 4. 没有破坏迁移逻辑？

**迁移场景**:

| 用户类型 | 当前存储 | 流程 | 验证 |
|---------|---------|------|------|
| 新用户 | (empty) | 创建钱包 → savePinSecure() | 存储 hash |
| 老用户 (plaintext) | ww_pin | 第一次解锁 → 迁移 | savePinSecure() → 清理旧数据 |
| 老用户 (v2) | ww_pin_hash + salt | 正常解锁 | 使用 constant-time |

**要验证**:
```javascript
// 场景 1: 新钱包
var w = await createWallet(12);
await savePinSecure('123456');
// ✅ 应该存储: ww_pin_hash (hash), ww_pin_salt (salt)
// ❌ 不应该存储: ww_pin (明文)

// 场景 2: 老钱包（仅有 plaintext）
localStorage.setItem('ww_pin', '123456');  // 模拟老数据
var ok = await verifyPin('123456');
// ✅ 应该返回 true
// ✅ 应该自动迁移: ww_pin_hash + ww_pin_salt 被创建
// ✅ 应该清理旧数据: ww_pin 被删除

// 场景 3: 老钱包（v2）
// 假设已有 ww_pin_hash + ww_pin_salt
var ok = await verifyPin('123456');
// ✅ 应该返回 true
// ✅ 不应该重复迁移
```

---

## 🎯 完整测试脚本

在浏览器 DevTools 中运行：

```javascript
console.log('=== P0-1 完整验证 ===\n');

// 1. 新用户流程
console.log('【测试 1】新用户创建钱包 + 设置 PIN');
(async function() {
  // 清空之前的数据
  localStorage.clear();
  
  // 创建钱包
  var w = { /* 完整钱包对象 */ };
  
  // 设置 PIN
  await savePinSecure('123456');
  
  // 验证存储
  var hash = localStorage.getItem('ww_pin_hash');
  var salt = localStorage.getItem('ww_pin_salt');
  console.log('  ✅ Hash 已存储:', hash ? '是' : '否');
  console.log('  ✅ Salt 已存储:', salt ? '是' : '否');
  console.log('  ✅ 旧数据已清理:', localStorage.getItem('ww_pin') === null ? '是' : '否');
  
  // 验证正确 PIN
  var ok1 = await verifyPin('123456');
  console.log('  ✅ 正确 PIN:', ok1 ? '通过' : '失败');
  
  // 验证错误 PIN
  var ok2 = await verifyPin('654321');
  console.log('  ❌ 错误 PIN:', !ok2 ? '被拒绝' : '不安全！');
  
  console.log('');
})();

// 2. 老用户迁移流程
console.log('【测试 2】老用户迁移 (plaintext → hash)');
(async function() {
  // 模拟老数据
  localStorage.clear();
  localStorage.setItem('ww_pin', '654321');
  
  // 第一次解锁 (旧 PIN)
  var ok = await verifyPin('654321');
  console.log('  ✅ 老 PIN 解锁:', ok ? '成功' : '失败');
  
  // 检查迁移结果
  var hash = localStorage.getItem('ww_pin_hash');
  var salt = localStorage.getItem('ww_pin_salt');
  var oldPin = localStorage.getItem('ww_pin');
  console.log('  ✅ 已迁移到 hash:', hash ? '是' : '否');
  console.log('  ✅ 已生成 salt:', salt ? '是' : '否');
  console.log('  ✅ 旧数据已清理:', oldPin === null ? '是' : '否');
  
  // 验证新 PIN 仍然可用
  var ok2 = await verifyPin('654321');
  console.log('  ✅ 迁移后 PIN 仍可用:', ok2 ? '是' : '否');
  
  console.log('');
})();

// 3. Constant-Time Compare 验证
console.log('【测试 3】Constant-Time Compare');
(async function() {
  localStorage.clear();
  await savePinSecure('testpin');
  
  // 这个测试不能直接看耗时（太快了），
  // 但代码审查可以验证是否用了 constantTimeEqual
  console.log('  ⚠️  Constant-Time 实现需要代码审查');
  console.log('  📝 检查 verifyPin() 是否使用了 constantTimeEqual() 函数');
  
  console.log('');
})();

console.log('=== 验证完成 ===');
```

---

## 🚨 常见错误（Cursor 要避免）

❌ **错误 1**: 在 `verifyPin` 中做多个 `return`
```javascript
// ❌ 错误
if (computed === stored) return true;  // 提前 return，泄露耗时信息
return false;
```

❌ **错误 2**: 老 PIN 兼容分支不用 constant-time
```javascript
// ❌ 错误
if (oldPin === pin) {  // 直接 === 比较，不安全
  await savePinSecure(pin);
  return true;
}
```

❌ **错误 3**: Constant-time 用错地方
```javascript
// ❌ 错误（不必要且浪费性能）
var computed = await constantTimeHashPin(pin);  // 不要这样

// ✅ 正确（只在最后比较时用）
var computed = await hashPin(pin);
return constantTimeEqual(computed, stored);
```

---

## ✅ 审核结论

### 当前状态
- 🟡 **代码未实现 constant-time compare**
- ✅ **PIN salt + PBKDF2 基础已有**
- ✅ **迁移逻辑框架完整**

### Cursor 需要做
1. 实现 `constantTimeEqual(a, b)` 函数
2. 修改 `verifyPin()` 同时使用 constant-time
3. 修改迁移分支也使用 constant-time
4. 运行完整测试脚本验证

### 预计风险
- 🟢 **低** — 这是单纯的比较逻辑增强，不影响其他流程

---

## 📊 验收标准

**合格** ✅ 需要满足：
- [ ] constantTimeEqual() 函数实现正确
- [ ] 所有 PIN 比对都用 constant-time
- [ ] 老用户迁移仍然正常
- [ ] 新用户流程不受影响
- [ ] 完整测试脚本通过

**不合格** ❌ 如果：
- [ ] 任何地方还有直接 `===` 比较 PIN hash
- [ ] 迁移逻辑被破坏
- [ ] 性能下降明显 (>100ms)

---

**下一步**: Cursor 实现后，我跑一遍测试脚本，确认 4 个关键点都通过。
