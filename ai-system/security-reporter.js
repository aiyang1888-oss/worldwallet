/**
 * Security Reporter
 * 生成结构化安全审计报告（Markdown + JSON）
 */

const fs = require('fs');
const path = require('path');

class SecurityReporter {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.reportDir = path.join(projectRoot, 'ai-system/reports');
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  /**
   * 生成 Markdown 报告
   */
  generateMarkdownReport(scoutResult, reviewerResult) {
    const timestamp = new Date().toISOString();
    const bugsCount = scoutResult.bugs_found.length;

    let markdown = `# WorldWallet Security Audit Report

**生成时间**: ${timestamp}  
**扫描模块**: dist/core/security.js  
**扫描工具**: AI Security Scout  
**报告版本**: 1.0

---

## 📊 执行摘要

| 指标 | 值 |
|------|-----|
| 发现问题数 | **${bugsCount}** |
| 高危问题 | **${scoutResult.bugs_found.filter(b => b.severity === 'high').length}** |
| 中危问题 | **${scoutResult.bugs_found.filter(b => b.severity === 'medium').length}** |
| 低危问题 | **${scoutResult.bugs_found.filter(b => b.severity === 'low').length}** |
| 审核结论 | **${reviewerResult.approved ? '✅ 通过' : '❌ 未通过'}** |
| 建议行动 | **立即修复** |

---

## 🔴 发现的安全问题

`;

    scoutResult.bugs_found.forEach((bug, idx) => {
      const severityEmoji = {
        'high': '🔴',
        'medium': '🟡',
        'low': '🟢'
      }[bug.severity] || '⚪';

      markdown += `
### ${idx + 1}. ${severityEmoji} ${bug.id} - ${bug.description}

**优先级**: ${bug.severity.toUpperCase()}  
**文件**: \`${bug.file}\`  
**行号**: ${bug.line}  
**代码片段**:
\`\`\`javascript
${bug.code_snippet}
\`\`\`

**问题说明**:
${bug.description}

**修复建议**:
${bug.fix_suggestion}

**影响范围**:
- 可能导致应用程序在处理无效数据时崩溃
- 缺少错误边界处理
- 生产环境中可能成为安全隐患

---
`;
    });

    markdown += `
## 📋 修复建议优先级

### 立即修复 (P0)
\`\`\`
- SECURITY-002 x3: atob() 错误处理缺失
  风险: 未验证的 base64 数据可导致运行时错误
  工作量: 低（添加 try-catch）
  测试工作量: 低
\`\`\`

### 后续跟进 (P1)
\`\`\`
- 添加输入验证
- 实现错误日志记录
- 添加相关单元测试
\`\`\`

---

## 🛠️ 修复步骤示例

### 问题示例（Line 54）
\`\`\`javascript
// ❌ 当前（不安全）
var salt = Uint8Array.from(atob(bundle.salt), function(c) { return c.charCodeAt(0); });

// ✅ 修复后（安全）
var salt;
try {
  salt = Uint8Array.from(atob(bundle.salt), function(c) { return c.charCodeAt(0); });
} catch (e) {
  console.error('Invalid base64 in salt:', e.message);
  throw new Error('Invalid salt format');
}
\`\`\`

### 测试用例
\`\`\`javascript
// 应该能处理无效的 base64
test('should handle invalid base64 in salt', () => {
  const bundle = { salt: '!!!invalid!!!' }; // 非法 base64
  expect(() => decryptSensitive(bundle)).toThrow('Invalid salt format');
});
\`\`\`

---

## 📈 后续行动计划

1. **立即行动** (本周内)
   - [ ] 代码评审（确认问题）
   - [ ] 创建修复分支
   - [ ] 实现修复（3 处）
   - [ ] 添加测试用例

2. **短期行动** (1-2 周)
   - [ ] 部署修复到测试环境
   - [ ] 安全测试
   - [ ] 代码审查
   - [ ] 合并到主分支

3. **长期行动** (持续)
   - [ ] 定期运行安全审计
   - [ ] 扩展 scout 规则
   - [ ] 集成 CI/CD 流程

---

## 📞 联系方式

**审计工具**: AI Security Scout  
**报告生成**: ${timestamp}  
**下一次审计**: 建议在代码修复完成后运行

---

*本报告由自动化安全审计系统生成。请由有资格的安全人员进行最终审查。*
`;

    return markdown;
  }

