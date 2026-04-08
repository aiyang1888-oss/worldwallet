# 🔒 CURSOR TASKS P0-2 到 P0-10：核心安全修复清单

---

## P0-2: core/security.js atob 错误处理

### 【项目】WorldWallet / wallet-shell
### 【文件】wallet-shell/core/security.js, Line 51-55

### 【问题】
```javascript
async function decryptWithPin(bundle, pin) {
  var salt = Uint8Array.from(atob(bundle.salt), ...);  // ❌ atob 可能抛异常
  var iv = Uint8Array.from(atob(bundle.iv), ...);      // ❌ 无 try-catch
  var data = Uint8Array.from(atob(bundle.data), ...);  // ❌
  // ...
}
```
坏 base64 字符串会导致整个函数崩溃，用户无法恢复钱包。

### 【修改要求】
```javascript
async function decryptWithPin(bundle, pin) {
  try {
    var salt = Uint8Array.from(atob(bundle.salt), c => c.charCodeAt(0));
    var iv = Uint8Array.from(atob(bundle.iv), c => c.charCodeAt(0));
    var data = Uint8Array.from(atob(bundle.data), c => c.charCodeAt(0));
    var key = await deriveKeyFromPin(pin, salt);
    var decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv }, key, data
    );
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    console.error('[decryptWithPin] 解密失败:', e.message);
    throw new Error('无效的加密数据或错误的 PIN');
  }
}
```

### 【验收标准】
- ✅ 坏 base64 返回有意义的错误消息
- ✅ 错误 PIN 返回有意义的错误消息
- ✅ 不崩溃应用

---

## P0-3: core/security.js decrypt 异常处理

### 【项目】WorldWallet / wallet-shell
### 【文件】wallet-shell/core/security.js, Line 57

### 【问题】
```javascript
var decrypted = await crypto.subtle.decrypt(
  { name: 'AES-GCM', iv: iv }, key, data  // ❌ 错误 PIN 会导致 throw
);
```
AES-GCM 认证失败时会抛异常，未捕获。

### 【修改要求】
同 P0-2，整个 decryptWithPin() 用 try-catch 包装。

### 【验收标准】
- ✅ 错误 PIN 不崩溃
- ✅ 返回有意义的错误

---

## P0-4: wallet.tx.js sendTRX 私钥检查

### 【项目】WorldWallet / wallet-shell
### 【文件】wallet-shell/wallet.tx.js, Line 135

### 【问题】
```javascript
async function sendTRX(toAddr, amount) {
  await loadTronWeb();
  const tw = new TronWeb({ fullHost: TRON_GRID });
  tw.setPrivateKey(REAL_WALLET.trxPrivateKey || REAL_WALLET.privateKey);  // ❌ 无空值检查
  // ...
}
```
如果 REAL_WALLET 未解锁或为 null，会导致崩溃。

### 【修改要求】
```javascript
async function sendTRX(toAddr, amount) {
  if (!REAL_WALLET || !REAL_WALLET.trxPrivateKey) {
    throw new Error('钱包未解锁，无法转账');
  }
  await loadTronWeb();
  const tw = new TronWeb({ fullHost: TRON_GRID });
  tw.setPrivateKey(REAL_WALLET.trxPrivateKey);
  // ...
}
```
对 sendETH、sendUSDT_TRC20 同样修改。

### 【验收标准】
- ✅ 未解锁时转账返回错误消息
- ✅ 不崩溃应用
- ✅ ETH、TRX、USDT 三个函数都加检查

---

## P0-5: wallet.tx.js sendETH 私钥验证

### 【项目】WorldWallet / wallet-shell
### 【文件】wallet-shell/wallet.tx.js, Line 147

### 【问题】
```javascript
async function sendETH(toAddr, amount) {
  const provider = new ethers.providers.JsonRpcProvider(ETH_RPC);
  const wallet = new ethers.Wallet(REAL_WALLET.privateKey, provider);  // ❌ 无验证
  // ...
}
```
坏的私钥格式或 undefined 会导致 ethers.Wallet 抛异常。

### 【修改要求】
```javascript
async function sendETH(toAddr, amount) {
  if (!REAL_WALLET || !REAL_WALLET.privateKey) {
    throw new Error('钱包未解锁，无法转账');
  }
  try {
    const provider = new ethers.providers.JsonRpcProvider(ETH_RPC);
    const wallet = new ethers.Wallet(REAL_WALLET.privateKey, provider);
    // ...
  } catch (e) {
    throw new Error('私钥无效: ' + e.message);
  }
}
```

### 【验收标准】
- ✅ 坏私钥返回错误消息
- ✅ 不崩溃应用

---

## P0-6: wallet.tx.js loadBalances 地址验证

