# ✅ P0-2 最终验收清单

**审核人**: 小郭  
**阶段**: 最终验收（5 项确认 + 2 项补测）  
**状态**: 代码检查完成，开始逐项验收

---

## 🔍 5 项确认清单

### ✅ 确认 1️⃣：createRealWallet — 持久化成功前绝不 publish

**当前代码** (Line 240-244):
```javascript
const w = { /* 完整钱包 */ };

window.REAL_WALLET = w;    // ← 问题：这行在 saveWallet 前执行
REAL_WALLET = w;
CHAIN_ADDR = w.trxAddress || '--';

saveWallet(w);             // saveWallet 是异步的，且无 await！
applyReferralCredit();
```

**需要检查的**:
- [ ] `saveWallet(w)` 是否有 `await`？
  - 当前：❌ 没有 await
  - 应该：✅ `await saveWallet(w);`
  
- [ ] publish 时机是否正确？
  - 当前：❌ saveWallet 前就赋值
  - 应该：✅ saveWallet 完成后才赋值

**验收标准**:
```javascript
async function createRealWallet(forcedWordCount) {
  // ... 生成逻辑 ...
  const w = { /* 完整钱包 */ };
  
  // 关键：先 await 完成持久化
  await saveWallet(w);
  applyReferralCredit();
  
  // 再赋值
  window.REAL_WALLET = w;
  REAL_WALLET = w;
  CHAIN_ADDR = w.trxAddress || '--';
  
  try { if (typeof ensureNativeAddrInitialized === 'function') ensureNativeAddrInitialized(); } catch (_na) {}
  return w;
}
```

**检查结果**: ⏳ 待验证

---

### ✅ 确认 2️⃣：restoreWallet — 持久化失败时不 publish、不留脏状态

**当前代码** (Line 277-290):
```javascript
var pub = { /* 公开信息 */ };

REAL_WALLET = pub;          // ← 问题：立即赋值
window.REAL_WALLET = pub;
CHAIN_ADDR = (pub && pub.trxAddress) ? pub.trxAddress : '--';

if (pin) {
  await saveWalletSecure(flatForStore, pin);  // ← 异步，可能失败
} else {
  _saveWalletPlainPublicOnly({...});
}
```

**问题**:
- ❌ 立即赋值 REAL_WALLET，但持久化可能失败
- ❌ 没有 try-catch，失败时无防护
- ❌ 返回 pub 前没有确认持久化成功

**验收标准**:
```javascript
async function restoreWallet(mnemonic) {
  // ... 验证逻辑 ...
  var pub = { /* 公开信息 */ };
  
  // 关键：先持久化（try-catch）
  try {
    if (pin) {
      await saveWalletSecure(flatForStore, pin);
    } else {
      _saveWalletPlainPublicOnly({...});
    }
  } catch (e) {
    console.error('[restoreWallet] 保存失败:', e);
    return null;  // ← 关键：失败返回 null，不发布
  }
  
  // 成功后才赋值
  REAL_WALLET = pub;
  window.REAL_WALLET = pub;
  CHAIN_ADDR = (pub && pub.trxAddress) ? pub.trxAddress : '--';
  
  try { applyReferralCredit(); } catch (e2) {}
  try { if (typeof updateAddr === 'function') updateAddr(); } catch (e3) {}
  return pub;
}
```

**检查结果**: ⏳ 待验证

---

### ✅ 确认 3️⃣：cold load — loadWalletPublic 走统一 publish helper

**当前代码** (Line 103-113):
```javascript
function loadWalletPublic() {
  try {
    var d = localStorage.getItem('ww_wallet');
    if (d) {
      var parsed = JSON.parse(d);
      window.REAL_WALLET = {  // ← 问题：直接赋值，无防护
        ethAddress: parsed.ethAddress,
        // ...
      };
      REAL_WALLET = window.REAL_WALLET;
      CHAIN_ADDR = (REAL_WALLET && REAL_WALLET.trxAddress) ? REAL_WALLET.trxAddress : '--';
    }
  } catch (e) {
    console.error('[loadWalletPublic] error:', e);
  }
}
```

**问题**:
- ❌ 直接赋值，无 Object.defineProperty
- ❌ 可以被外部覆盖 / 删除
- ❌ 与 createRealWallet / restoreWallet 的 publish 路径不一致

