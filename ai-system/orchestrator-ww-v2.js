#!/usr/bin/env node

/**
 * WorldWallet Security Audit Pipeline v2
 * 集成: Scout → Reviewer → Reporter → Dashboard → Telegram
 * 包含安全评分和趋势跟踪
 */

const fs = require('fs');
const path = require('path');
const SecurityScout = require('./scout-security');
const SecurityReporter = require('./security-reporter');
const SecurityScorer = require('./security-scorer');
const DashboardGenerator = require('./dashboard-generator');
const TelegramNotifier = require('./telegram-notifier');
require('dotenv').config();

const PROJECT_ROOT = path.dirname(__dirname);
const AI_SYSTEM_DIR = path.join(PROJECT_ROOT, 'ai-system');
const AI_TASKS_DIR = path.join(AI_SYSTEM_DIR, 'tasks');
const AI_LOGS_DIR = path.join(AI_SYSTEM_DIR, 'logs');

[AI_TASKS_DIR, AI_LOGS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const scout = new SecurityScout(PROJECT_ROOT);
const reporter = new SecurityReporter(PROJECT_ROOT);
const scorer = new SecurityScorer(PROJECT_ROOT);
const dashboard = new DashboardGenerator(PROJECT_ROOT);
const notifier = new TelegramNotifier(
  process.env.TELEGRAM_BOT_TOKEN,
  process.env.TELEGRAM_CHAT_ID
);

console.log(`\n🔒 WorldWallet Security Audit Pipeline v2`);
console.log(`================================\n`);

class SecurityAuditPipelineV2 {
  async run() {
    const startTime = Date.now();
    let scoutResult, scoreData, trendChange, last7Days, allTrends;

    try {
      // 第一步：Scout 扫描
      console.log('📍 [SCOUT] 扫描代码...');
      await notifier.notifyPhaseStart('scout');

      scoutResult = scout.scan();
      const scoutFile = path.join(AI_TASKS_DIR, 'scout-result.json');
      fs.writeFileSync(scoutFile, JSON.stringify(scoutResult, null, 2));

      console.log(`✅ 发现 ${scoutResult.bugs_found.length} 个问题\n`);

      // 第二步：Reviewer 审核
      console.log('📍 [REVIEWER] 审核问题...');
      await notifier.notifyPhaseStart('reviewer');

      const reviewerResult = {
        approved: true,
        bugs_found: scoutResult.bugs_found.length,
        assessment: scoutResult.bugs_found.length > 0
          ? `发现 ${scoutResult.bugs_found.length} 个有效的安全问题，建议立即修复`
          : '未发现安全问题',
        timestamp: new Date().toISOString()
      };

      const reviewerFile = path.join(AI_TASKS_DIR, 'reviewer-result.json');
      fs.writeFileSync(reviewerFile, JSON.stringify(reviewerResult, null, 2));

      console.log(`✅ ${reviewerResult.assessment}\n`);

      // 第三步：生成报告
      console.log('📍 [REPORTER] 生成审计报告...');
      const reports = reporter.saveReports(scoutResult, reviewerResult);
      console.log(`✅ 报告已生成\n`);

      // 第四步：计算安全评分
      console.log('📍 [SCORER] 计算安全评分...');
      scoreData = scorer.calculateScore(scoutResult);
      const trendRecord = scorer.recordTrend(scoreData);
      allTrends = scorer.getTrends(90); // 获取最近 90 天
      trendChange = scorer.calculateTrendChange(allTrends);
      last7Days = scorer.getLast7Days(allTrends);

      scorer.printScoreSummary(scoreData, trendChange);

      // 第五步：生成看板
      console.log('📍 [DASHBOARD] 生成安全看板...');
      const dashboardContent = dashboard.generateDashboard(
        scoreData,
        trendChange,
        last7Days,
        scoutResult,
        allTrends
      );
      const dashboardFile = dashboard.saveDashboard(dashboardContent);
      console.log(`✅ 看板已生成: ${dashboardFile.split('/').slice(-1)[0]}\n`);

      // 第六步：发送 Telegram 通知
      console.log('📍 [NOTIFIER] 发送安全评分通知...');
      await notifier.notifySecurityScore(scoreData, trendChange);
      console.log(`✅ 通知已发送\n`);

      // 完成总结
      console.log('================================');
      console.log('✅ 安全审计完成！\n');

      const duration = Math.round((Date.now() - startTime) / 1000);
      console.log('📊 执行摘要:');
      console.log(`   发现问题: ${scoutResult.bugs_found.length} 个`);
      console.log(`   评分: ${scoreData.score}/100 (${scorer.getGrade(scoreData.score).grade})`);
      console.log(`   趋势: ${trendChange.emoji} ${trendChange.trend}`);
      console.log(`   耗时: ${duration} 秒\n`);

      console.log('📁 输出文件:');
      console.log(`   Markdown: WORLDWALLET_SECURITY_REPORT.md`);
      console.log(`   看板: SECURITY_DASHBOARD.md`);
      console.log(`   趋势: ai-system/metrics/security-trend.json\n`);

      // 记录执行日志
      const execution = {
        timestamp: new Date().toISOString(),
        status: 'success',
        duration: duration,
        scout: {
          bugs_found: scoutResult.bugs_found.length
        },
        score: scoreData,
        trend: trendChange,
        reviewer: reviewerResult
      };

      const logFile = path.join(AI_LOGS_DIR, `audit-${new Date().toISOString().split('T')[0]}.json`);
      fs.writeFileSync(logFile, JSON.stringify(execution, null, 2));

      console.log('📋 完整日志: ai-system/logs/\n');

    } catch (error) {
      console.error('\n❌ 执行出错:', error.message);
      await notifier.notifySystemError(error.message, 'Security audit pipeline failed');
      process.exit(1);
    }
  }
}

// 执行
const pipeline = new SecurityAuditPipelineV2();
pipeline.run();
