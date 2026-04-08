# 🤖 Demo-Wallet: AI Auto-Dev 系统验证项目

## 概述

这是一个最小化的 Node.js 钱包项目，用来验证**本地 AI 自动开发系统**的完整闭环能力。

## 项目结构

```
demo-wallet/
├── ai-orchestrator.js        # 主控系统：5 阶段流程
├── src/
│   └── index.js              # 钱包实现（包含故意的 bug）
├── tests/
│   └── wallet.test.js        # 单元测试
├── ai-tasks/                 # AI 任务输出（JSON 格式）
│   ├── scout-result.json
│   ├── reviewer-result.json
│   ├── dev-result-TASK-001.json
│   ├── test-result-TASK-001.json
│   └── commit-result-TASK-001.json
├── logs/
│   └── execution-2026-04-08.json  # 完整执行日志
├── package.json
├── .eslintrc.json
└── jest.config.js
```

## 完整闭环流程

### 1️⃣ **Scout AI** — 代码扫描
- 检查 `src/index.js` 中的代码
- 运行测试看哪些失败
- 输出：`scout-result.json`
  - 发现：`addBalance()` 没有验证 `amount > 0`

### 2️⃣ **Reviewer AI** — 任务审核
- 验证 bug 是否真实存在
- 检查修复建议是否合理
- 确认测试覆盖
- 输出：`reviewer-result.json`
  - 结论：APPROVED（批准 TASK-001）

### 3️⃣ **Dev AI** — 代码修改
- 创建独立分支：`ai/task-001`
- 修改源代码：添加 validation
- 生成 commit message
- 输出：`dev-result-TASK-001.json`

### 4️⃣ **Test AI** — 自动测试
- 运行 `npm run lint`（无错误）
- 运行 `npm run test`（7/7 通过 ✅）
- 输出：`test-result-TASK-001.json`

### 5️⃣ **提交 & 合并**
- 提交到任务分支：`git commit`
- 合并到 dev：`git merge --no-ff`
- 输出：`commit-result-TASK-001.json`

## 运行闭环

```bash
cd /Users/daxiang/demo-wallet
npm install
node ai-orchestrator.js
```

## 输出日志查看

```bash
# 查看 Scout 结果
cat ai-tasks/scout-result.json

# 查看最终执行日志
cat logs/execution-2026-04-08.json

# 查看 git 提交历史
git log --oneline -10
```

## 验证完成闭环的 4 个指标

✅ **1. Bug 发现**
- Scout AI 发现 `addBalance()` 缺少验证

✅ **2. 任务审核**
- Reviewer AI 确认问题有效、优先级正确

✅ **3. 代码修改**
- Dev AI 添加 `if (amount <= 0) throw Error(...)`

✅ **4. 测试通过**
- 所有 7 个单元测试通过
- Lint 检查通过
- 自动提交到 git

## 关键特性

### 串行调度（不并行）
```
Scout → Reviewer → Dev → Test → Commit → Logs
```

### JSON 文件交互
- 无直接函数调用
- 每个 AI 读取上一阶段的 JSON 输出
- 所有结果结构化存储

### Git 工作流
- 每个任务独立分支：`ai/task-001`
- 完成后合并到 `dev`
- 支持 rollback（失败时回滚）

### 自动化测试
- Lint 检查
- Jest 单元测试
- Build 脚本（预留）

## 下一步（真实项目迁移）

当验证完整闭环后，可以：
1. 将系统应用到 WorldWallet 项目
2. 扩展 Scout AI 增加更多规则检查
3. 集成 GitHub API 进行 PR 管理
4. 添加更复杂的审核逻辑（安全性、性能等）
5. 支持并行任务调度（带 module-locks）

## 架构设计原则

| 特性 | 设计理由 |
|------|--------|
| **JSON 交互** | 清晰的接口，便于日志和审计 |
| **串行调度** | 简单可靠，避免竞态条件 |
| **独立分支** | 安全的回滚和审查机制 |
| **自动测试** | 防止低质量代码进入 dev |
| **完整日志** | 便于调试和问题追溯 |

---

**状态**: ✅ 第一阶段完成 — 单项目完整闭环验证

**下一阶段**: 多项目支持 + 并行调度 + 审核面板
