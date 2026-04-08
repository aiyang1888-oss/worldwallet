# 🧪 P0 Testing Strategy

**Date**: 2026-04-08 10:00 UTC+7  
**Status**: Testing in progress  

---

## 📊 Testing Approach

### Option 1: Automated (Puppeteer) - 🔄 In Progress
- Installing Puppeteer
- Will auto-run P0-001, P0-002, P0-003, P0-005, P0-006
- P0-004 requires manual interaction (localStorage modification)
- Real browser, real DOM, real rendering

### Option 2: Manual (Browser DevTools)
- 先 `npm run dev`，再打开: `http://127.0.0.1:8766/wallet.html`（链接表见 `LOCAL_TEST.md`）
- Follow: `P0_TESTING_LIVE.md`
- Execute: Console commands
- Record: Results in template

---

## 🎯 Test Cases

### P0-001: PIN Unlock ✅
**Status**: Ready  
**Command**: Load wallet, check REAL_WALLET  
**Expected**: All 3 addresses loaded  
**Automated**: Yes  

### P0-002: Address Consistency ⭐ CRITICAL  
**Status**: Ready  
**Command**: 5 refreshes + browser restart  
**Expected**: Address 100% identical  
**Automated**: Yes  
**Duration**: 30 min (need to wait for page loads)

### P0-003: Key Encryption ✅
**Status**: Ready  
**Command**: Check privateKey === undefined  
**Expected**: All keys undefined (encrypted)  
**Automated**: Yes  

### P0-004: Base64 Error ⚠️
**Status**: Requires manual setup  
**Action**: Modify localStorage  
**Expected**: Error handled gracefully  
**Automated**: No (needs manual)

### P0-005: PIN Hash Upgrade ✅
**Status**: Ready  
**Command**: Check device salt exists  
**Expected**: Salt present + hash updated  
**Automated**: Yes  

### P0-006: IndexedDB Migration ✅
**Status**: Ready  
**Command**: Check migration flag + IDB data  
**Expected**: All 4 keys present  
**Automated**: Yes  

---

## ⏱️ Timeline

| Phase | Start | Duration | Status |
|-------|-------|----------|--------|
| Puppeteer install | 10:00 | ~5 min | 🔄 |
| Auto tests (P0-001/003/005/006) | 10:05 | ~15 min | ⏳ |
| P0-002 (with page waits) | 10:20 | ~30 min | ⏳ |
| P0-004 (manual) | 10:50 | ~15 min | ⏳ |
| Report generation | 11:05 | ~5 min | ⏳ |
| **Total** | **10:00** | **~70 min** | 🔄 |

---

## 📋 Reporting

### Success Scenario
All 6 tests PASS:
```
P0-001: ✅ PASS
P0-002: ✅ PASS
P0-003: ✅ PASS
P0-004: ✅ PASS
P0-005: ✅ PASS
P0-006: ✅ PASS

Result: 🟢 READY FOR P1 TESTING
```

### Failure Scenario
If any test fails, I'll report:
```
Test: P0-XXX
Status: ❌ FAIL
Issue: [specific problem]
Console Error: [exact error message]
Expected: [what should happen]
Actual: [what actually happened]

Action: Send to Cursor for fix
```

---

## 🔧 If Issues Found

1. I'll identify the exact problem
2. Report it in clear format
3. Send to you
4. You forward to Cursor
5. Cursor fixes and re-syncs files
6. I re-test

---

## 📌 Key Points

- **P0-002 is critical** (万语地址一致性)
- **All 6 must pass** to proceed to P1
- **Testing is automated** where possible (manual only for localStorage mod)
- **Clear reporting** for any issues

---

**Status**: 🔄 IN PROGRESS  
**Expected completion**: 11:05 UTC+7  

I'll report results as they come in.

