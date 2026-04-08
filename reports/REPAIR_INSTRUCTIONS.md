# WorldWallet Auto Repair - 修复指令

## 概述
本文档包含 Auto Repair Loop Round 2 的所有修复指令，由系统自动生成。

**目标**: 修复 wwMnemonic 未初始化导致的验证流程失败

**预期结果**: 将测试通过率从 1/3 (33%) 提升至 3/3 (100%)

---

## 修复 #1: 初始化 wwMnemonic (PATCH-001)

### 文件
`dist/wallet.runtime.js`

### 位置
在 `createNewWallet()` 函数末尾，`goTo('page-create')` 或保存 localStorage 之后

### 查找（约第 6200 行）
```javascript
// 保存钱包到 localStorage
saveWallet(REAL_WALLET, '');

// 跳转到密钥展示页
goTo('page-create');
```

### 替换为
```javascript
// 保存钱包到 localStorage
saveWallet(REAL_WALLET, '');

// 【修复 PATCH-001】将助记词暴露到全局作用域供验证页面使用
try {
  window.wwMnemonic = enMnemonic;
  window.ADDR_WORDS = deriveAddrWordsFromChain(REAL_WALLET.ethAddress);
} catch (e) {
  console.warn('[wwMnemonic] Failed to expose mnemonic:', e);
}

// 跳转到密钥展示页
goTo('page-create');
```

### 验证
```javascript
// 在浏览器 Console 执行
window.wwMnemonic  // 应返回 12 个地名词用空格分隔
window.ADDR_WORDS  // 应返回派生的地址词
```

---

## 修复 #2: 修复 checkVerify() 读取逻辑 (PATCH-002)

### 文件
`dist/wallet.runtime.js`

### 位置
在 `function checkVerify()` 的最开始（约第 5513 行）

### 查找
```javascript
function checkVerify() {
  if (!verifyAnswers || Object.keys(verifyAnswers).length === 0) {
    if (typeof showToast === 'function') showToast('验证题目未加载，请返回密钥页后重试', 'error');
    return;
  }
  // ... 后续代码
```

### 替换为
```javascript
function checkVerify() {
  // 【修复 PATCH-002】确保 wwMnemonic 已加载
  if (!window.wwMnemonic || window.wwMnemonic.trim().length === 0) {
    // 尝试从 localStorage 恢复
    try {
      const savedWallet = localStorage.getItem('ww_wallet');
      if (savedWallet) {
        const w = JSON.parse(savedWallet);
        if (w.enMnemonic) {
          window.wwMnemonic = w.enMnemonic;
        }
      }
    } catch (e) {
      console.error('[checkVerify] Failed to load mnemonic from storage:', e);
    }
  }
  
  // 如果还是没有，从 REAL_WALLET 推导（备用方案）
  if (!window.wwMnemonic || window.wwMnemonic.trim().length === 0) {
    if (typeof REAL_WALLET === 'object' && REAL_WALLET && REAL_WALLET.mnemonic) {
      window.wwMnemonic = REAL_WALLET.mnemonic;
    }
  }
  
  if (!verifyAnswers || Object.keys(verifyAnswers).length === 0) {
    if (typeof showToast === 'function') showToast('验证题目未加载，请返回密钥页后重试', 'error');
    return;
  }
  // ... 后续代码保持不变
```

### 验证
```javascript
// 在验证页面执行
typeof checkVerify === 'function' && checkVerify()  // 应返回 true，检查通过
```

---

## 修复 #3: 自动清理敏感数据 (PATCH-003)

### 文件
`dist/wallet.runtime.js`

### 位置
在 `goTo('page-home')` 的调用处（约第 1896 行）

### 查找
```javascript
// 进入首页
if (allCorrect) {
  // ... 保存钱包逻辑
  goTo('page-home');
}
```

### 替换为
```javascript
// 进入首页
if (allCorrect) {
  // ... 保存钱包逻辑
  goTo('page-home');
  
  // 【修复 PATCH-003】自动清理敏感变量（防内存泄露）
  setTimeout(() => {
    window.wwMnemonic = null;
    window.ADDR_WORDS = null;
    window.enMnemonic = null;
  }, 5000);
}
```

### 验证
```javascript
// 在首页加载后 5 秒执行
window.wwMnemonic  // 应返回 null
```

