# 🧪 P1 Integration Testing - 10 Scenarios

**Date**: 2026-04-08 10:13 UTC+7  
**Status**: Starting execution  
**Duration**: ~3-4 hours  

---

## 📋 P1 Test Scenarios (10 Critical)

### Scenario 1: Wallet Lifecycle - Create & Load
**Purpose**: Full wallet creation and recovery cycle  
**Steps**:
1. Open wallet.html
2. Create new wallet
3. Save mnemonics
4. Close and clear localStorage
5. Recover wallet from mnemonics
6. Verify all 3 addresses match

**Expected**: Same addresses after recovery ✅

---

### Scenario 2: PIN Change & Cache Invalidation
**Purpose**: Verify PIN change clears caches properly  
**Steps**:
1. Load wallet with PIN "123456"
2. Verify key derivation cached
3. Change PIN to "654321"
4. Verify key derivation cache cleared
5. Load wallet with new PIN
6. Verify new PIN works

**Expected**: PIN change works, cache invalidated ✅

---

### Scenario 3: Encryption/Decryption Cycle
**Purpose**: Verify sensitive data encryption  
**Steps**:
1. Load wallet
2. Check REAL_WALLET structure
3. Verify privateKeys are encrypted (undefined in memory)
4. Trigger sensitive operation (transfer)
5. Verify encryption/decryption works
6. Verify data re-encrypted after operation

**Expected**: Keys never exposed in plaintext ✅

---

### Scenario 4: IDB Migration & Data Sync
**Purpose**: Verify IndexedDB caching and sync  
**Steps**:
1. Load wallet (triggers IDB migration)
2. Check migration flag in localStorage
3. Verify all 4 keys in localStorage
4. Verify IDB has data
5. Clear localStorage, IDB still has backup
6. Reload page, data restored

**Expected**: IDB backup working, data persistent ✅

---

### Scenario 5: Session Key Cache Performance
**Purpose**: Verify session key caching speeds up operations  
**Steps**:
1. Load wallet
2. Measure first address derivation (no cache)
3. Measure second address derivation (with cache)
4. Compare timing
5. Verify cache hit rate > 80%

**Expected**: Second call 80%+ faster ✅

---

### Scenario 6: Base64 Error Recovery
**Purpose**: Verify graceful error handling  
**Steps**:
1. Load wallet (create data)
2. Corrupt localStorage.ww_wallet (delete last 10 chars)
3. Refresh page
4. Check console for error message
5. Verify app doesn't crash
6. Verify recovery option available

**Expected**: Error shown, app continues ✅

---

### Scenario 7: Concurrent Operations (Stress Test)
**Purpose**: Verify system stability under load  
**Steps**:
1. Load wallet
2. Run 10 concurrent transfer operations
3. Run 10 concurrent address derivations
4. Monitor for race conditions
5. Verify all operations complete successfully

**Expected**: No race conditions, all complete ✅

---

### Scenario 8: Browser Tab Sync
**Purpose**: Verify cross-tab communication  
**Steps**:
1. Load wallet in Tab A
2. Load same wallet in Tab B
3. Change PIN in Tab A
4. Verify Tab B detects change
5. Modify assets in Tab A
6. Verify Tab B updates

**Expected**: Tabs stay in sync ✅

---

### Scenario 9: Offline Functionality
**Purpose**: Verify wallet works offline  
**Steps**:
1. Load wallet online
2. Go offline (DevTools Network: offline)
3. Perform local operations (address view, transfer prep)
4. Verify operations work without network
5. Go back online
6. Verify sync works

**Expected**: Local operations work offline ✅

---

### Scenario 10: Memory Cleanup
**Purpose**: Verify proper resource cleanup  
**Steps**:
1. Load wallet
2. Take heap snapshot
3. Perform 100 operations
4. Take heap snapshot
5. Clear wallet
6. Force garbage collection
7. Verify heap returned to baseline

**Expected**: No memory leaks ✅

---

## 🎯 Success Criteria

✅ All 10 scenarios PASS  
✅ No errors or warnings  
✅ Performance targets met  
✅ No memory leaks  
✅ Data integrity verified  

---

## 📊 Execution Plan

### Automated Tests (5-7)
- Scenarios 1-5: Automated with browser console
- Scenarios 7: Stress test via console
- Scenario 10: Memory profiling

### Manual Tests (3)
- Scenario 6: Requires localStorage corruption
- Scenario 8: Requires 2 browser tabs
- Scenario 9: Requires offline simulation

---

## ⏱️ Timeline

| Scenario | Est. Time | Status |
|----------|-----------|--------|
| 1 | 15 min | ⏳ |
| 2 | 10 min | ⏳ |
| 3 | 15 min | ⏳ |
| 4 | 15 min | ⏳ |
| 5 | 15 min | ⏳ |
| 6 | 15 min | ⏳ |
| 7 | 20 min | ⏳ |
| 8 | 20 min | ⏳ |
| 9 | 15 min | ⏳ |
| 10 | 20 min | ⏳ |
| **Total** | **~160 min** | 🔄 |

---

## 📝 Test Execution

Ready to start. Will execute each scenario in order and report results.