  /**
   * 生成 JSON 报告
   */
  generateJsonReport(scoutResult, reviewerResult) {
    return {
      metadata: {
        timestamp: new Date().toISOString(),
        project: 'WorldWallet',
        target_module: 'dist/core/security.js',
        tool: 'AI Security Scout v1.0',
        report_version: '1.0'
      },
      summary: {
        total_issues: scoutResult.bugs_found.length,
        high_severity: scoutResult.bugs_found.filter(b => b.severity === 'high').length,
        medium_severity: scoutResult.bugs_found.filter(b => b.severity === 'medium').length,
        low_severity: scoutResult.bugs_found.filter(b => b.severity === 'low').length,
        approved: reviewerResult.approved,
        action_required: scoutResult.bugs_found.length > 0
      },
      issues: scoutResult.bugs_found.map((bug, idx) => ({
        issue_id: `${idx + 1}`,
        bug_id: bug.id,
        severity: bug.severity,
        file: bug.file,
        line: bug.line,
        description: bug.description,
        code_snippet: bug.code_snippet,
        test_failure: bug.test_failure,
        fix_suggestion: bug.fix_suggestion,
        impact: {
          runtime_safety: true,
          data_integrity: false,
          security: false,
          availability: true
        }
      })),
      remediation: {
        priority: 'High',
        estimated_effort: 'Low',
        estimated_time_hours: 1,
        recommended_timeline: 'This week'
      },
      reviewer_assessment: reviewerResult
    };
  }

  /**
   * 保存报告到文件
   */
  saveReports(scoutResult, reviewerResult) {
    const timestamp = new Date().toISOString().split('T')[0];
    const markdownReport = this.generateMarkdownReport(scoutResult, reviewerResult);
    const jsonReport = this.generateJsonReport(scoutResult, reviewerResult);

    // 保存 Markdown 报告
    const mdFile = path.join(this.projectRoot, 'WORLDWALLET_SECURITY_REPORT.md');
    fs.writeFileSync(mdFile, markdownReport, 'utf-8');
    console.log(`✅ Markdown 报告: ${mdFile}`);

    // 保存 JSON 报告
    const jsonFile = path.join(this.reportDir, `security-report-${timestamp}.json`);
    fs.writeFileSync(jsonFile, JSON.stringify(jsonReport, null, 2), 'utf-8');
    console.log(`✅ JSON 报告: ${jsonFile}`);

    // 保存最新报告链接
    const latestFile = path.join(this.reportDir, 'latest.json');
    fs.writeFileSync(latestFile, JSON.stringify({
      latest_report: jsonFile,
      markdown_report: mdFile,
      timestamp: new Date().toISOString()
    }, null, 2), 'utf-8');

    return {
      markdown: mdFile,
      json: jsonFile
    };
  }

  /**
   * 生成报告摘要（终端输出）
   */
  printSummary(scoutResult, reviewerResult) {
    console.log('\n📊 安全审计摘要');
    console.log('================================\n');

    console.log(`✅ 发现问题: ${scoutResult.bugs_found.length} 个`);
    console.log(`   - 🔴 高危: ${scoutResult.bugs_found.filter(b => b.severity === 'high').length}`);
    console.log(`   - 🟡 中危: ${scoutResult.bugs_found.filter(b => b.severity === 'medium').length}`);
    console.log(`   - 🟢 低危: ${scoutResult.bugs_found.filter(b => b.severity === 'low').length}\n`);

    console.log(`📋 审核结论: ${reviewerResult.approved ? '✅ 通过 - 建议立即修复' : '❌ 未通过'}\n`);

    console.log('📌 问题清单:');
    scoutResult.bugs_found.forEach((bug, idx) => {
      const emoji = {
        'high': '🔴',
        'medium': '🟡',
        'low': '🟢'
      }[bug.severity] || '⚪';

      console.log(`   ${idx + 1}. ${emoji} [${bug.line}] ${bug.description}`);
    });

    console.log('\n📝 文件生成:');
    console.log(`   - Markdown: WORLDWALLET_SECURITY_REPORT.md`);
    console.log(`   - JSON: ai-system/reports/security-report-*.json`);
  }
}

module.exports = SecurityReporter;
