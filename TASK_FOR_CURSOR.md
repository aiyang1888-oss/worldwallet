# 🔒 安全加固任务清单 - 交给 Cursor 执行

**项目**: WorldWallet wallet-shell  
**目标**: 降低前端 API 暴露面（不做大规模重构）  
**优先级**: P0 - 立即执行

---

## 📋 任务 A：核心安全函数隐藏

### Task A1: 隐藏 core/security.js 的危险函数

**目标文件**: `/Users/daxiang/Desktop/WorldWallet/wallet-shell/core/security.js`

**当前问题**:
- `setSessionKeys()` / `getSessionKeys()` / `clearSessionKeys()` 都是全局函数
- 任何外部脚本都可调用，导致会话被强制锁定或清除

**操作步骤**:

1. **用 IIFE 包装整个文件**
   - 文件顶部加: `(function() { 'use strict';`
   - 文件末尾加: `})();`

2. **隐藏这些函数** (不要暴露到 window)
   ```javascript
   function setSessionKeys(keys) { ... }      // 保留但不导出
   function getSessionKeys() { ... }          // 保留但不导出
   function clearSessionKeys() { ... }        // 保留但不导出
   var _sessionPrivateKeys = null             // 保留但不导出
   ```

3. **仅白名单导出** (末尾加这些)
   ```javascript
   // 白名单导出 (末尾，IIFE 内)
   window.verifyPin = verifyPin;              // UI 需要
   window.savePinSecure = savePinSecure;      // UI 需要
   window.decryptWalletSensitive = decryptWalletSensitive;  // UI 需要
   window.loadWalletPublic = loadWalletPublic;               // UI 需要
   
   // 不导出:
   // window.setSessionKeys - 隐藏
   // window.getSessionKeys - 隐藏
   // window.clearSessionKeys - 隐藏
   ```

4. **验证**
   - 打开 DevTools，运行: `typeof window.clearSessionKeys` 应该返回 `undefined`
   - 运行: `typeof window.verifyPin` 应该返回 `function`

---

### Task A2: 隐藏 wallet.core.js 的 REAL_WALLET

**目标文件**: `/Users/daxiang/Desktop/WorldWallet/wallet-shell/wallet.core.js`

**当前问题**:
- `var REAL_WALLET = null` 在全局作用域
- 多处 `window.REAL_WALLET = {...}` 赋值
- 外部脚本可读取/覆盖整个钱包对象

**操作步骤**:

1. **用 IIFE 包装整个文件**
   - 文件顶部加: `(function() { 'use strict';`
   - 文件末尾加: `})();`

2. **保留 REAL_WALLET 变量，但不暴露到 window**
   ```javascript
   // 在 IIFE 内，不要赋值给 window.REAL_WALLET
   var REAL_WALLET = null;  // 只在内部使用
   
   // 删除这些行:
   // window.REAL_WALLET = {...}
   // REAL_WALLET = window.REAL_WALLET
   ```

3. **提供受限 getter 函数** (末尾，导出给 UI)
   ```javascript
   function getRealWalletPublic() {
     if (!REAL_WALLET) return null;
     // 仅返回公钥，不返回助记词或私钥
     return {
       ethAddress: REAL_WALLET.ethAddress,
       trxAddress: REAL_WALLET.trxAddress,
       btcAddress: REAL_WALLET.btcAddress,
       createdAt: REAL_WALLET.createdAt,
       backedUp: REAL_WALLET.backedUp
     };
   }
   
   window.getRealWalletPublic = getRealWalletPublic;
   ```

4. **检查所有引用 REAL_WALLET 的地方**
   - 在 IIFE 内部的代码保留原样（可访问 REAL_WALLET）
   - 外部代码改为调用 `getRealWalletPublic()`
   - **可能需要在其他文件中改**: wallet.runtime.js, wallet.ui.js 等

5. **验证**
   - 打开 DevTools，运行: `typeof window.REAL_WALLET` 应该返回 `undefined`
   - 运行: `typeof window.getRealWalletPublic` 应该返回 `function`
   - 运行: `window.getRealWalletPublic()` 应该返回 `{ethAddress: "0x...", ...}`

---

## 📋 任务 B：依赖本地化

### Task B1: 下载 ethers.js 到本地

**当前状态**:
```html
<script src="https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js" ...></script>
```

**操作步骤**:

1. **创建目录**
   ```bash
   mkdir -p /Users/daxiang/Desktop/WorldWallet/wallet-shell/assets/lib
   ```

2. **下载 ethers.js**
   ```bash
   curl -o /Users/daxiang/Desktop/WorldWallet/wallet-shell/assets/lib/ethers.umd.min.js \
     https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js
   ```

3. **修改 index.html** (Line 863)
   ```html
   <!-- 改为: -->
   <script src="assets/lib/ethers.umd.min.js" type="application/javascript"></script>
   ```

