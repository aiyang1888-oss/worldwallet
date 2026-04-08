# 🧪 万语地址一致性验证清单

**验证日期**: 2026-04-08 09:14 UTC+7  
**验证标准**: 与需求 8 一致  
**目标**: 确认万语地址在 localStorage/IndexedDB 中的一致性  

---

## 📋 验证步骤

### 1️⃣ 打开钱包并记录地址

**操作**:
1. 打开 WorldWallet (`dist/wallet.html` 或 `wallet-shell/index.html`)
2. 解锁钱包（输入 PIN）
3. 在 Browser Console 中执行:
   ```javascript
   console.log('[WanYuAddr] Current REAL_WALLET.trxAddress:', REAL_WALLET?.trx?.address);
   ```
4. 记下输出的地址 (例: `TRxxx...`)

**预期**:
- ✅ 地址正常显示
- ✅ 钱包完整加载

---

### 2️⃣ 多次刷新验证（3-5 次）

**操作**:
1. 刷新页面 (Ctrl+R 或 Cmd+R)
2. 等待页面加载完成
3. 在 Console 中再次执行:
   ```javascript
   console.log('[WanYuAddr] After refresh:', REAL_WALLET?.trx?.address);
   ```
4. 比较地址是否与步骤 1 的地址完全相同
5. 重复刷新 3-5 次，每次记录结果

**预期**:
- ✅ 每次刷新后地址完全相同
- ✅ localStorage 中的数据未变
- ✅ 无 [WanYuAddr] 开头的错误日志

---

### 3️⃣ 查看 localStorage 和 IndexedDB 内容

**操作**:
1. 打开浏览器开发者工具 (F12)
2. 进入 **Application → Local Storage → 你的域**
3. 查看以下 4 个键的内容:
   - `ww_wallet` - 钱包数据（加密）
   - `ww_pin_hash` - PIN 哈希
   - `ww_pin_device_salt_v1` - 设备盐
   - `ww_idb_migrated_v1` - IDB 迁移标记

4. 记下它们的值（至少前 50 个字符）
5. 刷新页面后再看一遍，确认值未变
6. 进入 **Application → IndexedDB** 查看是否有数据

**预期**:
- ✅ 所有 4 个键都存在
- ✅ 值在刷新前后保持不变
- ✅ IndexedDB 有数据（IDB 迁移已完成）

---

### 4️⃣ 完全退出浏览器重新打开

**操作**:
1. **完全关闭浏览器**（所有标签页，不是最小化）
2. 等待 10 秒
3. 重新打开浏览器
4. 进入钱包页面
5. 刷新一次 (Ctrl+R)
6. 在 Console 中执行:
   ```javascript
   console.log('[WanYuAddr] After browser restart:', REAL_WALLET?.trx?.address);
   ```
7. 与步骤 1 的地址比较

**预期**:
- ✅ 地址与之前完全相同（精确到每一个字符）
- ✅ localStorage 数据完整恢复
- ✅ 无 [WanYuAddr] 开头的错误

**注意**:
- 取决于实现，可能需要重新输入 PIN
- 如果需要 PIN，说明会话已清除（正常）
- 地址本身应该相同

---

## 📸 验证结果报告模板

如果发现异常或想反馈结果，请收集以下信息：

```markdown
## ✅ 验证完成报告

**验证时间**: [时间戳]
**浏览器**: [Chrome/Firefox/Safari 版本号]
**测试环境**: [本地/远程 URL]

### 1️⃣ 刷新一致性测试
- 初始地址: TRxxx...
- 刷新1: TRxxx... ✅ / ❌
- 刷新2: TRxxx... ✅ / ❌
- 刷新3: TRxxx... ✅ / ❌
- 刷新4: TRxxx... ✅ / ❌
- 刷新5: TRxxx... ✅ / ❌

**结论**: ✅ 一致 / ❌ 不一致

### 2️⃣ localStorage 内容
```
ww_wallet (前 100 字符): ...
ww_pin_hash (完整): ...
ww_pin_device_salt_v1 (完整): ...
ww_idb_migrated_v1: ...
```

### 3️⃣ IndexedDB 状态
- IndexedDB 数据库存在: ✅ 是 / ❌ 否
- 数据已迁移: ✅ 是 / ❌ 否

### 4️⃣ 浏览器重启测试
- 重启前地址: TRxxx...
- 重启后地址: TRxxx...
- 一致性: ✅ 一致 / ❌ 不一致

### 📝 异常信息（如有）
```
[粘贴 Console 中带 [WanYuAddr] 的所有行]
[粘贴任何错误信息]
```

### ✅ 最终结论
- [ ] 所有测试通过
- [ ] 发现以下问题: ...
```

---

## 🔍 如果发现异常

**关键信息收集**:

1. **Console 错误**
   ```javascript
   // 执行以查看会话状态
   console.log('[WanYuAddr] Session state:', {
     hasRealWallet: !!REAL_WALLET,
     trxAddress: REAL_WALLET?.trx?.address,
     walletKeys: Object.keys(REAL_WALLET || {})
   });
   
   // 查看 localStorage
   console.log('[WanYuAddr] localStorage keys:', Object.keys(localStorage));
   
   // 查看 IndexedDB 状态
   console.log('[WanYuAddr] IDB migrated:', localStorage.getItem('ww_idb_migrated_v1'));
   ```

2. **浏览器控制台完整输出**
   - 右键 → 复制整个 Console 内容
   - 粘贴到报告中

3. **Application 标签页截图**
   - Local Storage 内容
   - IndexedDB 数据库结构

---

## ✅ 成功验证的标志

所有以下条件满足时，验证完成:

1. ✅ 多次刷新后地址始终一致（精确匹配）
2. ✅ localStorage 值在刷新前后保持不变
3. ✅ 4 个关键键都存在：ww_wallet, ww_pin_hash, ww_pin_device_salt_v1, ww_idb_migrated_v1
4. ✅ 浏览器完全重启后地址相同
5. ✅ IndexedDB 中有迁移数据
6. ✅ Console 中无 [WanYuAddr] 开头的错误

---

## 🚀 开始验证

1. 按照上述步骤执行
2. 使用模板收集结果
3. 如有异常，收集关键信息
4. 向我反馈完整结果

**验证完成后，我会基于结果进行下一步诊断或确认系统就绪。**

---

**验证清单生成时间**: 2026-04-08 09:14 UTC+7  
**对应需求**: Requirement 8 - 万语地址一致性验证