### 【项目】WorldWallet / wallet-shell
### 【文件】wallet-shell/wallet.tx.js, Line 202

### 【问题】
```javascript
const [bal, prices] = await Promise.all([
  typeof getBalance === 'function'
    ? getBalance({
        eth: REAL_WALLET.ethAddress || '',    // ❌ 无格式验证
        trx: REAL_WALLET.trxAddress || ''     // ❌ 
      })
    : Promise.resolve(...)
]);
```
无效地址格式会导致 API 调用失败，用户无法看到余额。

### 【修改要求】
```javascript
function isValidEthAddress(addr) {
  return /^0x[0-9a-fA-F]{40}$/.test(addr);
}

function isValidTrxAddress(addr) {
  return /^T[1-9A-HJ-NP-Z]{33}$/.test(addr);
}

// 在 loadBalances 中
const ethAddr = REAL_WALLET.ethAddress || '';
const trxAddr = REAL_WALLET.trxAddress || '';

if (ethAddr && !isValidEthAddress(ethAddr)) {
  console.error('无效 ETH 地址:', ethAddr);
}
if (trxAddr && !isValidTrxAddress(trxAddr)) {
  console.error('无效 TRX 地址:', trxAddr);
}

const [bal, prices] = await Promise.all([
  typeof getBalance === 'function'
    ? getBalance({
        eth: isValidEthAddress(ethAddr) ? ethAddr : '',
        trx: isValidTrxAddress(trxAddr) ? trxAddr : ''
      })
    : Promise.resolve(...)
]);
```

### 【验收标准】
- ✅ 无效地址被过滤，不发送到 API
- ✅ 有错误日志记录

---

## P0-7: wallet.core.js REAL_WALLET 全局保护

### 【项目】WorldWallet / wallet-shell
### 【文件】wallet-shell/wallet.core.js, Line 103 & 240

### 【问题】
```javascript
window.REAL_WALLET = {...};  // ❌ 可被任何脚本覆盖
```

### 【修改要求】
改为使用闭包 (IIFE) 隐藏 REAL_WALLET，或使用 Object.defineProperty 防止覆盖：

```javascript
// 选项 A: 使用 Object.defineProperty (临时方案)
Object.defineProperty(window, 'REAL_WALLET', {
  value: {...},
  writable: false,
  configurable: false
});

// 选项 B: 长期方案 (与 A.1 任务结合)
// 将 wallet.core.js 用 IIFE 包装，REAL_WALLET 只在内部可见
// 提供受限 getter: window.getRealWalletPublic()
```

本任务先用选项 A（快速修复），后续与 A.1 结合做选项 B。

### 【修改要求细节】
在所有 `window.REAL_WALLET = ...` 的地方改为：
```javascript
Object.defineProperty(window, 'REAL_WALLET', {
  value: {...wallet data...},
  writable: false,
  configurable: false
});
```

### 【验收标准】
- ✅ 控制台运行 `window.REAL_WALLET = {}` 应该失败
- ✅ 控制台运行 `delete window.REAL_WALLET` 应该失败
- ✅ 读取 REAL_WALLET 仍然正常

---

## P0-8: wallet.runtime.js 会话 PIN 隐藏

### 【项目】WorldWallet / wallet-shell
### 【文件】wallet-shell/wallet.runtime.js, Line 490

### 【问题】
```javascript
function wwGetSessionPin() { return _wwSessionPin || ''; }
function wwSetSessionPin(p) { ...保存到全局... }
```
这两个函数暴露在 window，攻击者可读取/修改内存中的 PIN。

### 【修改要求】
用 IIFE 包装 wallet.runtime.js，隐藏 wwGetSessionPin 和 wwSetSessionPin：
```javascript
(function() {
  var _wwSessionPin = '';
  
  // 内部使用，不暴露
  function wwGetSessionPin() { return _wwSessionPin; }
  function wwSetSessionPin(p) { _wwSessionPin = p; }
  
  // 对外只暴露必需函数，如 submitPinUnlock()
  // submitPinUnlock 内部调用 wwSetSessionPin，但不暴露 getter
})();
```

### 【验收标准】
- ✅ `typeof window.wwGetSessionPin` 返回 `undefined`
- ✅ `typeof window.wwSetSessionPin` 返回 `undefined`
- ✅ PIN 验证流程仍然正常
- ✅ UI 中的 PIN 输入仍然可用

---

## P0-9: js/storage.js Store 对象检查

### 【项目】WorldWallet / wallet-shell
### 【文件】wallet-shell/js/storage.js, Line 1

