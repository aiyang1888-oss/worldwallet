# 🎯 P0 LIVE Testing - Real-time Command Center

**启动时间**: 2026-04-08 09:58 UTC+7  
**状态**: 🔴 STARTING  
**目标**: 6/6 P0 tests PASS  

---

## 📋 QUICK REFERENCE

### 打开钱包
```
URL: file:///Users/daxiang/Desktop/WorldWallet/dist/wallet.html
或: file:///Users/daxiang/Desktop/WorldWallet/wallet-shell/index.html
```

### Console 命令 (F12 → Console)

**验证缓存系统**:
```javascript
console.log('IDB Cache:', window.wwIdbCache?.getStats());
console.log('Session Cache:', window.wwSessionKeyCache?.getStats());
console.log('Derivation Cache:', window.wwKeyDerivationCache?.getStats());
```

---

## 🧪 P0-001: PIN Unlock (15 min)

**步骤**:
1. 打开页面
2. 点击 "创建钱包" 或 "导入钱包"
3. 输入 PIN (记住这个 PIN，后续使用)
4. 在 Console 执行:
```javascript
console.log('[P0-001] REAL_WALLET:', !!REAL_WALLET);
console.log('[P0-001] ETH:', REAL_WALLET?.ethAddress);
console.log('[P0-001] TRX:', REAL_WALLET?.trxAddress);
console.log('[P0-001] BTC:', REAL_WALLET?.btcAddress);
```

**预期输出**:
```
[P0-001] REAL_WALLET: true
[P0-001] ETH: 0x... (40 位十六进制)
[P0-001] TRX: T... (T开头 34 位)
[P0-001] BTC: 1/3/bc1...
```

**结果**: [ ] ✅ PASS [ ] ❌ FAIL

---

## 🧪 P0-002: Address Consistency (30 min) ⭐ CRITICAL

**初始化**:
```javascript
const initialAddr = REAL_WALLET?.trx?.address;
console.log('[P0-002] Initial TRX:', initialAddr);
```

**刷新 1-5**:
```javascript
// 每次刷新后执行
console.log('[P0-002] After refresh:', REAL_WALLET?.trx?.address === initialAddr ? '✅ SAME' : '❌ DIFFERENT');
```

**预期**: 5 次都是 ✅ SAME

**浏览器完全重启**:
1. 完全关闭浏览器 (所有标签页)
2. 等待 10 秒
3. 重新打开同一 URL
4. 执行:
```javascript
console.log('[P0-002] After restart:', REAL_WALLET?.trx?.address);
// 应该和初始地址完全相同
```

**结果**: [ ] ✅ PASS [ ] ❌ FAIL

---

## 🧪 P0-003: Key Encryption (15 min)

```javascript
console.log('[P0-003] ETH key:', REAL_WALLET?.eth?.privateKey);
console.log('[P0-003] Should be undefined:', REAL_WALLET?.eth?.privateKey === undefined);
console.log('[P0-003] TRX key:', REAL_WALLET?.trx?.privateKey);
console.log('[P0-003] BTC key:', REAL_WALLET?.btc?.privateKey);
```

**预期**:
```
[P0-003] ETH key: undefined
[P0-003] Should be undefined: true
[P0-003] TRX key: undefined
[P0-003] BTC key: undefined
```

**结果**: [ ] ✅ PASS [ ] ❌ FAIL

---

## 🧪 P0-004: Base64 Error Handling (15 min)

**步骤**:
1. 打开 DevTools → Application → Local Storage
2. 找到 `ww_wallet` 键
3. 复制其值
4. 删除末尾 10 个字符 (破坏 base64)
5. 按 Enter 保存
6. 刷新页面
7. 查看 Console 是否有错误信息

**预期**:
- Console 显示清晰的错误
- 应用不崩溃，继续运行
- 显示 "钱包数据损坏" 或类似提示

**恢复**:
```javascript
localStorage.clear();
// 刷新后重新创建钱包
```

