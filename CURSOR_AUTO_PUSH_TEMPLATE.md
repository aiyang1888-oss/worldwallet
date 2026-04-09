# Cursor 自动推送指令模板 — WorldWallet

## 🎯 目的
让 Cursor 执行任务后自动推送到线上，无需手工操作。

---

## 📋 标准任务指令格式

### 格式 A：功能改进 / Bug 修复

```
任务：[功能描述或 Bug 名称]

需求：
- [具体需求 1]
- [具体需求 2]
- [具体需求 3]

完成标准：
1. 修改代码（assets/ 和 dist/ 保持同步）
2. 在本地浏览器测试确认修复有效
3. 执行命令：
   git add .
   git commit -m "feat/fix: [简短描述]"
4. Hook 自动推送到 GitHub main 分支
5. 汇报：修复内容 + 测试结果

备注：
- 不要手工推送，post-commit hook 会自动处理
- 如果 commit 失败，说明有冲突，需要人工审查
```

### 格式 B：批量任务清单

```
任务清单：[功能集合名称]

子任务列表：
☐ 任务 1：[描述]
☐ 任务 2：[描述]
☐ 任务 3：[描述]

完成标准（每个子任务）：
1. 修改对应文件
2. 测试确认
3. git add . && git commit -m "feat: 任务X"
4. 自动推送

最终：
- 所有子任务都要通过本地测试
- 生成总结报告
```

---

## 🔧 Cursor 需要了解的信息

### 项目路径
```
/Users/daxiang/Desktop/Projects/WorldWallet
```

### 关键目录
```
assets/            # ← 线上发布的文件（Service Worker + HTML + JS）
dist/              # ← 备份（与 assets/ 同步）
wallet-shell/      # ← 源代码（如有）
```

### 文件同步规则
- ✅ 修改 `assets/` 下的文件（优先）
- ✅ 同时更新 `dist/` 同名文件（保持同步）
- ✅ Service Worker 版本号自动更新

### Git 工作流
```bash
# Cursor 只需执行这三行：
cd /Users/daxiang/Desktop/Projects/WorldWallet
git add .
git commit -m "feat/fix: [描述]"
# ← hook 自动执行 git push
```

### 自动推送 Hook
- ✅ 已配置在 `.git/hooks/post-commit`
- ✅ 每次 commit 自动 push 到 origin main
- ✅ 推送成功会显示：`✅ Push successful!`
- ✅ 推送失败会显示：`⚠️ Push failed`

---

## 📊 任务列表（待处理）

### A. 功能完善（高优先级）

#### A1. TRX 达额功能优化
```
任务：优化 TRX 达额判断的市价缓存

需求：
- 确保 _wwLastCgUsd.trx 始终有实时价格
- 定期刷新不丢掉其他币种价格
- 打开交易历史前确保价格完整

文件：
- assets/wallet.ui.js
- assets/wallet.runtime.js
- assets/wallet.tx.js

状态：✅ 已推送（afb67b2）
```

#### A2. USDT ↔ TRX 兑换功能
```
任务：完善 USDT 和 TRX 之间的兑换功能

需求：
- 实现兑换价格计算
- 添加兑换确认对话框
- 兑换成功后更新余额显示

文件：
- assets/wallet.ui.js
- assets/wallet.core.js

待验证：兑换逻辑是否完整
```

#### A3. 万语地址一致性验证
```
任务：确保万语地址在所有页面保持一致

需求：
- 地址修改后全页面同步
- 各页面显示格式一致
- 二维码生成使用最新地址

文件：
- assets/wallet.ui.js
- assets/wallet.dom-bind.js

关键文件：WANYU_MULTILINGUAL_ADDRESS_SYSTEM.md
```

### B. UI 优化（中优先级）

#### B1. 导航栏光标跟随逻辑
```
任务：优化导航栏按钮的光标跟随效果

需求：
- 光标移动时，导航栏按钮背景跟随
- 点击效果清晰
- 在各尺寸设备上都能正常工作

文件：
- assets/wallet.css
- assets/wallet.ui.js
```

#### B2. 资产页面零余额隐藏
```
任务：资产页面中零余额币种自动隐藏

需求：
- 余额为 0 的币种不显示
- 用户可选择"显示零余额"
- 刷新后保留用户选择

文件：
- assets/wallet.ui.js
- assets/wallet.css
```

