# 🔐 Security Rules Library（安全规则库）

**维护者**: Security Team  
**更新频率**: 每月扩展  
**覆盖范围**: WorldWallet 安全审计

---

## 📋 当前规则清单

### ✅ 已实现规则

#### SECURITY-001: Direct Comparison for Sensitive Data
- **风险**: Timing Attack（密码/哈希值被时序攻击）
- **扫描点**: hash / password / key 直接使用 ===
- **修复**: 使用 constantTimeEqual() 或 crypto.timingSafeEqual()
- **状态**: ✅ 已实现
- **检测率**: 中等

#### SECURITY-002: atob() Missing Error Handling
- **风险**: 无效 base64 导致应用崩溃
- **扫描点**: atob() 调用无 try-catch
- **修复**: 包装 try-catch，返回错误
- **状态**: ✅ 已实现 (发现 3 个问题)
- **检测率**: 高

#### SECURITY-003: Hardcoded Salt
- **风险**: 所有用户共享 salt，易被预计算攻击
- **扫描点**: 密钥派生中的硬编码 salt
- **修复**: 生成随机 salt，使用 PBKDF2/bcrypt/argon2
- **状态**: ✅ 已实现
- **检测率**: 高

---

## 📋 待实现规则（规划中）

### SECURITY-004: Missing IV Validation in Encryption
- **风险**: 初始化向量未验证，可被篡改
- **影响**: security.js 中的 AES-GCM 加密
- **优先级**: HIGH
- **预计工时**: 2 小时
- **状态**: ⏳ 未开始

**检测规则**:
```javascript
// 检查 crypto.subtle.encrypt 调用中 IV 的来源
// 如果 IV 来自未验证的数据，标记为风险
```

---

### SECURITY-005: Private Key in Memory Not Cleared
- **风险**: 私钥在内存中未被清零，可被内存转储窃取
- **影响**: wallet.core.js 中的私钥处理
- **优先级**: HIGH
- **预计工时**: 3 小时
- **状态**: ⏳ 未开始

**检测规则**:
```javascript
// 检查 privateKey / secret 变量使用后是否调用了清零
// 如果有读取后未清零，标记为风险
```

---

### SECURITY-006: Mnemonic Stored Without Encryption
- **风险**: 助记词以明文存储，可被读取
- **影响**: wallet.core.js 中的 mnemonic 存储
- **优先级**: HIGH
- **预计工时**: 2 小时
- **状态**: ⏳ 未开始

**检测规则**:
```javascript
// 检查 localStorage.setItem('mnemonic', ...) 是否加密
// 如果直接存储明文，标记为风险
```

---

### SECURITY-007: Unsafe Random Number Generation
- **风险**: 使用 Math.random() 而非密码学安全的 PRNG
- **影响**: 任何涉及随机数的安全相关代码
- **优先级**: MEDIUM
- **预计工时**: 1.5 小时
- **状态**: ⏳ 未开始

**检测规则**:
```javascript
// 在安全敏感上下文中检查 Math.random()
// 如果用于生成 nonce/salt/key，标记为风险
```

---

### SECURITY-008: Sensitive Data in Logs
- **风险**: 日志中包含密钥、助记词、私钥等敏感数据
- **影响**: console.log / logger 调用
- **优先级**: MEDIUM
- **预计工时**: 2 小时
- **状态**: ⏳ 未开始

**检测规则**:
```javascript
// 在 console/logger 调用中检查参数
// 如果包含 password/key/mnemonic/seed，标记为风险
```

---

### SECURITY-009: Missing Input Validation
- **风险**: 未验证外部输入（base64/hex/JSON）
- **影响**: 数据处理函数
- **优先级**: MEDIUM
- **预计工时**: 2 小时
- **状态**: ⏳ 未开始

**检测规则**:
```javascript
// 检查函数入口处是否验证输入格式
// 如果直接使用未验证数据，标记为风险
```

---

### SECURITY-010: Insufficient Error Handling
- **风险**: 关键操作未完全处理错误，可能导致状态不一致
- **影响**: 加密/解密/签名操作
- **优先级**: LOW
- **预计工时**: 1.5 小时
- **状态**: ⏳ 未开始

**检测规则**:
```javascript
// 检查关键操作是否有 try-catch 或错误检查
// 如果缺少错误处理，标记为风险
```

---

## 📊 规则库统计

| 指标 | 数据 |
|------|------|
| 已实现规则 | 3 条 |
| 待实现规则 | 7 条 |
| 总计规则 | 10 条 |
| 覆盖模块 | 主要 3 个（security.js/wallet.core.js/wallet.runtime.js） |
| 预计覆盖率 | 实现 10 条后: 85%+ |

---

## 🔄 规则添加流程

### Step 1: 问题识别
```
在审计中发现新问题
  ↓
分析问题的根本原因
  ↓
确定是否可以通过规则检测
```

### Step 2: 规则设计
```
定义规则的检测逻辑
  ↓
确定规则的有效范围（全局/模块/函数）
  ↓
评估误报风险
```

### Step 3: 规则实现
```
在 scout-security.js 中实现检测代码
  ↓
在 demo 项目中测试
  ↓
在真实项目中验证
```

### Step 4: 规则上线
```
将规则加入规则库（本文档）
  ↓
下次扫描时自动应用
  ↓
跟踪检测结果
```

---

## 🎯 规则优先级

### HIGH 优先级规则（安全紧迫）
- 涉及密钥/密码处理
- 可导致应用崩溃
- 可能被外部攻击利用

### MEDIUM 优先级规则（安全重要）
- 可能导致信息泄露
- 不安全的操作模式
- 缺少错误处理

### LOW 优先级规则（安全建议）
- 代码质量问题
- 安全最佳实践
- 防御深度建议

---

## 📈 规则有效性评估

### 每月评估项目

| 指标 | 评估方式 |
|------|---------|
| **检测率** | 已发现问题数 / 潜在问题总数 |
| **误报率** | 误报数 / 总报告数 |
| **修复率** | 检测出的问题有多少被修复 |
| **覆盖面** | 规则能覆盖多少模块/文件 |

### 低效规则处理
```
检测率过低（<50%）
  ↓
审查规则逻辑是否正确
  ↓
优化规则或删除
```

---

## 💡 规则创建建议

### 不适合自动化规则的问题
- ❌ 业务逻辑错误
- ❌ 架构设计问题
- ❌ 性能问题

### 适合自动化规则的问题
- ✅ 明确的安全模式（如 direct comparison）
- ✅ 缺少关键步骤（如 try-catch）
- ✅ 危险函数的不当使用（如 atob 无验证）
- ✅ 敏感信息的不当处理

---

## 🚀 下一步

### 本月目标
- [ ] 实现 SECURITY-004（IV 验证）
- [ ] 实现 SECURITY-005（私钥清零）
- [ ] 在项目中验证有效性

### 2 月目标
- [ ] 实现 SECURITY-006~008（3 条规则）
- [ ] 评估规则有效性
- [ ] 优化误报率

### 3 月目标
- [ ] 实现剩余规则（SECURITY-009~010）
- [ ] 覆盖率达到 85%+
- [ ] 建立规则库维护机制

---

*规则库是系统的核心资产。定期维护和扩展能力直接决定系统的价值。*
