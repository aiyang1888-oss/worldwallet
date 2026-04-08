# 🔒 CURSOR TASK P0-1：修复 PIN 盐值漏洞

## 【项目】
WorldWallet / wallet-shell

## 【文件】
`wallet-shell/core/security.js`

## 【问题】
**当前代码 (Line 133)**:
```javascript
async function hashPin(pin) {
  var enc = new TextEncoder();
  var data = enc.encode(pin + 'ww_salt_v1_2026');  // ❌ 硬编码盐值
  var hashBuffer = await crypto.subtle.digest('SHA-256', data);
  // ...
}
```

**漏洞**:
- 所有用户使用相同盐值 `'ww_salt_v1_2026'`
- 易被彩虹表 (Rainbow Table) 和预计算哈希表攻击
- 用户 PIN "123456" 永远生成相同哈希

## 【修改要求】

1. **生成随机盐值** (每个用户不同)
   - 16 字节随机盐，用 crypto.getRandomValues()
   - Base64 编码保存

2. **保存盐值到 localStorage**
   - Key: `ww_pin_salt` (新增)
   - 值: base64 编码的盐值

3. **修改 hashPin() 函数**
   ```javascript
   async function hashPin(pin, salt) {
     // salt 是 Uint8Array
     var enc = new TextEncoder();
     var material = await crypto.subtle.importKey(
       'raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey']
     );
     // 使用 PBKDF2 (迭代 100000 次)
     var key = await crypto.subtle.deriveKey(
       { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' },
       material,
       { name: 'HMAC', hash: 'SHA-256' },
       true,
       ['sign']
     );
     var signature = await crypto.subtle.sign('HMAC', key, enc.encode(pin));
     return btoa(String.fromCharCode.apply(null, new Uint8Array(signature)));
   }
   ```

4. **修改 savePinSecure() 函数**
   ```javascript
   async function savePinSecure(pin) {
     var salt = crypto.getRandomValues(new Uint8Array(16));
     var hash = await hashPin(pin, salt);
     
     Store.set('ww_pin_hash', hash);
     Store.set('ww_pin_salt', btoa(String.fromCharCode.apply(null, salt)));  // 新增
     
     // 清理旧的明文 PIN
     Store.remove('ww_pin');
     Store.remove('ww_unlock_pin');
   }
   ```

5. **修改 verifyPin() 函数**
   ```javascript
   async function verifyPin(pin) {
     var storedHash = Store.get('ww_pin_hash');
     var saltStr = Store.get('ww_pin_salt');
     
     if (!storedHash || !saltStr) {
       // 旧版本兼容：如果没有盐值，检查是否有明文 PIN (仅一次)
       var oldPin = Store.getPin();
       if (oldPin) {
         await savePinSecure(oldPin);  // 迁移到新格式
         console.log('[PIN 迁移] 已转为盐值哈希存储');
         return pin === oldPin;
       }
       return false;
     }
     
     var salt = Uint8Array.from(atob(saltStr), c => c.charCodeAt(0));
     var computed = await hashPin(pin, salt);
     return computed === storedHash;
   }
   ```

## 【限制】
- ✅ 不改变验证逻辑
- ✅ 保留向后兼容性 (一次性迁移)
- ✅ 不增加全局变量
- ❌ 不修改 Store 接口
- ❌ 不改变 localStorage Key 格式 (除了新增 ww_pin_salt)

## 【验收标准】

测试脚本 (在浏览器 DevTools 执行):
```javascript
// 1. 保存新 PIN
await savePinSecure('123456');

// 2. 检查存储
console.log('Hash:', Store.get('ww_pin_hash'));  // 应该是 base64
console.log('Salt:', Store.get('ww_pin_salt'));  // 应该是 base64，每次不同

// 3. 验证正确 PIN
var ok1 = await verifyPin('123456');
console.log('Correct PIN:', ok1);  // 应该是 true

// 4. 验证错误 PIN
var ok2 = await verifyPin('654321');
console.log('Wrong PIN:', ok2);  // 应该是 false

// 5. 清空重新测试，确保盐值不同
Store.remove('ww_pin_hash');
Store.remove('ww_pin_salt');
await savePinSecure('123456');
var salt2 = Store.get('ww_pin_salt');
// salt2 应该与之前的不同 (如果多次执行)
```

## 【完成标志】
- ✅ hashPin() 使用 PBKDF2
- ✅ savePinSecure() 生成随机盐
- ✅ verifyPin() 使用存储的盐
- ✅ 向后兼容一次性迁移
- ✅ 测试脚本通过

---

**优先级**: 🔴 CRITICAL  
**预计工时**: 30 分钟  
**风险**: 低（纯加密逻辑，不涉及 UI）
