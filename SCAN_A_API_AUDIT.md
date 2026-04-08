# 代码审查 A：全局 API 暴露扫描

**生成时间**: 2026-04-08  
**范围**: WorldWallet wallet-shell 项目  
**目标**: 列出所有应隐藏的全局函数、必须保留的白名单入口

---

## 📋 总体情况

- **总文件数**: 13 个 .js 文件（不含 html）
- **顶层 function 数量**: ~800+ 个（包括重复定义）
- **window.xxx 赋值**: ~50+ 处
- **顶层 var/let/const**: ~50+ 处

---

## 🔍 关键发现

### **1. 关键全局变量（高风险）**

| 变量名 | 文件 | 用途 | 是否必须保留 | 建议处理 |
|--------|------|------|-----------|---------|
| `REAL_WALLET` | wallet.core.js | 当前钱包对象（公钥） | ❌ 改为私有 | IIFE 闭包 |
| `_pin` | wallet.runtime.js | 当前会话 PIN | ❌ 必须隐藏 | IIFE 闭包 |
| `_wwSessionPin` | wallet.runtime.js | 会话 PIN 缓存 | ❌ 必须隐藏 | IIFE 闭包 |
| `_sessionPrivateKeys` | core/security.js | 解锁后的私钥 | ❌ 必须隐藏 | IIFE 闭包 |

### **2. 危险全局函数（HIGH RISK）**

#### **🔴 需要立即隐藏**

| 函数名 | 文件 | 用途 | 当前状态 | 建议处理 |
|--------|------|------|---------|---------|
| `sendETH` | wallet.tx.js | 转账 ETH | ✅ 已在 IIFE | 保留 ✓ |
| `sendTRX` | wallet.tx.js | 转账 TRX | ✅ 已在 IIFE | 保留 ✓ |
| `sendUSDT_TRC20` | wallet.tx.js | 转账 USDT | ✅ 已在 IIFE | 保留 ✓ |
| `clearSessionKeys` | core/security.js | 清除会话 | ❌ 全局暴露 | **IIFE 包装** |
| `setSessionKeys` | core/security.js | 设置会话 | ❌ 全局暴露 | **IIFE 包装** |
| `getSessionKeys` | core/security.js | 获取会话 | ❌ 全局暴露 | **IIFE 包装** |
| `verifyPin` | core/security.js | PIN 验证 | ❌ 全局暴露 | 考虑权限令牌 |
| `hashPin` | core/security.js | PIN 哈希 | ❌ 全局暴露 | IIFE 包装 |

#### **🟡 需要评估的函数**

| 函数名 | 文件 | 用途 | UI 是否需要 | 建议 |
|--------|------|------|-----------|------|
| `goTo` | wallet.runtime.js | 页面导航 | ✅ YES | 保留白名单 |
| `goTab` | wallet.runtime.js | Tab 导航 | ✅ YES | 保留白名单 |
| `showToast` | wallet.runtime.js | 消息提示 | ✅ YES | 保留白名单 |
| `createRealWallet` | wallet.core.js | 创建钱包 | ✅ YES | 保留白名单 |
| `restoreWallet` | wallet.core.js | 导入钱包 | ✅ YES | 保留白名单 |
| `loadBalances` | wallet.tx.js | 刷新余额 | ✅ YES | 保留白名单 |
| `loadTxHistory` | wallet.tx.js | 刷新交易 | ✅ YES | 保留白名单 |
| `loadTronWeb` | wallet.core.js | 加载 TronWeb | ❌ 动态加载 | IIFE + 权限 |
| `loadQRCodeLib` | wallet.core.js | 加载 QR | ❌ 动态加载 | IIFE + 权限 |

---

## 📊 文件级别分析

### **core/security.js** 🔴 HIGH RISK

```javascript
// 当前完全暴露，无 IIFE 保护
async function deriveKeyFromPin(pin, salt)        // 敏感
async function encryptWithPin(plaintext, pin)     // 敏感
async function decryptWithPin(bundle, pin)        // 敏感
async function saveWalletSecure(wallet, pin)      // 敏感
function setSessionKeys(keys)                     // 🔴 危险
function getSessionKeys()                         // 🔴 危险
function clearSessionKeys()                       // 🔴 危险
function isSessionUnlocked()                      // 🟡 信息泄露
var _sessionPrivateKeys = null                    // 🔴 敏感

**建议**: IIFE 包装整个文件，仅白名单导出:
- 不导出: setSessionKeys, getSessionKeys, clearSessionKeys
- 改为内部管理，通过权限检查访问
```

### **wallet.core.js** 🟡 MEDIUM RISK