**结果**: [ ] ✅ PASS [ ] ❌ FAIL

---

## 🧪 P0-005: PIN Hash Upgrade (15 min)

```javascript
console.log('[P0-005] Device salt exists:', !!localStorage.getItem('ww_pin_device_salt_v1'));
console.log('[P0-005] Salt (first 50):', localStorage.getItem('ww_pin_device_salt_v1')?.substring(0, 50));
console.log('[P0-005] PIN hash (first 50):', localStorage.getItem('ww_pin_hash')?.substring(0, 50));
```

**预期**:
```
[P0-005] Device salt exists: true
[P0-005] Salt (first 50): (随机字符，不是硬编码)
[P0-005] PIN hash (first 50): (哈希值)
```

**结果**: [ ] ✅ PASS [ ] ❌ FAIL

---

## 🧪 P0-006: IndexedDB Migration (15 min)

**检查迁移标记**:
```javascript
console.log('[P0-006] IDB migrated:', localStorage.getItem('ww_idb_migrated_v1') === 'true');
console.log('[P0-006] All keys:', {
  ww_wallet: !!localStorage.getItem('ww_wallet'),
  ww_pin_hash: !!localStorage.getItem('ww_pin_hash'),
  ww_pin_device_salt_v1: !!localStorage.getItem('ww_pin_device_salt_v1'),
  ww_idb_migrated_v1: !!localStorage.getItem('ww_idb_migrated_v1')
});
```

**预期**:
```
[P0-006] IDB migrated: true
[P0-006] All keys: {
  ww_wallet: true,
  ww_pin_hash: true,
  ww_pin_device_salt_v1: true,
  ww_idb_migrated_v1: true
}
```

**检查 IndexedDB** (DevTools):
- Application → IndexedDB → 查看数据库
- 应该有表和数据

**结果**: [ ] ✅ PASS [ ] ❌ FAIL

---

## 📊 SUMMARY

### P0 Results

| Test | Status | Notes |
|------|--------|-------|
| P0-001 | [ ] | PIN unlock |
| P0-002 | [ ] | **CRITICAL** - Address consistency |
| P0-003 | [ ] | Key encryption |
| P0-004 | [ ] | Error handling |
| P0-005 | [ ] | PIN upgrade |
| P0-006 | [ ] | IDB migration |

### Overall

- [ ] ✅ All 6 tests PASS (proceed to P1)
- [ ] ⚠️ Some failures (list below for fixes)

### Failures (if any)

```
Test: ___________
Issue: ___________
Console Error: ___________
Expected: ___________
Actual: ___________
```

---

## 🔄 IF ISSUES FOUND

Tell me the exact:
1. **Test name** (P0-001, etc)
2. **What went wrong** (specific error)
3. **Console output** (exact error message)
4. **Expected vs Actual**

Example format:
```
P0-002 FAILED
Issue: Address changed after refresh
Console: undefined (no error shown)
Expected: TRx... (same as before)
Actual: TRy... (different address)
```

Then I'll send Cursor the fix request.

---

## ⏱️ TIMING

| Test | Duration | Actual | Status |
|------|----------|--------|--------|
| P0-001 | 15 min | ___ | [ ] |
| P0-002 | 30 min | ___ | [ ] |
| P0-003 | 15 min | ___ | [ ] |
| P0-004 | 15 min | ___ | [ ] |
| P0-005 | 15 min | ___ | [ ] |
| P0-006 | 15 min | ___ | [ ] |
| **Total** | **105 min** | ___ | [ ] |

---

## 🚀 STATUS UPDATES

**Test Start**: ___________  
**P0-001 Done**: ___________  
**P0-002 Done**: ___________  
**P0-003 Done**: ___________  
**P0-004 Done**: ___________  
**P0-005 Done**: ___________  
**P0-006 Done**: ___________  
**All Complete**: ___________  

---

**READY TO START. OPEN BROWSER AND BEGIN P0-001.**

