# Bug 优先级分类 & 任务拆解

## 📊 Bug 统计
- **总数**: 31 个
- **High**: 10 个
- **Medium**: 18 个
- **Low**: 3 个

---

## 🔴 P0 任务（安全 + 钱包主流程）

### Task P0-1: core/security.js PIN 盐值问题 (HIGH)
**问题**: 硬编码盐值 'ww_salt_v1_2026'，所有用户共享，易被彩虹表攻击
**文件**: core/security.js, Line 133
**影响**: 用户 PIN 安全性直接受损
**优先级**: CRITICAL

### Task P0-2: core/security.js atob 错误处理 (HIGH)
**问题**: decryptWithPin 中 atob() 无 try-catch，坏数据会崩溃
**文件**: core/security.js, Line 51
**影响**: 用户钱包解锁失败，无法恢复
**优先级**: CRITICAL

### Task P0-3: core/security.js decrypt 错误处理 (HIGH)
**问题**: crypto.subtle.decrypt() 无 try-catch，错误的 PIN 会崩溃
**文件**: core/security.js, Line 57
**影响**: PIN 验证失败导致应用崩溃
**优先级**: CRITICAL

### Task P0-4: wallet.tx.js 转账私钥检查 (HIGH)
**问题**: REAL_WALLET.trxPrivateKey 无空值检查，未解锁时转账会崩溃
**文件**: wallet.tx.js, Line 135
**影响**: 转账流程崩溃
**优先级**: CRITICAL

### Task P0-5: wallet.tx.js ETH 私钥验证 (HIGH)
**问题**: ethers.Wallet(REAL_WALLET.privateKey) 无验证，坏私钥崩溃
**文件**: wallet.tx.js, Line 147
**影响**: ETH 转账失败
**优先级**: CRITICAL

### Task P0-6: wallet.tx.js 地址验证 (HIGH)
**问题**: getBalance() 不验证地址格式，API 调用可能静默失败
**文件**: wallet.tx.js, Line 202
**影响**: 余额查询不可靠
**优先级**: CRITICAL

### Task P0-7: wallet.core.js REAL_WALLET 全局暴露 (HIGH)
**问题**: window.REAL_WALLET 可被外部脚本覆盖，安全风险
**文件**: wallet.core.js, Line 103/240
**影响**: 直接被攻击
**优先级**: CRITICAL

### Task P0-8: wallet.runtime.js 会话 PIN 暴露 (HIGH)
**问题**: wwGetSessionPin/wwSetSessionPin 全局可调用
**文件**: wallet.runtime.js, Line 490
**影响**: 内存中的 PIN 可被窃取
**优先级**: CRITICAL

### Task P0-9: js/storage.js Store 未检查 (HIGH)
**问题**: 代码假设 Store 全局存在，不检查
**文件**: js/storage.js, Line 1
**影响**: 初始化失败应用无法运行
**优先级**: CRITICAL

### Task P0-10: core/security.js String.fromCharCode (HIGH)
**问题**: apply() 大数组会爆栈 (>65536 bytes)
**文件**: core/security.js, Line 37
**影响**: 大文件加密失败
**优先级**: HIGH

---

## 🟡 P1 任务（稳定性 + 依赖）

### Task P1-1: core/security.js btoa 编码 (MEDIUM)
### Task P1-2: core/security.js 自动清除超时 (MEDIUM)
### Task P1-3: core/security.js PIN 旧格式兼容 (MEDIUM)
### Task P1-4: wallet.tx.js USDT 地址硬编码 (MEDIUM)
### Task P1-5: wallet.tx.js BTC 查询超时 (MEDIUM)
### Task P1-6: wallet.tx.js priceCache 未声明 (MEDIUM)
### Task P1-7: wallet.tx.js transferCoin 空值检查 (MEDIUM)
### Task P1-8: wallet.tx.js COINS 全局检查 (MEDIUM)
### Task P1-9: wallet.runtime.js RPC 单点故障 (MEDIUM)
### Task P1-10: wallet.addr.js 地址验证 (MEDIUM)
### Task P1-11: js/api-config.js API Key 验证 (MEDIUM)
### Task P1-12: core/wallet.js wordCount 验证 (MEDIUM)
### Task P1-13: wallet.runtime.js mnemonic 验证 (MEDIUM)
### Task P1-14: index.html CSP unsafe-inline (MEDIUM)
### Task P1-15: wallet.runtime.js 谷歌二维码 (MEDIUM)
### Task P1-16: wallet.runtime.js news 代理问题 (MEDIUM)

---

## 🟢 P2 任务（性能 + 规范）

### Task P2-1: wallet.tx.js DOM 模式重复 (LOW)
### Task P2-2: wallet.tx.js callWithRetry 参数检查 (MEDIUM)
### Task P2-3: wallet.runtime.js RPC 配置硬编码 (LOW)
### Task P2-4: TransactionHistory keyExtractor (LOW)
### Task P2-5: CurrencySelector useEffect 优化 (MEDIUM)

---

## 📋 执行计划

**Phase 1** (今天): P0-1 ~ P0-10 (安全 + 钱包主流程)
**Phase 2** (明天): P1-1 ~ P1-16 (稳定性)
**Phase 3** (后天): P2-1 ~ P2-5 (性能 + 规范)

每个 P0 任务单独发给 Cursor，逐个修复 + 验收。
