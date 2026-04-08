# Round 2: 深入代码分析和修复方案

## 1. createNewWallet() 完整流程分析

### 问题根源追踪

### 现状：
- createNewWallet() 生成 mnemonic
- 保存到 localStorage 的 ww_wallet 对象
- 但没有设置全局的 window.wwMnemonic 变量

### checkVerify() 期望：
- 需要读取 wwMnemonic 用于验证

### 数据流缺口：
```
localStorage (ww_wallet.enMnemonic) 
   ↓
createNewWallet() 完成
   ❌ 没有同步到 window.wwMnemonic
   ↓
checkVerify() 开始
   ❌ 读不到 wwMnemonic
   ↓ 验证失败
```

## 2. 精确定位修复点

### 修复点 1: createNewWallet() 末尾（约第 6200 行）
需要添加：
```javascript
// 将助记词暴露到全局作用域供验证页面使用
window.wwMnemonic = enMnemonic;
window.enMnemonic = enMnemonic;

// 同时计算和保存派生地址字符
try {
  window.ADDR_WORDS = deriveAddrWordsFromChain(REAL_WALLET.ethAddress);
} catch (e) {
  console.warn('Failed to derive address words:', e);
}
```

### 修复点 2: checkVerify() 开始（约第 5513 行）
需要添加：
```javascript
// 在验证前，先确保 wwMnemonic 已加载
if (!window.wwMnemonic || window.wwMnemonic.trim().length === 0) {
  // 尝试从 localStorage 恢复
  const savedWallet = localStorage.getItem('ww_wallet');
  if (savedWallet) {
    try {
      const w = JSON.parse(savedWallet);
      if (w.enMnemonic) {
        window.wwMnemonic = w.enMnemonic;
      }
    } catch (e) {
      console.error('Failed to load mnemonic from storage:', e);
    }
  }
}

// 如果还是没有，从 REAL_WALLET 推导（备用方案）
if (!window.wwMnemonic || window.wwMnemonic.trim().length === 0) {
  if (typeof REAL_WALLET === 'object' && REAL_WALLET && REAL_WALLET.mnemonic) {
    window.wwMnemonic = REAL_WALLET.mnemonic;
  }
}
```

### 修复点 3: verifyAnswers 生成逻辑（约第 6100 行）
需要确保在助记词验证页面加载时：
```javascript
// 页面加载时立即生成随机验证位置
function initVerifyAnswers() {
  if (!window.wwMnemonic || window.wwMnemonic.trim().length === 0) {
    console.error('Mnemonic not available for verification');
    return false;
  }
  
  const words = window.wwMnemonic.split(' ');
  const positions = [];
  while (positions.length < 3) {
    const pos = Math.floor(Math.random() * words.length);
    if (!positions.includes(pos)) positions.push(pos);
  }
  
  window.verifyAnswers = {};
  positions.forEach(pos => {
    window.verifyAnswers[pos] = words[pos];
  });
  
  return true;
}
```

## 3. 时序图 - 正确的数据流

```
创建钱包流程：
1. createNewWallet() 
   ├─ 生成 mnemonic
   ├─ 创建 REAL_WALLET (eth, trx, btc)
   ├─ 保存到 localStorage ww_wallet
   └─ 【修复】设置 window.wwMnemonic = mnemonic  ← 关键

2. goTo('page-create')
   └─ 显示 12 个地名助记词

3. 用户点击"我已抄写，开始验证"
   └─ goTo('page-key-verify')

4. 【修复】initVerifyAnswers()
   ├─ 读取 window.wwMnemonic
   ├─ 随机选择 3 个词位置
   └─ 生成 verifyAnswers 对象

5. 用户输入 3 个随机词
   └─ checkVerify()

6. 【修复】checkVerify() 开始
   ├─ 确认 window.wwMnemonic 存在
   ├─ 对比用户输入与 verifyAnswers
   └─ 如果成功，goTo('page-pin-setup')

7. PIN 设置流程 (page-pin-setup → page-pin-confirm)
   └─ 完成

8. PIN 验证成功
   └─ goTo('page-home')

9. 【修复】自动清理
   └─ 5秒后清空 window.wwMnemonic = ''
```

