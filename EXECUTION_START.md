# 🚀 立即开始执行 - 功能验证 (4月8日)

**当前时间**: 2026-04-08 09:23 UTC+7  
**启动模式**: 功能验证测试  
**预期用时**: 4-6 小时 (P0 必须通过)  

---

## ✅ 已准备好的工具

- ✅ 自动化测试运行器 (`test-runner.js`)
- ✅ 13 个测试用例 (P0/P1/P2)
- ✅ 测试报告生成系统
- ✅ 浏览器打开并加载钱包

---

## 🎯 今天的任务

### 任务 1: P0 功能验证 (CRITICAL - 必须全部通过)

**时间**: 2-3 小时  
**目标**: 6 个 P0 测试 100% 通过

#### P0-001: PIN 与钱包解锁

**步骤**:
```
1. 钱包页面已打开
2. 点击 "创建钱包" 或 "导入钱包"
3. 输入 PIN (例: 123456)
4. 验证以下:
   ✓ REAL_WALLET 加载成功
   ✓ 三个地址显示 (ETH, TRX, BTC)
   ✓ Console 无红色错误
```

**Console 验证**:
```javascript
console.log('[P0-001] REAL_WALLET loaded:', !!REAL_WALLET);
console.log('[P0-001] ETH address:', REAL_WALLET?.ethAddress);
console.log('[P0-001] TRX address:', REAL_WALLET?.trxAddress);
console.log('[P0-001] BTC address:', REAL_WALLET?.btcAddress);
```

**预期结果**:
```
[P0-001] REAL_WALLET loaded: true
[P0-001] ETH address: 0x...
[P0-001] TRX address: T...
[P0-001] BTC address: 1... or 3... or bc1...
```

**通过标准**: ✅ 所有地址都正确显示

---

#### P0-002: 万语地址一致性 (需求 8 验证)

**步骤**:
```
1. 钱包已解锁
2. 记录初始 TRX 地址
3. 执行以下命令记录初始地址
4. 刷新页面 (Ctrl+R) 5 次
5. 每次刷新后检查地址
6. 完全退出浏览器，重新打开
7. 验证地址仍相同
```

**Console 命令** (复制粘贴):
```javascript
// 初始地址
const initialAddr = REAL_WALLET?.trx?.address;
console.log('[P0-002] Initial TRX:', initialAddr);

// localStorage 快照
console.log('[P0-002] localStorage:', {
  ww_wallet: localStorage.getItem('ww_wallet')?.substring(0, 50),
  ww_pin_hash: localStorage.getItem('ww_pin_hash')?.substring(0, 50),
  ww_idb_migrated: localStorage.getItem('ww_idb_migrated_v1')
});

// 每次刷新后执行:
console.log('[P0-002] After refresh:', REAL_WALLET?.trx?.address === initialAddr);
```

**验证清单**:
- [ ] 初始地址: ___________________________
- [ ] 刷新 1: 地址相同 ✓
- [ ] 刷新 2: 地址相同 ✓
- [ ] 刷新 3: 地址相同 ✓
- [ ] 刷新 4: 地址相同 ✓
- [ ] 刷新 5: 地址相同 ✓
- [ ] 浏览器重启后: 地址相同 ✓

**通过标准**: ✅ 5 次刷新 + 重启后地址 100% 相同

---

#### P0-003: 会话私钥加密

**步骤**:
```
1. 钱包已解锁
2. 执行以下 Console 命令
3. 验证私钥被加密（不在明文中）
4. 验证会话加密函数被调用
```

**Console 命令**:
```javascript
// 检查私钥是否被加密
console.log('[P0-003] ETH privateKey:', REAL_WALLET?.eth?.privateKey);
console.log('[P0-003] Should be undefined (encrypted):', 
  REAL_WALLET?.eth?.privateKey === undefined);

// 验证会话加密状态
console.log('[P0-003] Session sealed:', {
  hasSessionKey: typeof _wwSessionKey !== 'undefined',
  hasSealedData: typeof _wwSealedData !== 'undefined'
});
```

**预期结果**:
```
[P0-003] ETH privateKey: undefined
[P0-003] Should be undefined: true
```

**通过标准**: ✅ 私钥为 undefined（已被加密）

---

#### P0-004: Base64 错误处理

**步骤**:
```
1. 打开 DevTools Application 标签
2. 进入 Local Storage
3. 找到 ww_wallet 键
4. 修改其值，破坏 base64 格式（删除几个字符）
5. 刷新页面
6. 验证错误提示和应用不崩溃
```

**预期结果**:
```
- Console 显示清晰的错误: "Invalid Base64 data"
- UI 显示用户友好的提示: "钱包数据损坏，请恢复备份"
- 应用继续运行，不崩溃
```

**通过标准**: ✅ 错误被正确处理，应用不崩溃

**恢复步骤**:
```
1. 清除 Local Storage: localStorage.clear()
2. 或删除 ww_wallet 键
3. 刷新页面，恢复正常
```