---

## 修复 #4: PIN 流程数据统一 (PATCH-004) [可选，优先级 P2]

### 文件
`dist/wallet.runtime.js`

### 位置
文件顶部，全局变量定义区（约第 50 行）

### 添加
```javascript
// 【修复 PATCH-004】统一 PIN 状态管理对象
window._wwPinState = {
  setupValue: '',      // 第一次设置的 PIN
  confirmValue: '',    // 确认输入的 PIN
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
```

---

## 修复 #5: localStorage 结构统一 (PATCH-005) [可选，优先级 P3]

### 文件
`dist/wallet.ui.js`

### 位置
在 `function saveWallet()` 或 `function saveWalletSecure()` 中

### 修改
```javascript
// 初始化 ww_wallet 时添加 pinState 字段
const walletData = {
  ethAddress: REAL_WALLET.ethAddress,
  trxAddress: REAL_WALLET.trxAddress,
  btcAddress: REAL_WALLET.btcAddress,
  createdAt: Date.now(),
  backedUp: false,
  addrMap: {},
  
  // 【修复 PATCH-005】添加 PIN 状态追踪
  pinState: {
    hasPin: false,
    setupAt: null
  }
  
  // encrypted 字段在 PIN 设置时创建
};
```

---

## 应用修复的步骤

### 方式 1: 使用 Cursor （推荐）

1. 打开 `/Users/daxiang/Desktop/WorldWallet/dist/wallet.runtime.js`
2. 按照上述修复说明逐个应用 PATCH-001, 002, 003
3. 保存文件
4. 执行 `git add -A && git commit -m "fix: apply Auto Repair patches 001-003"`
5. 测试

### 方式 2: 使用命令行

```bash
# 进入项目目录
cd /Users/daxiang/Desktop/WorldWallet

# 备份原文件
cp dist/wallet.runtime.js dist/wallet.runtime.js.backup

# 应用修复（需要编辑器或脚本）
# ... 手动编辑 ...

# 提交修改
git add dist/wallet.runtime.js
git commit -m "fix: apply Auto Repair patches 001-003"

# 推送
git push origin main
```

---

## 修复验证步骤

### 验证 1：localStorage 安全性
```javascript
// 在创建钱包后检查
localStorage.getItem('ww_wallet')
// 应该不包含 "mnemonic", "privateKey", "trxPrivateKey" 明文字段
```

### 验证 2：mnemonic 初始化
```javascript
// 创建新钱包后立即检查
window.wwMnemonic && window.wwMnemonic.split(' ').length === 12
// 应返回 true
```

### 验证 3：验证流程
```javascript
// 进入验证页面后执行
typeof checkVerify === 'function' && checkVerify()
// 应返回 true，表示验证成功
```

### 验证 4：敏感数据清理
```javascript
// 进入首页后 5 秒执行
window.wwMnemonic === null
// 应返回 true，表示已自动清理
```

---

## 预期结果

应用所有修复后：

| 测试项 | 修复前 | 修复后 |
|--------|--------|--------|
| 测试 1: localStorage 安全性 | ✅ 通过 | ✅ 通过 |
| 测试 2: mnemonic 初始化 | ❌ 失败 | ✅ 通过 |
| 测试 3: PIN 流程 | ⚠️ 部分 | ✅ 通过 |
| **总体通过率** | **1/3 (33%)** | **3/3 (100%)** |

---

## 故障排除

### 问题 1: checkVerify() 仍然返回 false
**解决**: 确保 PATCH-002 已正确应用，检查 wwMnemonic 是否包含有效的词

### 问题 2: wwMnemonic 在 5 秒后仍然存在
**解决**: 检查 PATCH-003 中的 setTimeout 是否正确添加在 goTo('page-home') 后

### 问题 3: 修复后页面报错
**解决**: 检查修改的行号和上下文是否完全匹配，使用备份文件恢复

---

## 联系方式

如有问题，请查阅：
- 报告：`/reports/round_1.md`
- 详细分析：`/reports/round_2_analysis.md`
- 完整诊断：`/reports/DIAGNOSTIC.md` (生成中)

---

**生成时间**: 2026-04-07 18:25 GMT+7
**系统版本**: Auto Repair Loop v1.0
**循环轮数**: Round 2 (预计)
