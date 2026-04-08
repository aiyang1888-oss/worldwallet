#!/usr/bin/env node

/**
 * WorldWallet Security.js Auto-Discovery Demo
 * 简化版：只验证 Scout → Reviewer，展示问题自动发现能力
 * (完整的 Dev/Test/Commit 在真实应用时需要针对具体模块调整)
 */

const fs = require('fs');
const path = require('path');
const SecurityScout = require('./scout-security');
const TelegramNotifier = require('./telegram-notifier');
require('dotenv').config();

const PROJECT_ROOT = path.dirname(__dirname); // WorldWallet 项目根
const AI_SYSTEM_DIR = path.join(PROJECT_ROOT, 'ai-system');
const AI_TASKS_DIR = path.join(AI_SYSTEM_DIR, 'tasks');
const LOGS_DIR = path.join(AI_SYSTEM_DIR, 'logs');

[AI_TASKS_DIR, LOGS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const notifier = new TelegramNotifier(
  process.env.TELEGRAM_BOT_TOKEN,
  process.env.TELEGRAM_CHAT_ID
);
const scout = new SecurityScout(PROJECT_ROOT);

console.log(`\n🔍 WorldWallet Security Audit Demo`);
console.log(`Project Root: ${PROJECT_ROOT}\n`);

class SecurityAuditDemo {
  async run() {
    const startTime = Date.now();

    console.log('🚀 自动安全审计闭环开始');
    console.log('================================\n');

    try {
      // 第一步：Scout 扫描
      console.log('📍 [SCOUT] 扫描 security.js...');
      await notifier.notifyPhaseStart('scout');

      const scoutResult = scout.scan();

      const scoutFile = path.join(AI_TASKS_DIR, 'scout-result.json');
      fs.writeFileSync(scoutFile, JSON.stringify(scoutResult, null, 2));
      console.log(`✅ Scout 完成: ${scoutResult.bugs_found.length} 个问题发现\n`);

      if (scoutResult.bugs_found.length > 0) {
        scoutResult.bugs_found.forEach((bug, idx) => {
          console.log(`   ${idx + 1}. [${bug.severity.toUpperCase()}] ${bug.id}`);
          console.log(`      ${bug.description}`);
          console.log(`      行号: ${bug.line}`);
          console.log(`      建议: ${bug.fix_suggestion}\n`);
        });
      }

      const phaseTime = Math.round((Date.now() - startTime) / 1000);
      await notifier.notifyPhaseComplete('scout', {
        bugs_found: scoutResult.bugs_found,
        duration: phaseTime
      });

      // 第二步：Reviewer 审核
      console.log('\n📍 [REVIEWER] 审核安全问题...');
      await notifier.notifyPhaseStart('reviewer');

      const reviewerResult = {
        approved: scoutResult.bugs_found.length > 0,
        bugs_found: scoutResult.bugs_found.length,
        assessment: scoutResult.bugs_found.length > 0 
          ? `发现 ${scoutResult.bugs_found.length} 个有效的安全问题，建议立即修复`
          : '未发现安全问题',
        next_steps: scoutResult.bugs_found.length > 0
          ? ['创建修复分支', '手动或自动修复代码', '运行完整测试', '提交审核']
          : ['继续监控', '定期审计']
      };

      const reviewerFile = path.join(AI_TASKS_DIR, 'reviewer-result.json');
      fs.writeFileSync(reviewerFile, JSON.stringify(reviewerResult, null, 2));
      console.log(`✅ Reviewer 完成: ${reviewerResult.assessment}\n`);

      const reviewTime = Math.round((Date.now() - startTime - phaseTime * 1000) / 1000);
      await notifier.notifyPhaseComplete('reviewer', {
        approved: reviewerResult.approved,
        duration: reviewTime
      });

      // 最终总结
      console.log('================================');
      console.log('✅ 自动安全审计完成！\n');
      console.log('📊 结果总结:');
      console.log(`   发现问题: ${reviewerResult.bugs_found} 个`);
      console.log(`   审核结论: ${reviewerResult.assessment}`);
      console.log(`   下一步: ${reviewerResult.next_steps.join(' → ')}\n`);

      // 记录执行日志
      const totalTime = Math.round((Date.now() - startTime) / 1000);
      const execution = {
        timestamp: new Date().toISOString(),
        project: 'WorldWallet',
        target_module: 'dist/core/security.js',
        phase: 'Scout + Reviewer Demo',
        total_duration: totalTime,
        scout: scoutResult,
        reviewer: reviewerResult,
        status: 'success'
      };

      const logFile = path.join(LOGS_DIR, `security-audit-${new Date().toISOString().split('T')[0]}.json`);
      fs.writeFileSync(logFile, JSON.stringify(execution, null, 2));
      console.log(`📋 执行日志: ${logFile}`);

      // 最终 Telegram 通知
      await notifier.notifyFinalSummary({
        task_id: 'SECURITY-AUDIT',
        overall_status: 'success',
        total_duration: totalTime,
        files_changed: 0,
        tests_status: `发现 ${reviewerResult.bugs_found} 个问题`,
        commit_hash: 'N/A',
        branch: 'security-audit'
      });

    } catch (error) {
      console.error('\n❌ 执行出错:', error.message);
      await notifier.notifySystemError(error.message, 'Security audit failed');
      process.exit(1);
    }
  }
}

// 执行
const demo = new SecurityAuditDemo();
demo.run();