## 4. 敏感数据生命周期

### 当前问题
wwMnemonic 在内存中可能存在很长时间，增加泄露风险

### 修复方案：分段清理
```javascript
// 第一阶段：验证成功后
if (allCorrect) {
  // ... 保存钱包
  // 第一次清理：1分钟后
  setTimeout(() => {
    window.wwMnemonic = null;
    window.ADDR_WORDS = null;
  }, 60000);
}

// 第二阶段：进入首页后
// 在 goTo('page-home') 中
const homeCleanup = setTimeout(() => {
  window.wwMnemonic = null;
  window.enMnemonic = null;
  window.ADDR_WORDS = null;
}, 5000);

// 第三阶段：用户离开页面
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    window.wwMnemonic = null;
    window.ADDR_WORDS = null;
  }
});
```

## 5. PIN 流程数据一致性检查

### 当前 PIN 流程存在的问题

#### 问题 5.1：PIN 验证变量混乱
- pinInput (page-pin-setup)
- pinConfirmInput (page-pin-confirm)  
- pinVerifyInput (page-pin-verify)
- 多个 PIN 相关的 localStorage 字段

#### 修复方案：统一 PIN 状态管理
```javascript
// 创建单一的 PIN 状态对象
window._wwPinState = {
  setupValue: '',      // 第一次输入
  confirmValue: '',    // 确认输入
  hash: null,          // scrypt 哈希值
  setupComplete: false,
  verified: false,
  
  clear() {
    this.setupValue = '';
    this.confirmValue = '';
    this.hash = null;
    this.setupComplete = false;
    this.verified = false;
  },
  
  isMatch() {
    return this.setupValue === this.confirmValue && this.setupValue.length === 6;
  }
};

// 替换分散的全局变量
// 从：window._wwPinSetupDraft
// 改为：_wwPinState.setupValue
```

## 6. localStorage 加密状态追踪

### 当前问题：
encrypted 字段只在 PIN 设置后才创建，初始钱包没有 encrypted

### 修复方案：
1. 钱包创建时就初始化 encrypted 结构（即使 PIN 为空）
2. 或在首次 PIN 设置时创建 encrypted
3. 标记 PIN 设置状态

```javascript
// 初始 ww_wallet 结构
{
  ethAddress: "0x...",
  trxAddress: "T...",
  btcAddress: "1...",
  createdAt: 1234567890,
  backedUp: false,
  addrMap: {...},
  pinState: {
    hasPin: false,
    setupAt: null
  },
  encrypted: null  // PIN 设置后才填充
}
```

## 7. 修复优先级和依赖关系

```
修复优先级图：

PATCH-001 (wwMnemonic 初始化)  ← 最高优先级
    ↓
PATCH-002 (checkVerify 读取)    ← 依赖 001
    ↓
PATCH-003 (敏感数据清理)        ← 依赖 002
    ↓
PATCH-004 (PIN 流程统一)        ← 独立，中优先级
    ↓
PATCH-005 (storage 状态追踪)   ← 独立，低优先级
```

## 8. Round 2 修复清单

### 需要修改的文件
- ✏️ wallet.runtime.js (主要修复)
- ✏️ wallet.ui.js (PIN 流程相关)

### 具体修改位置
| 优先级 | 文件 | 位置 | 行数 | 修改类型 |
|--------|------|------|------|---------|
| P1 | wallet.runtime.js | createNewWallet() 末尾 | ~6200 | 添加 4 行 |
| P1 | wallet.runtime.js | checkVerify() 开始 | ~5513 | 添加 20 行 |
| P1 | wallet.runtime.js | verifyAnswers 初始化 | ~6100 | 添加 15 行 |
| P2 | wallet.runtime.js | goTo('page-home') | ~1896 | 添加 8 行 (清理) |
| P2 | wallet.ui.js | PIN 相关函数 | ~6300 | 重构 30 行 |

### 预期效果
- ✅ 测试 1：通过 (localStorage 安全)
- ✅ 测试 2：通过 (mnemonic 初始化修复)
- ✅ 测试 3：通过 (PIN 流程数据一致性)
- **总体通过率: 3/3 (100%)**