# Phase 1 安全加固实施计划

> 开始时间：2026-04-06 22:30
> 预计完成：2026-04-07 00:00（1.5小时）
> 负责人：小郭（AI 开发总监）

---

## 目标

消除所有 P0 级别安全风险，确保用户资金安全。

---

## 任务清单

### Task 1: PIN 存储安全化（20分钟）

**问题：**
- PIN 明文存 localStorage (`ww_pin`)
- 存取 key 不一致 (`ww_unlock_pin` vs `ww_pin`)

**方案：**
```javascript
// 新增函数到 core/security.js
async function hashPin(pin) {
  var enc = new TextEncoder();
  var data = enc.encode(pin + 'ww_salt_v1'); // 加盐
  var hashBuffer = await crypto.subtle.digest('SHA-256', data);
  var hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
}

async function verifyPin(pin) {
  var stored = Store.get('ww_pin_hash');
  if (!stored) return false;
  var computed = await hashPin(pin);
  return computed === stored;
}

async function savePinSecure(pin) {
  var hash = await hashPin(pin);
  Store.set('ww_pin_hash', hash);
  Store.remove('ww_pin'); // 清理旧的明文 PIN
  Store.remove('ww_unlock_pin');
}
```

**影响范围：**
- `core/security.js` — 新增 3 个函数
- 所有调用 `Store.getPin()` 的地方改用 `verifyPin(pin)`
- 所有调用 `Store.setPin()` 的地方改用 `savePinSecure(pin)`

---

### Task 2: 助记词加密存储审查（30分钟）

**目标：**
确保所有钱包保存路径都使用 `saveWalletSecure(wallet, pin)`

**检查点：**
1. 创建钱包流程 — 确认后调用 `saveWalletSecure()`
2. 导入钱包流程 — 导入后调用 `saveWalletSecure()`
3. 无任何地方直接写 `localStorage.setItem('ww_wallet', ...)`

**需要修改的文件：**
- index.html / wallet.runtime.js 中所有 `saveWallet()` 调用
- 确保传入 PIN 参数

---

### Task 3: 私钥不暴露到全局（40分钟）

**问题：**
`window.REAL_WALLET` 可能包含 `privateKey`

**方案：**
```javascript
// 修改 js/globals.js
var REAL_WALLET = null;  // 只存公开信息（地址、类型）
// 删除任何直接把私钥赋值到 REAL_WALLET 的代码

// 新增到 core/security.js
var _sessionPrivateKeys = null;  // 会话私钥缓存（闭包保护）

function setSessionKeys(keys) {
  _sessionPrivateKeys = keys;
  // 5分钟后自动清除
  setTimeout(function() {
    _sessionPrivateKeys = null;
  }, 300000);
}

function getSessionKeys() {
  return _sessionPrivateKeys;
}

function clearSessionKeys() {
  _sessionPrivateKeys = null;
}
```

**使用方式：**
```javascript
// 解锁后（用户输入 PIN）
var sensitive = await decryptWalletSensitive(pin);
if (sensitive) {
  setSessionKeys({
    mnemonic: sensitive.mnemonic,
    ethKey: sensitive.ethKey,
    trxKey: sensitive.trxKey,
    btcKey: sensitive.btcKey
  });
}

// 需要签名时
var keys = getSessionKeys();
if (!keys) {
  showToast('请先解锁钱包');
  return;
}
await sendTx('eth', toAddr, amount, keys.ethKey);

// 锁定钱包
clearSessionKeys();
```

**影响范围：**
- 所有直接访问 `REAL_WALLET.privateKey` 的地方
- 需要先调用 `getSessionKeys()` 检查解锁状态

---

### Task 4: CSP + SRI（15分钟）

**1. 添加 CSP meta 标签到 index.html `<head>`：**
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline';
  connect-src 'self' https://api.trongrid.io https://rpc.ankr.com https://min-api.cryptocompare.com;
  img-src 'self' data: https:;
  font-src 'self' data:;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
">
```

**2. 添加 SRI 到 ethers.js CDN：**
```html
<!-- 旧的 -->
<script src="https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js"></script>

<!-- 新的 -->
<script 
  src="https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js"
  integrity="sha384-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  crossorigin="anonymous"
></script>
```

**如何生成 SRI hash：**
```bash
curl -s https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js | \
  openssl dgst -sha384 -binary | openssl base64 -A
```

---

### Task 5: 兼容性处理（15分钟）

**数据迁移逻辑：**
```javascript
// 在 loadWallet() 中添加迁移代码
function migrateOldWallet() {
  // 1. 旧 PIN 迁移
  var oldPin = Store.get('ww_pin');
  var oldUnlockPin = Store.get('ww_unlock_pin');
  if (oldPin && !Store.has('ww_pin_hash')) {
    // 首次使用新版本，迁移 PIN
    savePinSecure(oldPin).then(function() {
      console.log('[迁移] PIN 已转为 hash 存储');
    });
  }

  // 2. 旧钱包数据迁移
  var oldWallet = Store.getWallet();
  if (oldWallet && oldWallet.mnemonic && !oldWallet.encrypted) {
    // 钱包数据是明文，需要加密
    console.warn('[迁移] 检测到明文钱包，需用户设置 PIN');
    // 触发强制设置 PIN 流程
    goTo('page-setup-pin');
  }
}

// 页面加载时调用
window.addEventListener('DOMContentLoaded', function() {
  migrateOldWallet();
  // ... 其他初始化
});
```

---

## 测试检查清单

完成后必须手动测试：

### 创建钱包流程
- [ ] 创建新钱包
- [ ] 设置 PIN
- [ ] 刷新页面
- [ ] 输入 PIN 解锁
- [ ] 检查控制台：`REAL_WALLET` 无 privateKey
- [ ] 检查 localStorage：助记词已加密
- [ ] 检查 localStorage：PIN 是 hash 不是明文

### 导入钱包流程
- [ ] 导入已有助记词
- [ ] 设置 PIN
- [ ] 刷新页面
- [ ] 用 PIN 解锁
- [ ] 检查数据加密状态

### 转账流程
- [ ] 解锁钱包
- [ ] 发起转账
- [ ] 确认交易签名成功
- [ ] 5分钟后会话私钥自动清除

### 兼容性测试
- [ ] 旧版本数据能自动迁移
- [ ] 迁移后功能正常

---

## 部署流程

1. 在 `wallet-shell/` 完成所有修改
2. 测试通过后运行 `./deploy.sh "Phase1: 安全加固完成"`
3. 验证线上版本（等 2 分钟 GitHub Pages 生效）
4. 更新 ARCHITECTURE.md 标记安全问题已修复

---

## 回滚计划

如果上线后发现问题：
```bash
cd dist
git revert HEAD
git push origin main
```

2分钟后自动恢复旧版本。

---

## 风险提示

**⚠️ 破坏性变更：**
- PIN 存储方式改变（明文 → hash）
- 钱包存储格式改变（明文 → 加密）
- 旧版本用户首次打开需要重新设置 PIN

**缓解措施：**
- 添加数据迁移逻辑
- 提示用户「检测到安全升级，请重新设置 PIN」
- 保留旧数据作为备份，迁移成功后才删除

---

老郭，我现在开始执行？还是你想先看看方案有没有问题？
