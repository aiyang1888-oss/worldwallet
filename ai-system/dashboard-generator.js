/**
 * Security Dashboard Generator
 * 生成安全看板报告
 */

const fs = require('fs');
const path = require('path');

class DashboardGenerator {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.dashboardFile = path.join(projectRoot, 'SECURITY_DASHBOARD.md');
  }

  /**
   * 生成完整看板
   */
  generateDashboard(scoreData, trendChange, last7Days, scoutResult, trends) {
    const gradeInfo = this.getGradeInfo(scoreData.score);

    let dashboard = `# 🔒 WorldWallet Security Dashboard

**更新时间**: ${new Date().toISOString().split('T')[0]}  
**自动生成**: AI Security Audit System  

---

## 📊 当前安全评分

### ${gradeInfo.emoji} 总体评分

| 指标 | 结果 |
|------|------|
| **评分** | **${scoreData.score}/100** |
| **等级** | **${gradeInfo.grade}** |
| **状态** | **${gradeInfo.description}** |
| **趋势** | **${trendChange.emoji} ${trendChange.trend}** |

---

## 🎯 风险统计

### 当前风险分布

| 优先级 | 数量 | 占比 |
|--------|------|------|
| 🔴 **HIGH** | ${scoreData.high} | ${scoreData.totalIssues > 0 ? ((scoreData.high / scoreData.totalIssues) * 100).toFixed(1) : 0}% |
| 🟡 **MEDIUM** | ${scoreData.medium} | ${scoreData.totalIssues > 0 ? ((scoreData.medium / scoreData.totalIssues) * 100).toFixed(1) : 0}% |
| 🟢 **LOW** | ${scoreData.low} | ${scoreData.totalIssues > 0 ? ((scoreData.low / scoreData.totalIssues) * 100).toFixed(1) : 0}% |
| **总计** | **${scoreData.totalIssues}** | 100% |

### 评分计算公式
\`\`\`
Score = 100 - (HIGH × 20) - (MEDIUM × 10) - (LOW × 5)
\`\`\`

**当前计算**:
\`\`\`
Score = 100 - (${scoreData.high} × 20) - (${scoreData.medium} × 10) - (${scoreData.low} × 5)
Score = 100 - ${scoreData.high * 20} - ${scoreData.medium * 10} - ${scoreData.low * 5}
Score = ${scoreData.score}
\`\`\`

---

## 📈 最近七天趋势

`;

    if (last7Days.length > 0) {
      dashboard += '| 日期 | 评分 | 问题数 | HIGH |\n';
      dashboard += '|------|------|--------|------|\n';
      last7Days.forEach(day => {
        dashboard += `| ${day.date} | ${day.score}/100 | ${day.issues} | ${day.high} |\n`;
      });
    } else {
      dashboard += '暂无历史数据\n';
    }

    dashboard += `
---

## 📋 当前关键问题

`;

    if (scoutResult.bugs_found.length > 0) {
      dashboard += '### 待处理问题列表\n\n';

      // 按优先级分组
      const byPriority = {
        high: scoutResult.bugs_found.filter(b => b.severity === 'high'),
        medium: scoutResult.bugs_found.filter(b => b.severity === 'medium'),
        low: scoutResult.bugs_found.filter(b => b.severity === 'low')
      };

      if (byPriority.high.length > 0) {
        dashboard += '#### 🔴 高优先级 (需立即处理)\n\n';
        byPriority.high.slice(0, 5).forEach((bug, idx) => {
          dashboard += `${idx + 1}. **[${bug.id}]** ${bug.description}\n`;
          dashboard += `   - 位置: \`${bug.file}:${bug.line}\`\n`;
          dashboard += `   - 建议: ${bug.fix_suggestion}\n\n`;
        });
      }

      if (byPriority.medium.length > 0) {
        dashboard += '#### 🟡 中优先级 (需排期处理)\n\n';
        byPriority.medium.slice(0, 5).forEach((bug, idx) => {
          dashboard += `${idx + 1}. **[${bug.id}]** ${bug.description}\n`;
          dashboard += `   - 位置: \`${bug.file}:${bug.line}\`\n\n`;
        });
      }

      if (byPriority.low.length > 0) {
        dashboard += `#### 🟢 低优先级 (共 ${byPriority.low.length} 项)\n\n`;
      }
    } else {
      dashboard += '✅ 暂无问题发现\n';
    }

    dashboard += `
---

## 🎯 行动计划

`;

    if (scoreData.score < 60) {
      dashboard += `### ⚠️ 严重警告 (评分: ${scoreData.score})

需要立即采取行动：
1. 立即处理所有 **HIGH** 优先级问题
2. 开会评估安全风险
3. 制定 72 小时内的修复计划
4. 每日跟踪修复进度
`;
    } else if (scoreData.score < 80) {
      dashboard += `### ⚡ 改进计划 (评分: ${scoreData.score})

建议本周内处理：
1. 优先处理所有 **HIGH** 优先级问题 (目标: 3 天内)
2. 制定 **MEDIUM** 问题的修复时间表
3. 每周跟踪进度
`;
    } else {
      dashboard += `### ✅ 保持状态 (评分: ${scoreData.score})

继续维护：
1. 定期审计 (每日/每周)
2. 及时处理新发现的问题
3. 逐步改进 **MEDIUM/LOW** 问题
`;
    }

    dashboard += `
---

## 📊 历史统计

### 评分变化趋势
\`\`\`
${this.generateSparkline(trends)}
\`\`\`

### 数据点 (最近 10 次)
`;

    const recentTrends = trends.slice(-10);
    if (recentTrends.length > 0) {
      dashboard += '| 时间 | 评分 | HIGH | MED | LOW |\n';
      dashboard += '|------|------|------|-----|-----|\n';
      recentTrends.forEach(t => {
        dashboard += `| ${t.date} | ${t.score} | ${t.high} | ${t.medium} | ${t.low} |\n`;
      });
    }

    dashboard += `
---

## 🔍 评分等级说明

| 等级 | 范围 | 状态 | 说明 |
|------|------|------|------|
| 🟢 A | 90-100 | 优秀 | 安全状况良好，继续维护 |
| 🟡 B | 80-89 | 良好 | 有少量问题，需要排期修复 |
| 🟠 C | 70-79 | 一般 | 存在明显问题，需要加快修复 |
| 🔴 D | 60-69 | 较差 | 安全状况堪忧，需要立即行动 |
| ⚫ F | <60 | 危险 | 严重安全缺陷，立即处理 |

---

## 📌 下一步

1. ✅ 每日审计 (08:00 UTC+7)
2. ✅ 及时创建修复 Issue
3. ✅ 跟踪修复进度
4. ✅ 每周查看最新评分

---

*本看板每次审计后自动更新。最后更新: ${new Date().toLocaleString('en-GB')}*
`;

    return dashboard;
  }

  /**
   * 生成简单的火花线图表
   */
  generateSparkline(trends) {
    if (trends.length === 0) {
      return '暂无数据';
    }

    const scores = trends.slice(-30).map(t => t.score);
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    const range = max - min || 1;

    const sparkChars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
    const sparkline = scores.map(score => {
      const index = Math.round(((score - min) / range) * (sparkChars.length - 1));
      return sparkChars[Math.max(0, Math.min(index, sparkChars.length - 1))];
    }).join('');

    const minScore = Math.round(min);
    const maxScore = Math.round(max);
    const lastScore = Math.round(scores[scores.length - 1]);

    return `最小: ${minScore}  最大: ${maxScore}  当前: ${lastScore}\n${sparkline}`;
  }

  /**
   * 获取评分等级信息
   */
  getGradeInfo(score) {
    if (score >= 90) return { grade: 'A', emoji: '🟢', description: 'Excellent - 优秀' };
    if (score >= 80) return { grade: 'B', emoji: '🟡', description: 'Good - 良好' };
    if (score >= 70) return { grade: 'C', emoji: '🟠', description: 'Fair - 一般' };
    if (score >= 60) return { grade: 'D', emoji: '🔴', description: 'Poor - 较差' };
    return { grade: 'F', emoji: '⚫', description: 'Critical - 危险' };
  }

  /**
   * 保存看板
   */
  saveDashboard(content) {
    fs.writeFileSync(this.dashboardFile, content, 'utf-8');
    return this.dashboardFile;
  }
}

module.exports = DashboardGenerator;