4. **验证**: 刷新页面，打开 DevTools，检查 ethers 是否加载成功
   - `typeof ethers` 应该返回 `object`

---

### Task B2: 下载 TronWeb 到本地（动态加载版本）

**当前代码** (wallet.core.js + wallet.runtime.js 中):
```javascript
s.src='https://cdn.jsdelivr.net/npm/tronweb@5.3.2/dist/TronWeb.js'
```

**操作步骤**:

1. **下载 TronWeb**
   ```bash
   curl -o /Users/daxiang/Desktop/WorldWallet/wallet-shell/assets/lib/TronWeb.js \
     https://cdn.jsdelivr.net/npm/tronweb@5.3.2/dist/TronWeb.js
   ```

2. **修改 core/security.js** 中的 `loadTronWeb()` 函数
   ```javascript
   function loadTronWeb(){
     return new Promise(r=>{
       if(window.TronWeb){r();return;}
       const s=document.createElement('script');
       s.src='assets/lib/TronWeb.js';  // 改为本地路径
       s.onload=r;
       document.head.appendChild(s);
     });
   }
   ```

3. **修改 wallet.core.js** 中的 `loadTronWeb()` 函数（同样改法）

4. **修改 wallet.runtime.js** 中的 `loadTronWeb()` 函数（同样改法）

5. **验证**: 刷新页面，打开 DevTools，确认 TronWeb 动态加载成功

---

### Task B3: 下载 QRCode 库到本地

**当前代码**:
```javascript
s.src='https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js'
```

**操作步骤**:

1. **下载 QRCode**
   ```bash
   curl -o /Users/daxiang/Desktop/WorldWallet/wallet-shell/assets/lib/qrcode.min.js \
     https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js
   ```

2. **修改 wallet.core.js** 中的 `loadQRCodeLib()` 函数
   ```javascript
   function loadQRCodeLib(){
     return new Promise(r=>{
       if(typeof QRCode !== 'undefined'){r();return;}
       const s=document.createElement('script');
       s.src='assets/lib/qrcode.min.js';  // 改为本地路径
       s.onload=r;
       document.head.appendChild(s);
     });
   }
   ```

3. **修改 wallet.runtime.js** 中的 `loadQRCodeLib()` 函数（同样改法）

4. **验证**: 打开页面的"地址"页面，点击二维码，确认能生成

---

## 📋 任务 C：验证清单

完成 A + B 后，执行以下验证：

### 验证 A1 (core/security.js 隐藏)
```javascript
// 打开 DevTools Console 运行:
console.log(typeof window.clearSessionKeys);     // 应该是 undefined
console.log(typeof window.setSessionKeys);       // 应该是 undefined
console.log(typeof window.verifyPin);            // 应该是 function
```

### 验证 A2 (wallet.core.js REAL_WALLET 隐藏)
```javascript
// 打开 DevTools Console 运行:
console.log(typeof window.REAL_WALLET);          // 应该是 undefined
console.log(typeof window.getRealWalletPublic);  // 应该是 function
console.log(window.getRealWalletPublic());       // 应该返回 {ethAddress, trxAddress, ...}
```

### 验证 B (依赖本地化)
```javascript
// 打开 DevTools 的 Network 标签页，刷新页面
// 检查 requests：
// - ethers.umd.min.js 应该来自 /assets/lib/ (不是 cdn.jsdelivr.net)
// - TronWeb.js 动态加载时应该来自 /assets/lib/
// - qrcode.min.js 动态加载时应该来自 /assets/lib/
```

---

## 🎯 预期成果

✅ **完成后**:
- 危险函数 (clearSessionKeys 等) 无法从控制台调用
- REAL_WALLET 完全私有，只能通过受限 getter 访问
- 所有 CDN 依赖已本地化，不再依赖外网

✅ **影响**:
- 无 UI 改动
- 无业务逻辑改动
- 前端攻击面大幅降低

---

## ⏱️ 预计工时

- **Task A1**: ~30 分钟
- **Task A2**: ~45 分钟（可能需要改多个文件的引用）
- **Task B1-B3**: ~15 分钟
- **验证**: ~10 分钟

**总计**: ~2 小时

---

## 🚨 注意事项

1. **REAL_WALLET 引用**: A2 完成后，检查以下文件是否仍在用 `window.REAL_WALLET`：
   - wallet.runtime.js
   - wallet.ui.js
   - wallet.dom-bind.js
   - wallet.addr.js
   
   这些改为调用 `getRealWalletPublic()` 或访问内部 REAL_WALLET（如果在同一 IIFE）

2. **测试钱包创建/导入流程**: 完成后要验证用户能正常创建和导入钱包

3. **Git 提交**: 分两个 commit
   - `security: isolate dangerous functions in core/security.js + hide REAL_WALLET in wallet.core.js`
   - `build: localize CDN dependencies (ethers, tronweb, qrcode)`

---

**准备好了吗？复制这份清单直接给 Cursor 让他执行即可！**
