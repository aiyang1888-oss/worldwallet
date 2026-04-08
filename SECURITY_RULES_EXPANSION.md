# 🔐 安全规则库扩展计划

**时间**: 2026-04-08 09:16+  
**目标**: 从 3 条规则扩展到 10 条  
**覆盖率目标**: 85%+  

---

## 📋 已实现规则 (3 条)

| ID | 名称 | 状态 | 覆盖 |
|----|------|------|------|
| SECURITY-001 | Timing-safe comparison | ✅ | security.js |
| SECURITY-002 | atob() error handling | ✅ | security.js, wallet.core.js |
| SECURITY-003 | Hardcoded salt | ✅ | security.js |

---

## 📋 待扩展规则 (7 条)

### SECURITY-004: IV Validation in AES-GCM
**优先级**: HIGH  
**文件**: wallet-shell/core/security.js, wallet.core.js  
**扫描规则**:
```javascript
// 检查: crypto.subtle.encrypt(...{ name: 'AES-GCM', iv: ... })
// 风险: IV 来自未验证的数据
// 修复: 验证 IV 来自安全源（random || hash）
```
**实现工时**: 1.5h

---

### SECURITY-005: Private Key Memory Clearing
**优先级**: HIGH  
**文件**: wallet-shell/wallet.core.js, wallet.runtime.js  
**扫描规则**:
```javascript
// 检查: privateKey 变量使用后是否清零
// 风险: 内存转储可恢复
// 修复: 覆盖或使用 Web Crypto secret key
```
**实现工时**: 2h

---

### SECURITY-006: Mnemonic Storage Encryption
**优先级**: HIGH  
**文件**: wallet-shell/wallet.core.js, wallet.runtime.js  
**扫描规则**:
```javascript
// 检查: mnemonic 是否明文存储在 localStorage/IndexedDB
// 风险: XSS 可读取
// 修复: 加密存储或仅在内存中
```
**实现工时**: 1.5h

---

### SECURITY-007: Safe PRNG Usage
**优先级**: MEDIUM  
**文件**: 所有涉及随机数的文件  
**扫描规则**:
```javascript
// 检查: Math.random() 在安全敏感上下文中的使用
// 风险: 可预测
// 修复: crypto.getRandomValues()
```
**实现工时**: 1h

---

### SECURITY-008: Sensitive Data in Logs
**优先级**: MEDIUM  
**文件**: 所有文件  
**扫描规则**:
```javascript
// 检查: console.log/warn/error 中的密钥、助记词、私钥
// 风险: 日志泄露敏感信息
// 修复: 移除或哈希处理
```
**实现工时**: 1.5h

---

### SECURITY-009: Input Validation Completeness
**优先级**: MEDIUM  
**文件**: wallet-shell/wallet.tx.js  
**扫描规则**:
```javascript
// 检查: 函数入口是否验证所有输入（地址、金额、数据）
// 风险: 无效数据导致崩溃或异常
// 修复: 完整的输入验证
```
**实现工时**: 1h

---

### SECURITY-010: Dependency Integrity
**优先级**: LOW  
**文件**: index.html, wallet.core.js  
**扫描规则**:
```javascript
// 检查: 外部库加载是否有完整性校验 (SRI hash)
// 风险: CDN 劫持
// 修复: 添加 integrity 属性
```
**实现工时**: 0.5h

---

## 🔄 规则实现计划

### 第 1 阶段 (4-5 小时) - 核心安全
```
SECURITY-004 (IV validation) → 1.5h
SECURITY-005 (Key clearing) → 2h
SECURITY-006 (Mnemonic encryption) → 1.5h
```

**目标**: 覆盖关键密钥和数据保护

---

### 第 2 阶段 (3-4 小时) - 补充安全
```
SECURITY-007 (Safe PRNG) → 1h
SECURITY-008 (Data in logs) → 1.5h
SECURITY-009 (Input validation) → 1h
```

**目标**: 完整的安全审计覆盖

---

### 第 3 阶段 (0.5-1 小时) - 基础设施
```
SECURITY-010 (Dependency integrity) → 0.5h
```

**目标**: 供应链安全

---

## 📊 覆盖率目标

| 模块 | 当前规则 | 目标规则 | 覆盖率 |
|------|---------|---------|--------|
| security.js | 3 | 4-5 | 80% |
| wallet.core.js | 2 | 4-5 | 75% |
| wallet.tx.js | 0 | 1-2 | 60% |
| wallet.runtime.js | 0 | 2-3 | 50% |
| 其他 | 0 | 1-2 | 30% |
| **总体** | **3** | **10** | **85%** |

---

## 🧪 规则验证流程

### 每个规则的验证
1. 在 demo-wallet 中植入相应问题
2. 验证规则能否正确检测
3. 在 WorldWallet 真实代码中运行
4. 确认规则的误报率 < 5%

### 规则性能测试
```javascript
// 确保新规则不显著增加扫描时间
console.time('Security rules');
const issues = scout.scan();
console.timeEnd('Security rules');
// 目标: 总耗时 < 1秒
```

---

## 📈 长期规则库建设

### 月度规则添加目标
- **Month 1 (4月)**: +3 条新规则
- **Month 2 (5月)**: +2 条新规则
- **Month 3 (6月)**: +1-2 条新规则

### 规则优先级评估
基于:
- 风险等级 (HIGH > MEDIUM > LOW)
- 易检测性 (高 > 中 > 低)
- 实现复杂度 (低 > 中 > 高)

---

## 🎯 成功标准

- [ ] 10 条规则全部实现
- [ ] 误报率 < 5%
- [ ] 覆盖 WorldWallet 核心模块 85%+
- [ ] 规则库可维护（文档完整）
- [ ] 自动化验证通过

---

**规则扩展计划完成**。准备执行。
