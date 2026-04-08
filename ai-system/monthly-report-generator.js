#!/usr/bin/env node

/**
 * 月度安全报告生成器
 * 运行: node monthly-report-generator.js [YYYY-MM]
 * 
 * 生成:
 * - Markdown 报告
 * - JSON 数据
 * - Slack 通知
 */

const fs = require('fs');
const path = require('path');

class MonthlyReportGenerator {
  constructor(yearMonth = null) {
    const today = new Date();
    if (yearMonth) {
      const [year, month] = yearMonth.split('-');
      this.year = parseInt(year);
      this.month = parseInt(month);
    } else {
      this.year = today.getFullYear();
      this.month = today.getMonth();  // 0-indexed
    }
    
    this.monthStr = String(this.month + 1).padStart(2, '0');
    this.yearStr = String(this.year);
  }

  /**
   * 收集审计指标
   */
  collectMetrics() {
    // 这些是示例数据，实际应从审计日志收集
    const metrics = {
      period: `${this.yearStr}-${this.monthStr}`,
      generated_at: new Date().toISOString(),
      
      // 审计统计
      audits: {
        total_runs: 30,
        automated: 28,
        manual: 2,
        success_rate: 93.3
      },
      
      // 问题统计
      issues: {
        found: {
          high: 3,
          medium: 5,
          low: 8
        },
        fixed: {
          high: 3,
          medium: 4,
          low: 6
        },
        pending: {
          high: 0,
          medium: 1,
          low: 2
        }
      },
      
      // 性能指标
      performance: {
        avg_scan_time_ms: 1850,
        prev_month_ms: 2500,
        improvement_percent: 26,
        cache_hit_rate: 85.5
      },
      
      // 规则覆盖
      rules: {
        total: 6,
        coverage_percent: 75,
        target: 85,
        new_this_month: 3
      },
      
      // 安全评分
      score: {
        current: 62,
        previous_month: 40,
        improvement: 22
      },
      
      // 模块健康度
      modules: [
        { name: 'security.js', issues: 0, health: 'green' },
        { name: 'wallet.core.js', issues: 1, health: 'yellow' },
        { name: 'wallet.tx.js', issues: 0, health: 'green' },
        { name: 'wallet.runtime.js', issues: 0, health: 'green' }
      ]
    };
    
    return metrics;
  }

  /**
   * 生成 Markdown 报告
   */
  generateMarkdown(metrics) {
    let md = `# 🔒 WorldWallet ${this.yearStr}-${this.monthStr} 安全审计报告\n\n`;
    
    md += `**生成时间**: ${new Date().toISOString()}\n`;
    md += `**审计周期**: ${this.yearStr}-${this.monthStr}\n\n`;
    
    // 执行摘要
    md += `## 📊 执行摘要\n\n`;
    md += `| 指标 | 值 |\n`;
    md += `|------|-----|\n`;
    md += `| 审计运行 | ${metrics.audits.total_runs} 次 |\n`;
    md += `| 发现问题 | ${metrics.issues.found.high + metrics.issues.found.medium + metrics.issues.found.low} 个 |\n`;
    md += `| 已修复 | ${metrics.issues.fixed.high + metrics.issues.fixed.medium + metrics.issues.fixed.low} 个 |\n`;
    md += `| 修复率 | ${((metrics.issues.fixed.high + metrics.issues.fixed.medium + metrics.issues.fixed.low) / (metrics.issues.found.high + metrics.issues.found.medium + metrics.issues.found.low) * 100).toFixed(1)}% |\n`;
    md += `| 安全评分 | ${metrics.score.current}/100 (↑ ${metrics.score.improvement}) |\n`;
    md += `| 规则覆盖 | ${metrics.rules.coverage_percent}% (目标: ${metrics.rules.target}%) |\n\n`;
    
    // 问题统计
    md += `## 🎯 问题统计\n\n`;
    md += `### 按优先级\n`;
    md += `| 级别 | 发现 | 已修 | 待修 |\n`;
    md += `|------|------|------|------|\n`;
    md += `| 🔴 HIGH | ${metrics.issues.found.high} | ${metrics.issues.fixed.high} | ${metrics.issues.pending.high} |\n`;
    md += `| 🟡 MEDIUM | ${metrics.issues.found.medium} | ${metrics.issues.fixed.medium} | ${metrics.issues.pending.medium} |\n`;
    md += `| 🟢 LOW | ${metrics.issues.found.low} | ${metrics.issues.fixed.low} | ${metrics.issues.pending.low} |\n\n`;
    
    // 性能指标
    md += `## ⚡ 性能指标\n\n`;
    md += `| 指标 | 值 |\n`;
    md += `|------|-----|\n`;
    md += `| 平均扫描时间 | ${metrics.performance.avg_scan_time_ms}ms |\n`;
    md += `| 上月对比 | ${metrics.performance.prev_month_ms}ms |\n`;
    md += `| 性能改进 | ⬇️ ${metrics.performance.improvement_percent}% |\n`;
    md += `| 缓存命中率 | ${metrics.performance.cache_hit_rate}% |\n\n`;
    
    // 规则覆盖
    md += `## 📚 规则库\n\n`;
    md += `| 指标 | 值 |\n`;
    md += `|------|-----|\n`;
    md += `| 总规则数 | ${metrics.rules.total} |\n`;
    md += `| 本月新增 | ${metrics.rules.new_this_month} |\n`;
    md += `| 覆盖率 | ${metrics.rules.coverage_percent}% |\n`;
    md += `| 目标覆盖 | ${metrics.rules.target}% |\n\n`;
    
    // 模块健康度
    md += `## 🏥 模块健康度\n\n`;
    metrics.modules.forEach(mod => {
      const health = mod.health === 'green' ? '🟢' : '🟡';
      md += `- ${health} ${mod.name}: ${mod.issues} 个问题\n`;
    });
    md += '\n';
    
    // 建议
    md += `## 💡 建议\n\n`;
    md += `1. **继续扩展规则库**: 目前覆盖率 ${metrics.rules.coverage_percent}%，目标 ${metrics.rules.target}%\n`;
    md += `2. **优化性能**: 扫描时间已改进 ${metrics.performance.improvement_percent}%，继续优化\n`;
    md += `3. **处理待修问题**: 有 ${metrics.issues.pending.medium + metrics.issues.pending.low} 个待修问题，建议在下月优先处理\n`;
    md += `4. **自动化审计**: 已有 ${metrics.audits.automated} 次自动审计，继续保持\n\n`;
    
    // 下月计划
    md += `## 🚀 下月计划\n\n`;
    md += `- [ ] 将规则覆盖率提升至 ${metrics.rules.target}%\n`;
    md += `- [ ] 修复所有 MEDIUM 级别问题\n`;
    md += `- [ ] 进一步优化扫描性能\n`;
    md += `- [ ] 集成 CI/CD 自动审计\n`;
    md += `- [ ] 部署周期化报告系统\n\n`;
    
    return md;
  }