---

#### P0-005: PIN 哈希升级

**步骤** (如果有旧钱包):
```
1. 如果有旧钱包（使用硬编码盐），输入旧 PIN
2. 钱包应正常解锁（兼容旧哈希）
3. 验证新的 device salt 被创建
4. 验证 PIN 哈希被更新为新格式
5. 再次输入 PIN 应使用新格式
```

**Console 命令**:
```javascript
// 检查新盐是否存在
console.log('[P0-005] Device salt created:', 
  !!localStorage.getItem('ww_pin_device_salt_v1'));

// 检查盐的格式
const salt = localStorage.getItem('ww_pin_device_salt_v1');
console.log('[P0-005] Salt (first 50 chars):', salt?.substring(0, 50));
```

**通过标准**: ✅ 新盐存在，PIN 哈希自动升级

---

#### P0-006: IndexedDB 迁移

**步骤**:
```
1. 打开 DevTools Application 标签
2. 进入 IndexedDB
3. 验证数据库和数据存在
4. 查看 localStorage 中的迁移标记
5. 修改钱包设置并保存
6. 验证 IndexedDB 和 localStorage 同时更新
```

**Console 命令**:
```javascript
// 检查迁移标记
console.log('[P0-006] IDB migrated:', 
  localStorage.getItem('ww_idb_migrated_v1') === 'true');

// 打印 localStorage 中的关键数据
console.log('[P0-006] Storage keys:', {
  ww_wallet: !!localStorage.getItem('ww_wallet'),
  ww_pin_hash: !!localStorage.getItem('ww_pin_hash'),
  ww_pin_device_salt_v1: !!localStorage.getItem('ww_pin_device_salt_v1'),
  ww_idb_migrated_v1: !!localStorage.getItem('ww_idb_migrated_v1')
});
```

**验证 IndexedDB** (DevTools):
```
1. Application → IndexedDB
2. 应该有数据库（通常是网站名）
3. 其中包含表: ww_wallet, ww_pin_hash 等
4. 数据应与 localStorage 一致
```

**通过标准**: ✅ 迁移标记存在，IDB 有数据

---

## 📊 测试结果记录

### P0 测试结果

```
P0-001: PIN 与钱包解锁
  结果: [ ] 通过 [ ] 失败
  备注: ___________________________

P0-002: 万语地址一致性  
  结果: [ ] 通过 [ ] 失败
  初始地址: _________________________
  备注: ___________________________

P0-003: 会话私钥加密
  结果: [ ] 通过 [ ] 失败
  私钥状态: [ ] undefined [ ] 明文
  备注: ___________________________

P0-004: Base64 错误处理
  结果: [ ] 通过 [ ] 失败
  错误消息: ___________________________
  应用状态: [ ] 正常运行 [ ] 崩溃
  备注: ___________________________

P0-005: PIN 哈希升级
  结果: [ ] 通过 [ ] 失败
  新盐存在: [ ] 是 [ ] 否
  备注: ___________________________

P0-006: IndexedDB 迁移
  结果: [ ] 通过 [ ] 失败
  迁移标记: [ ] 存在 [ ] 不存在
  IDB 数据: [ ] 有数据 [ ] 无数据
  备注: ___________________________
```

---

## 🎯 P0 通过标准

**必须全部通过**:
- [ ] P0-001: ✅ 钱包完全加载
- [ ] P0-002: ✅ 地址 100% 一致
- [ ] P0-003: ✅ 私钥被加密
- [ ] P0-004: ✅ 错误被处理
- [ ] P0-005: ✅ PIN 哈希升级
- [ ] P0-006: ✅ IDB 迁移完成

**如果有失败**: 
```
1. 记录失败详情
2. 检查 Console 错误
3. 联系技术支持
4. 修复代码
5. 重新测试
```

---

## ⏭️ 完成 P0 后

一旦 **所有 P0 测试通过**:

1. ✅ 立即进行 P1 集成测试
2. ✅ 并行开始性能优化
3. ✅ 周末完成所有 Week 1 工作

---

## 📞 需要帮助?

**常见问题**:
- Q: 找不到 ww_wallet 键？
  A: localStorage 可能被清空，创建新钱包

- Q: Console 有错误？
  A: 截图并记录完整错误信息

- Q: 地址不一致？
  A: 检查 localStorage 是否被清除

- Q: Base64 解析失败？
  A: 这是正常的，应该显示错误提示

---

## 🚀 开始执行

**现在开始**:

```bash
# 1. Chrome 已打开 wallet.html
# 2. 按 P0-001 步骤开始
# 3. 完成后记录结果
# 4. 执行下一个 P0 测试
# 5. 所有 P0 通过后，进行 P1 测试

# 生成最终报告
node test-runner.js --report
```

---

**准备好了吗？立即开始！** 🎯

---

*时间: 2026-04-08 09:23 UTC+7*
*项目: WorldWallet*
*阶段: 功能验证执行*
