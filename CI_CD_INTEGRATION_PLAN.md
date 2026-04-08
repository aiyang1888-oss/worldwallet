# 🔄 CI/CD 集成计划

**时间**: 2026-04-08 09:19+  
**目标**: 将安全审计自动化到 GitHub Actions  
**预期**: 每次 PR 自动审计，merge 前必须通过  

---

## 📋 CI/CD 流程设计

### 触发点

```yaml
on:
  pull_request:
    paths:
      - 'wallet-shell/**'
      - 'dist/**'
  push:
    branches:
      - main
      - dev
  schedule:
    - cron: '0 8 * * *'  # 每日 08:00 UTC+7
```

---

## 🔧 工作流配置

### .github/workflows/security-audit.yml

```yaml
name: Security Audit

on:
  pull_request:
    paths:
      - 'wallet-shell/**'
      - 'dist/**'
  push:
    branches: [main, dev]
  schedule:
    - cron: '0 8 * * *'

jobs:
  security-audit:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run Security Audit
        run: |
          node ai-system/orchestrator-ww-v2.js > audit-output.json
      
      - name: Verify Audit Results
        run: |
          node scripts/verify-audit.js audit-output.json
      
      - name: Upload Report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: security-report
          path: |
            SECURITY_DASHBOARD.md
            WORLDWALLET_SECURITY_REPORT.md
            ai-system/reports/*.json
      
      - name: Comment on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('SECURITY_DASHBOARD.md', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '## 🔒 Security Audit Report\n' + report
            });
      
      - name: Slack Notification
        if: failure()
        uses: slackapi/slack-github-action@v1.24.0
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "❌ Security audit failed for PR #${{ github.event.pull_request.number }}",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Security Audit Failed*\nPR: #${{ github.event.pull_request.number }}\nBranch: ${{ github.head_ref }}"
                  }
                }
              ]
            }
```

---

## 📊 审计检查清单

### scripts/verify-audit.js

```javascript
const fs = require('fs');
const path = require('path');

async function verifyAudit(reportPath) {
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  
  // 检查 1: HIGH 问题必须为 0
  const highCount = report.scout.bugs_found.filter(b => b.severity === 'high').length;
  if (highCount > 0) {
    console.error(`❌ FAIL: Found ${highCount} HIGH severity issues`);
    process.exit(1);
  }
  
  // 检查 2: 评分必须 > 60
  const score = report.score?.score || 0;
  if (score < 60) {
    console.error(`❌ FAIL: Security score ${score} < 60 (minimum)`);
    process.exit(1);
  }
  
  // 检查 3: 规则覆盖率必须 > 70%
  const coverage = report.scout.coverage || 0;
  if (coverage < 0.7) {
    console.error(`❌ FAIL: Coverage ${(coverage*100).toFixed(1)}% < 70%`);
    process.exit(1);
  }
  
  // 检查 4: 无新的重复问题
  const repeatIssues = report.scout.bugs_found.filter(b => b.isRepeat);
  if (repeatIssues.length > 0) {
    console.error(`❌ FAIL: ${repeatIssues.length} repeat issues found`);
    process.exit(1);
  }
  
  console.log('✅ All security checks passed');
  console.log(`   HIGH issues: 0`);
  console.log(`   Score: ${score}/100`);
  console.log(`   Coverage: ${(coverage*100).toFixed(1)}%`);
}

verifyAudit(process.argv[2]);
```

---

## 🎯 PR 检查要求

### 保护规则

```yaml
# .github/settings.yml
branch_protection:
  main:
    required_status_checks:
      - security-audit
      - lint
      - test
    required_approvals: 1
    dismiss_stale_reviews: true
    require_code_owner_review: true
```

---

## 📈 构建状态徽章

```markdown
# WorldWallet

[![Security Audit](https://github.com/user/worldwallet/actions/workflows/security-audit.yml/badge.svg)](https://github.com/user/worldwallet/actions/workflows/security-audit.yml)
[![Coverage](https://img.shields.io/badge/coverage-85%25-brightgreen)](...)
[![Score](https://img.shields.io/badge/security%20score-62%2F100-yellow)](...)
```

---

## 🔔 通知渠道

### 1. GitHub PR Comments
- 自动添加安全审计结果
- 阻止 HIGH 问题的 merge

### 2. Slack 集成
```javascript
// 失败时通知
slack_webhook: process.env.SLACK_WEBHOOK_URL
channel: '#security-alerts'
message: `❌ Security audit failed\nBranch: ${branch}\nHIGH issues: ${highCount}`
```

### 3. Email 通知（可选）
```javascript
// 每周总结
recipients: ['security-team@company.com']
subject: 'Weekly Security Report'
```

---

## 📊 仪表板

### GitHub Insights

```
安全趋势
  Week 1: 10 issues → 8 issues (↓ 20%)
  Week 2: 8 issues → 5 issues (↓ 37%)
  Week 3: 5 issues → 3 issues (↓ 40%)

规则覆盖
  Week 1: 60% → 70% → 75% → 80%

评分进展
  Week 1: 40 → 50 → 60 → 62

修复率
  HIGH: 100%
  MEDIUM: 80%
  LOW: 50%
```

---

## 🚀 实现步骤

### Step 1: 创建工作流文件 (1h)
```bash
mkdir -p .github/workflows
touch .github/workflows/security-audit.yml
```

### Step 2: 编写验证脚本 (1.5h)
```bash
mkdir -p scripts
touch scripts/verify-audit.js
```

### Step 3: 配置分支保护 (0.5h)
- GitHub Settings → Branches
- 启用 "Require status checks to pass"
- 选择 "security-audit"

### Step 4: 测试流程 (1h)
- 创建测试 PR
- 验证审计自动运行
- 验证结果正确显示

### Step 5: Slack 集成 (0.5h)
- 创建 Slack Webhook
- 配置环境变量
- 测试通知

---

## ⏱️ 总工时

| 步骤 | 时间 |
|------|------|
| 工作流创建 | 1h |
| 验证脚本 | 1.5h |
| 分支保护 | 0.5h |
| 测试验证 | 1h |
| Slack 集成 | 0.5h |
| **总计** | **4.5h** |

---

## 🎯 成功标准

- [ ] 每个 PR 自动运行审计
- [ ] HIGH 问题阻止 merge
- [ ] 报告自动生成在 PR comments
- [ ] 失败时 Slack 通知
- [ ] 构建徽章正确显示

---

**CI/CD 集成计划完成**。