**验收标准**:
```javascript
function loadWalletPublic() {
  try {
    var d = localStorage.getItem('ww_wallet');
    if (!d || !d.ethAddress) return null;
    
    var walletObj = {
      ethAddress: d.ethAddress,
      trxAddress: d.trxAddress,
      btcAddress: d.btcAddress || '',
      createdAt: d.createdAt,
      backedUp: d.backedUp || false,
      hasEncrypted: !!d.encrypted
    };
    
    // 统一 publish 路径：Object.defineProperty
    Object.defineProperty(window, 'REAL_WALLET', {
      value: walletObj,
      writable: false,
      configurable: false
    });
    REAL_WALLET = window.REAL_WALLET;  // ← 同步引用
    CHAIN_ADDR = (REAL_WALLET && REAL_WALLET.trxAddress) ? REAL_WALLET.trxAddress : '--';
    
    return walletObj;
  } catch (e) {
    console.error('[loadWalletPublic] error:', e);
    return null;
  }
}
```

**检查结果**: ⏳ 待验证

---

### ✅ 确认 4️⃣：markBackupDone — backedUp 正常更新，UI 刷新正常

**当前代码** (Line 731):
```javascript
function markBackupDone() {
  const w = JSON.parse(localStorage.getItem('ww_wallet')||'{}');
  w.backedUp = true;
  localStorage.setItem('ww_wallet', JSON.stringify(w));
  
  if(REAL_WALLET) REAL_WALLET.backedUp = true;  // ← 检查：这行是否会报错？
  
  const el = document.getElementById('backupStatus');
  if(el) { el.textContent='已备份 ✓'; el.style.color='var(--green,#26a17b)'; }
  if (typeof updateHomeBackupBanner === 'function') updateHomeBackupBanner();
  if (typeof updateWalletSecurityScoreUI === 'function') updateWalletSecurityScoreUI();
  if (typeof wwPopulatePriceAlertForm === 'function') wwPopulatePriceAlertForm();
}
```

**需要检查的**:

1. **属性赋值是否可行？**
   - 如果 REAL_WALLET 被冻结（Object.freeze），这行会报错
   - 如果 REAL_WALLET 属性定义为 writable:false，这行会报错
   - 如果都没有，这行应该成功

2. **backedUp 更新是否同步？**
   - localStorage 已更新为 true
   - 内存中 REAL_WALLET.backedUp 也应该是 true

3. **UI 是否正常刷新？**
   - updateHomeBackupBanner() 执行
   - updateWalletSecurityScoreUI() 执行
   - wwPopulatePriceAlertForm() 执行

**验收标准**:
```javascript
function markBackupDone() {
  const w = JSON.parse(localStorage.getItem('ww_wallet')||'{}');
  w.backedUp = true;
  localStorage.setItem('ww_wallet', JSON.stringify(w));
  
  // 情况 A：如果可以直接改属性（推荐）
  if(REAL_WALLET) {
    REAL_WALLET.backedUp = true;  // 成功
  }
  
  // 或者情况 B：如果对象被冻结或属性不可写，重新赋值（备选）
  if(REAL_WALLET) {
    var updated = Object.assign({}, REAL_WALLET, { backedUp: true });
    Object.defineProperty(window, 'REAL_WALLET', {
      value: updated,
      writable: false,
      configurable: false
    });
    REAL_WALLET = updated;
  }
  
  const el = document.getElementById('backupStatus');
  if(el) { el.textContent='已备份 ✓'; el.style.color='var(--green,#26a17b)'; }
  if (typeof updateHomeBackupBanner === 'function') updateHomeBackupBanner();
  if (typeof updateWalletSecurityScoreUI === 'function') updateWalletSecurityScoreUI();
  if (typeof wwPopulatePriceAlertForm === 'function') wwPopulatePriceAlertForm();
}
```

**检查结果**: ⏳ 待验证

---

### ✅ 确认 5️⃣：grep 扫描 — 是否还有其他地方直接赋值 REAL_WALLET

**需要扫描**:
```bash
grep -rn "REAL_WALLET\s*=" /Users/daxiang/Desktop/WorldWallet/wallet-shell/
grep -rn "window\.REAL_WALLET\s*=" /Users/daxiang/Desktop/WorldWallet/wallet-shell/
```

**检查点**:
- [ ] 只有 createRealWallet / restoreWallet / loadWalletPublic / markBackupDone 赋值 REAL_WALLET
- [ ] 其他任何地方都不能直接赋值（除了 getter/setter 形式）