```javascript
var REAL_WALLET = null                           // 🔴 暴露对象
window.REAL_WALLET = {...}                       // 多处赋值

**建议**: 
1. IIFE 包装，REAL_WALLET 变为私有
2. 提供 getter: getRealWalletPublicOnly()
3. 返回仅公钥部分 {ethAddress, trxAddress, ...}
```

### **wallet.tx.js** ✅ ALREADY FIXED

```javascript
// 已用 IIFE 包装，sendETH/sendTRX/sendUSDT_TRC20 不暴露
window.loadBalances = loadBalances;
window.loadTxHistory = loadTxHistory;
window.confirmTransfer = confirmTransfer;
// 正确做法
```

### **wallet.runtime.js** 🟡 MEDIUM RISK

```javascript
var _pin = null                                   // 🔴 全局 PIN
var currentMnemonicLength = 12                    // 🟡 UI 状态（可接受）

// 太多全局函数（~800+），但大部分是 UI 相关
// 优先级：
// HIGH: _pin 变量要隐藏
// MEDIUM: 检查是否所有 UI 函数都必须全局
```

### **js/api-config.js** 🟡 MEDIUM RISK

```javascript
var WW_ETH_RPC_URLS = [...]                      // 配置（可接受）
function wwGetEthProvider()                      // 内部使用
function wwTronWebOptions()                      // 内部使用

**建议**: 封装 RPC 相关函数，避免暴露 provider 对象
```

---

## ✅ 白名单（必须保留的 UI 入口）

根据 `data-ww-fn` 属性和页面绑定，以下函数**必须保留全局**：

```javascript
// 页面导航
goTo(pageId, opts)                  // 必需
goTab(tabId)                        // 必需

// UI 消息
showToast(msg, type, duration)      // 必需

// 钱包操作
createRealWallet(forcedWordCount)   // 必需
restoreWallet(mnemonic)             // 必需
importWalletFlexible(raw)           // 必需

// 数据刷新
loadBalances()                      // 必需
loadTxHistory()                     // 必需
getPrices()                         // 必需
loadTronWeb()                       // 可 IIFE + 权限

// 转账流程（已 IIFE）
confirmTransfer()                   // 白名单出口
broadcastRealTransfer()             // 白名单出口

// 其他 UI 函数
selectTransferCoin(id)              // data-ww-fn 调用（~50+ 个）
doTransfer()                        // data-ww-fn 调用
// ... (列表太长，见完整清单)
```

**数量**: ~150+ 个 UI 函数必须保留全局（都通过 data-ww-fn 绑定）

---

## 📝 改动清单（按优先级）

### **Priority 1：立即处理**

```markdown
1. core/security.js
   - 用 IIFE 包装整个文件
   - 隐藏: setSessionKeys, getSessionKeys, clearSessionKeys, _sessionPrivateKeys
   - 仅保留必需 API（如 verifyPin、savePinSecure）

2. wallet.core.js
   - IIFE 包装 REAL_WALLET
   - 改为私有变量
   - 提供受限 getter

3. wallet.runtime.js
   - 隐藏 _pin 变量到 IIFE
   - 隐藏 _wwSessionPin
```

### **Priority 2：后续处理**

```markdown
4. wallet.dom-bind.js
   - 检查 window.goTo 等导航函数调用
   - 确保白名单函数都可访问

5. core/wallet.js
   - 检查是否需要 IIFE
   - 内部函数标记为私有
```

### **Priority 3：长期优化**

```markdown
6. wallet.ui.js 和 wallet.runtime.js
   - 太多 UI 函数，逐步收缩
   - 考虑是否可以分类（私有 + 白名单）
```

---

## 🎯 本阶段建议

**目标**: 快速降低攻击面，不做大重构

**步骤**:
1. ✅ wallet.tx.js 已完成（IIFE）
2. ⏳ 立即做 core/security.js IIFE
3. ⏳ 立即做 wallet.core.js IIFE（隐藏 REAL_WALLET）
4. 📋 其他文件记录但不立即改

**预计时间**: ~2-3 小时

---

## 附录：完整函数清单

### 所有 window.xxx 赋值（50+ 处）

```
wallet.core.js:103 => window.REAL_WALLET = {...}
wallet.core.js:111 => REAL_WALLET = window.REAL_WALLET
wallet.core.js:240 => window.REAL_WALLET = w
wallet.core.js:278 => window.REAL_WALLET = pub
wallet.tx.js:217+ => window._lastTotalUsd = total
wallet.tx.js:272+ => window._cnyRate = ...
wallet.runtime.js 多处 => window._homeBalanceAnimRaf, window._wwTxHistoryCache, etc.
```

---

**生成完毕。下一步请启动 B (依赖本地化扫描)**