  /**
   * 生成 JSON 报告
   */
  generateJSON(metrics) {
    return JSON.stringify(metrics, null, 2);
  }

  /**
   * 生成 Slack 消息
   */
  generateSlackMessage(metrics) {
    const fixRate = (
      (metrics.issues.fixed.high + metrics.issues.fixed.medium + metrics.issues.fixed.low) / 
      (metrics.issues.found.high + metrics.issues.found.medium + metrics.issues.found.low) * 100
    ).toFixed(1);
    
    return {
      text: `🔒 ${this.yearStr}-${this.monthStr} 安全审计报告`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `📊 ${this.yearStr}-${this.monthStr} 安全审计报告`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*评分*: ${metrics.score.current}/100 (↑ ${metrics.score.improvement})\n*修复率*: ${fixRate}%\n*规则覆盖*: ${metrics.rules.coverage_percent}% (目标: ${metrics.rules.target}%)`
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*发现问题*\n🔴 HIGH: ${metrics.issues.found.high}\n🟡 MEDIUM: ${metrics.issues.found.medium}\n🟢 LOW: ${metrics.issues.found.low}`
            },
            {
              type: 'mrkdwn',
              text: `*已修复问题*\n🔴 HIGH: ${metrics.issues.fixed.high}\n🟡 MEDIUM: ${metrics.issues.fixed.medium}\n🟢 LOW: ${metrics.issues.fixed.low}`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*性能改进*: ⚡ -${metrics.performance.improvement_percent}%\n*缓存命中率*: 📈 ${metrics.performance.cache_hit_rate}%`
          }
        }
      ]
    };
  }

  /**
   * 生成报告
   */
  async generate() {
    console.log(`📊 生成 ${this.yearStr}-${this.monthStr} 月度报告...\n`);
    
    // 收集指标
    const metrics = this.collectMetrics();
    
    // 生成报告
    const markdown = this.generateMarkdown(metrics);
    const json = this.generateJSON(metrics);
    const slack = this.generateSlackMessage(metrics);
    
    // 保存文件
    const reportDir = path.join(__dirname, 'reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const mdPath = path.join(reportDir, `${this.yearStr}-${this.monthStr}-report.md`);
    const jsonPath = path.join(reportDir, `${this.yearStr}-${this.monthStr}-report.json`);
    const slackPath = path.join(reportDir, `${this.yearStr}-${this.monthStr}-slack.json`);
    
    fs.writeFileSync(mdPath, markdown);
    fs.writeFileSync(jsonPath, json);
    fs.writeFileSync(slackPath, JSON.stringify(slack, null, 2));
    
    console.log(`✅ 报告已生成:\n`);
    console.log(`  Markdown: ${mdPath}`);
    console.log(`  JSON: ${jsonPath}`);
    console.log(`  Slack: ${slackPath}\n`);
    
    // 显示摘要
    console.log(`📈 月度摘要:\n`);
    console.log(`  安全评分: ${metrics.score.current}/100 (↑ ${metrics.score.improvement})`);
    const fixedTotal =
      metrics.issues.fixed.high + metrics.issues.fixed.medium + metrics.issues.fixed.low;
    const foundTotal =
      metrics.issues.found.high + metrics.issues.found.medium + metrics.issues.found.low;
    const fixRatePct =
      foundTotal > 0 ? ((fixedTotal / foundTotal) * 100).toFixed(1) : '0.0';
    console.log(`  修复率: ${fixRatePct}%`);
    console.log(`  规则覆盖: ${metrics.rules.coverage_percent}% (目标: ${metrics.rules.target}%)`);
    console.log(`  性能改进: -${metrics.performance.improvement_percent}%\n`);
    
    return { markdown, json, slack };
  }
}

// 主函数
async function main() {
  const yearMonth = process.argv[2];
  const generator = new MonthlyReportGenerator(yearMonth);
  await generator.generate();
}

main().catch(console.error);