### 【问题】
```javascript
// js/storage.js
var Store = {
  setWallet: function(w) { localStorage.setItem('ww_wallet', JSON.stringify(w)); },
  // ...
};

// core/security.js 中使用
Store.setWallet(...);  // ❌ 假设 Store 已定义
```
如果 storage.js 未加载，所有引用 Store 的代码会崩溃。

### 【修改要求】
在 core/security.js 的开头加检查：
```javascript
// core/security.js 顶部
if (typeof Store === 'undefined') {
  throw new Error('[安全初始化失败] Store 对象未定义，请确保 js/storage.js 已加载');
}
```

在 wallet.core.js、wallet.tx.js 等使用 Store 的地方也加检查。

或者在 index.html 中加初始化检查：
```html
<script>
if (typeof Store === 'undefined') {
  console.error('[严重错误] Store 对象未定义');
  document.body.innerHTML = '<p>初始化失败，请刷新页面</p>';
}
</script>
```

### 【验收标准】
- ✅ 加载顺序错误时有清晰的错误消息
- ✅ 不会出现莫名其妙的 "Store is not defined" 崩溃

---

## P0-10: core/security.js String.fromCharCode 大数组处理

### 【项目】WorldWallet / wallet-shell
### 【文件】wallet-shell/core/security.js, Line 37, 44

### 【问题】
```javascript
return {
  salt: btoa(String.fromCharCode.apply(null, salt)),     // ❌ 大数组爆栈
  iv: btoa(String.fromCharCode.apply(null, iv)),         // ❌
  data: btoa(String.fromCharCode.apply(null, encrypted)) // ❌
};
```
Uint8Array > 65536 时会触发 "Maximum call stack size exceeded"。

### 【修改要求】
创建辅助函数处理大数组：
```javascript
function uint8ToBase64(bytes) {
  var binary = '';
  var chunk = 8192;  // 每次处理 8KB
  for (var i = 0; i < bytes.length; i += chunk) {
    var slice = bytes.slice(i, i + chunk);
    binary += String.fromCharCode.apply(null, slice);
  }
  return btoa(binary);
}

function base64ToUint8(str) {
  var binary = atob(str);
  var bytes = new Uint8Array(binary.length);
  for (var i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// 修改 encryptWithPin
async function encryptWithPin(plaintext, pin) {
  var salt = crypto.getRandomValues(new Uint8Array(16));
  var iv = crypto.getRandomValues(new Uint8Array(12));
  var key = await deriveKeyFromPin(pin, salt);
  var enc = new TextEncoder();
  var encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv }, key, enc.encode(plaintext)
  );
  return {
    salt: uint8ToBase64(salt),
    iv: uint8ToBase64(iv),
    data: uint8ToBase64(new Uint8Array(encrypted))
  };
}

// 修改 decryptWithPin
async function decryptWithPin(bundle, pin) {
  try {
    var salt = base64ToUint8(bundle.salt);
    var iv = base64ToUint8(bundle.iv);
    var data = base64ToUint8(bundle.data);
    // ... 其他代码
  } catch (e) {
    console.error('[decryptWithPin]', e.message);
    throw new Error('解密失败: ' + e.message);
  }
}
```

### 【验收标准】
- ✅ 加密 100KB 的数据不崩溃
- ✅ 解密后数据完整
- ✅ 小数据情况仍然正常

---

## 📋 P0 任务执行顺序

1. **P0-1** (PIN 盐值) — 基础，其他任务依赖
2. **P0-2 + P0-3** (atob + decrypt 错误处理) — 一起做
3. **P0-4 + P0-5 + P0-6** (转账私钥 + 地址验证) — 一起做
4. **P0-7** (REAL_WALLET 保护) — 独立
5. **P0-8** (会话 PIN 隐藏) — 独立
6. **P0-9** (Store 检查) — 独立
7. **P0-10** (大数组编码) — 独立

---

## 🎯 验收清单

完成所有 P0 任务后，运行以下基础检查：

```javascript
// 1. 打开钱包首页，应该正常加载
// 2. 创建新钱包，应该生成有效私钥
// 3. 设置 PIN，应该保存盐值和哈希
// 4. 解锁钱包，应该验证 PIN 正确
// 5. 尝试错误 PIN，应该被拒绝
// 6. 查看余额，应该正常显示
// 7. 尝试转账，应该不会崩溃（即使条件不足）
// 8. 打开 DevTools，确认无 "Store is not defined" 错误
// 9. 运行 typeof window.REAL_WALLET，应该是 object（不能被覆盖）
// 10. 运行 typeof window.wwGetSessionPin，应该是 undefined
```

---

## 🚀 提交规范

每个 P0 任务完成后：
1. Commit message: `security: fix [task name]`
2. 运行验收清单
3. 向我汇报状态 (已修复/未修复/有新风险)