#### B3. 礼物红包功能美化
```
任务：优化礼物红包功能的 UI

需求：
- 礼物框美化，按钮自适应大小
- 留言输入框优化
- 「已发送」状态清晰显示

文件：
- assets/wallet.ui.js
- assets/wallet.css
```

### C. 功能验证（低优先级）

#### C1. 应用内余额同步
```
任务：确保应用内各页面余额显示一致

需求：
- 首页、资产页、转账页余额同步
- 交易后实时更新所有页面
- 刷新不会丢失余额

文件：
- assets/wallet.ui.js
- assets/wallet.core.js
```

#### C2. BTC 地址格式处理
```
任务：完善 BTC 地址的格式识别和处理

需求：
- 支持 P2PKH、P2SH、P2WPKH 格式
- 地址验证准确
- 显示格式清晰

文件：
- assets/wallet.addr.js
- assets/wallet.ui.js
```

---

## 🚀 推送工作流示例

### 示例 1：单个功能修复

```
【任务】修复导入钱包时的语言选择问题

【需求】
- 导入页面显示正确的语言选择
- 选择语言后能正确生成助记词
- 各语言都能正常导入

【测试】
- Chrome: ✅
- Firefox: ✅ 
- Safari: ✅

【修改文件】
- assets/wallet.ui.js (Line 2450-2500)
- assets/wallet.dom-bind.js (Line 150-180)

【提交】
cd /Users/daxiang/Desktop/Projects/WorldWallet
git add assets/wallet.ui.js assets/wallet.dom-bind.js
git commit -m "fix(import): 修复导入页语言选择问题"

【结果】
✅ 推送成功
✅ 线上 2-5 分钟更新
✅ Service Worker 缓存自动更新
```

### 示例 2：批量 UI 优化

```
【任务清单】资产页面 UI 优化

【子任务】
☐ 优化零余额币种隐藏逻辑
☐ 刷新显示问题修复
☐ 颜色一致性检查

【完成】
cd /Users/daxiang/Desktop/Projects/WorldWallet

# 提交 1：零余额隐藏
git add assets/wallet.ui.js assets/wallet.css
git commit -m "feat(assets): 零余额币种自动隐藏"

# 提交 2：刷新问题
git add assets/wallet.ui.js
git commit -m "fix(assets): 解决刷新后显示问题"

# 提交 3：颜色一致性
git add assets/wallet.css
git commit -m "style(assets): 颜色一致性检查"

【结果】
✅ 3 个 commit 依次推送
✅ 每次都自动 push
✅ GitHub 上有完整历史
```

---

## 📌 重要约定

### ✅ 推送前必须

- [ ] 在本地浏览器测试确认修复有效
- [ ] 没有语法错误（`node --check` 通过）
- [ ] `assets/` 和 `dist/` 文件已同步
- [ ] commit message 清晰描述改动内容

### ❌ 禁止

- ❌ 直接修改线上 GitHub 上的文件
- ❌ 手工执行 `git push`（hook 会自动做）
- ❌ 推送未测试的代码
- ❌ 删除或覆盖他人的 commit

### ⚠️ 冲突处理

如果推送失败（显示冲突）：
1. 告诉我 commit hash
2. 我会检查是否有合并冲突
3. 可能需要 rebase 或 merge 远端版本

---

## 🎯 Cursor 快速检查清单

每次任务前，Cursor 可以用这个检查清单：

```bash
# 1. 确认分支
git branch -a

# 2. 查看待提交的改动
git status

# 3. 看最近的 commit（确认推送了什么）
git log --oneline -5

# 4. 查看当前缓存版本
grep "worldtoken-v" assets/wallet.runtime.js | head -1

# 5. 确认 hook 存在
ls -la .git/hooks/post-commit
```

---

## 📞 troubleshooting

### Q: 为什么推送失败？
**A:** 通常是：
1. 网络连接问题 → 重试
2. GitHub 权限问题 → 检查 token
3. 代码冲突 → 需要人工审查

### Q: 能手工推送吗？
**A:** 可以，但不推荐。Hook 会自动推送，手工推送可能导致重复。

### Q: 怎么看推送历史？
**A:** 
```bash
git log --oneline origin/main -10
```

### Q: 需要合并到其他分支吗？
**A:** 现在不需要。`demo-wallet` 分支独立管理，`main` 是线上版本。

---

**最后更新**: 2026-04-09 11:32 GMT+7  
**状态**: ✅ 生产就绪（Ready for Cursor Auto-Push）
