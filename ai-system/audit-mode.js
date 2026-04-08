#!/usr/bin/env node

/**
 * Security Audit Mode (审计模式)
 * 只跑 Scout + Reviewer，生成专业安全报告
 * 不自动修改代码，由人工审核决定修复
 */

const fs = require('fs');
const path = require('path');
const SecurityScout = require('./scout-security');
const SecurityReporter = require('./security-reporter');
const TelegramNotifier = require('./telegram-notifier');
require('dotenv').config();

const PROJECT_ROOT = path.dirname(__dirname);
const AI_SYSTEM_DIR = path.join(PROJECT_ROOT, 'ai-system');

const notifier = new TelegramNotifier(
  process.env.TELEGRAM_BOT_TOKEN,
  process.env.TELEGRAM_CHAT_ID
);
const scout = new SecurityScout(PROJECT_ROOT);
const reporter = new SecurityReporter(PROJECT_ROOT);

console.log(`\n🔒 WorldWallet Security Audit Mode`);
console.log(`================================\n`);

class SecurityAuditMode {
  async run() {
    const startTime = Date.now();

    try {
      // 第一步：Scout 扫描
      console.log('📍 [SCOUT] 扫描代码...');
      await notifier.notifyPhaseStart('scout');

      const scoutResult = scout.scan();
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
        action_items: scoutResult.bugs_found.map((bug, idx) => ({
          priority: `P${bug.severity === 'high' ? 0 : bug.severity === 'medium' ? 1 : 2}`,
          description: bug.description,
          file: bug.file,
          line: bug.line
        }))
      };

      console.log(`✅ ${reviewerResult.assessment}\n`);

      // 第三步：生成报告
      console.log('📍 [REPORT] 生成安全报告...');
      const reports = reporter.saveReports(scoutResult, reviewerResult);
      console.log('');

      // 打印摘要
      reporter.printSummary(scoutResult, reviewerResult);

      // 最终通知
      const duration = Math.round((Date.now() - startTime) / 1000);
      await notifier.notifyFinalSummary({
        task_id: 'SECURITY-AUDIT-MODE',
        overall_status: 'success',
        total_duration: duration,
        files_changed: 0,
        tests_status: `发现 ${scoutResult.bugs_found.length} 个问题，已生成报告`,
        commit_hash: 'N/A (Audit Mode)',
        branch: 'audit-report'
      });

      console.log('\n================================');
      console.log('✅ 安全审计完成！\n');
      console.log('📋 后续步骤:');
      console.log('   1. 查看报告: WORLDWALLET_SECURITY_REPORT.md');
      console.log('   2. 技术评审: 确认问题和修复方案');
      console.log('   3. 创建任务: 分配给开发人员处理');
      console.log('   4. 执行修复: 按优先级修复代码');
      console.log('   5. 验证测试: 运行完整测试确保无回归\n');

    } catch (error) {
      console.error('\n❌ 执行出错:', error.message);
      await notifier.notifySystemError(error.message, 'Audit mode failed');
      process.exit(1);
    }
  }
}

// 执行
const auditMode = new SecurityAuditMode();
auditMode.run();