**预期结果**: ✅ 只有 4 个地方赋值，其他地方都不赋值

**检查结果**: ⏳ 待验证

---

## 🧪 2 项补测

### 补测 1️⃣：window.REAL_WALLET = null 后系统行为

**测试代码**:
```javascript
console.log('【补测 1】window.REAL_WALLET = null 后系统行为');

(async function() {
  // 假设已加载钱包
  console.log('  [初始] REAL_WALLET:', typeof window.REAL_WALLET);
  
  // 尝试覆盖
  try {
    window.REAL_WALLET = null;
    console.log('  ❌ 可以被覆盖（不应该）');
  } catch (e) {
    console.log('  ✅ 无法覆盖（正确）:', e.message);
  }
  
  // 尝试使用 REAL_WALLET
  try {
    var code = getMyReferralCode();  // 依赖 REAL_WALLET
    console.log('  referralCode:', code);
    console.log('  ✅ 代码继续执行（如预期）');
  } catch (e) {
    console.log('  ⚠️ 代码出错:', e.message);
  }
  
  // 尝试重新加载钱包
  try {
    loadWallet();
    console.log('  ✅ 重新加载成功');
    console.log('  REAL_WALLET 恢复:', typeof window.REAL_WALLET);
  } catch (e) {
    console.log('  ❌ 重新加载失败:', e.message);
  }
})();
```

**预期结果**:
- ✅ 无法覆盖（TypeError）
- ✅ 代码继续执行（不报错）
- ✅ 重新加载成功（REAL_WALLET 恢复）

**检查结果**: ⏳ 待验证

---

### 补测 2️⃣：window.REAL_WALLET === REAL_WALLET 一致性

**测试代码**:
```javascript
console.log('【补测 2】引用一致性检查');

(async function() {
  // 场景 1: createRealWallet 后
  console.log('  【场景 1】createRealWallet 后');
  // await createRealWallet();
  var isSame = window.REAL_WALLET === REAL_WALLET;
  console.log('    同一引用:', isSame ? '✅' : '❌');
  console.log('    ethAddress 同步:', window.REAL_WALLET?.ethAddress === REAL_WALLET?.ethAddress ? '✅' : '❌');
  
  // 场景 2: restoreWallet 后
  console.log('  【场景 2】restoreWallet 后');
  // await restoreWallet(mnemonic);
  isSame = window.REAL_WALLET === REAL_WALLET;
  console.log('    同一引用:', isSame ? '✅' : '❌');
  
  // 场景 3: loadWalletPublic 后
  console.log('  【场景 3】loadWalletPublic 后');
  // loadWalletPublic();
  isSame = window.REAL_WALLET === REAL_WALLET;
  console.log('    同一引用:', isSame ? '✅' : '❌');
  
  // 场景 4: markBackupDone 后
  console.log('  【场景 4】markBackupDone 后');
  // markBackupDone();
  isSame = window.REAL_WALLET === REAL_WALLET;
  console.log('    同一引用:', isSame ? '✅' : '❌');
  console.log('    backedUp 同步:', window.REAL_WALLET?.backedUp === REAL_WALLET?.backedUp ? '✅' : '❌');
})();
```

**预期结果**:
- ✅ 所有 4 个场景都是同一引用
- ✅ 所有字段都同步

**检查结果**: ⏳ 待验证

---

## 📋 最终验收矩阵

| 项目 | 检查点 | 预期 | 结果 |
|------|--------|------|------|
| **确认 1** | createRealWallet 顺序 | ✅ 待验证 | ⏳ |
| **确认 2** | restoreWallet 失败防护 | ✅ 待验证 | ⏳ |
| **确认 3** | loadWalletPublic 统一路径 | ✅ 待验证 | ⏳ |
| **确认 4** | markBackupDone 更新 + UI | ✅ 待验证 | ⏳ |
| **确认 5** | grep 扫描其他赋值 | ✅ 待验证 | ⏳ |
| **补测 1** | 覆盖后行为 | ✅ 待验证 | ⏳ |
| **补测 2** | 引用一致性 | ✅ 待验证 | ⏳ |

---

## 🎯 最终判断

**全部 ✅ 通过** → **P0-2 APPROVED**  
**任何 ❌ 失败** → **P0-2 REJECTED**（列出具体问题）

---

**现在逐一执行这些检查。**
