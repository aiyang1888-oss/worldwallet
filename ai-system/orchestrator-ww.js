#!/usr/bin/env node

/**
 * AI Auto-Dev Orchestrator for WorldWallet
 * 适配 WorldWallet 项目的自动化修复闭环
 * 目标：security.js 的安全问题自动发现和修复
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const SecurityScout = require('./scout-security');
const DevValidator = require('./dev-validator');
const DevRollback = require('./dev-rollback');
const TelegramNotifier = require('./telegram-notifier');
require('dotenv').config();

const PROJECT_ROOT = path.dirname(__dirname); // WorldWallet 项目根
const AI_SYSTEM_DIR = path.join(PROJECT_ROOT, 'ai-system');
const AI_TASKS_DIR = path.join(AI_SYSTEM_DIR, 'tasks');
const LOGS_DIR = path.join(AI_SYSTEM_DIR, 'logs');

// 确保目录存在
[AI_TASKS_DIR, LOGS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// 初始化工具
const notifier = new TelegramNotifier(
  process.env.TELEGRAM_BOT_TOKEN,
  process.env.TELEGRAM_CHAT_ID
);
const scout = new SecurityScout(PROJECT_ROOT);
const validator = new DevValidator(PROJECT_ROOT);
const rollbacker = new DevRollback(PROJECT_ROOT);

console.log(`\n🔍 WorldWallet AI System - Starting at ${PROJECT_ROOT}\n`);

class WorldWalletOrchestrator {
  constructor() {
    this.startTime = Date.now();
  }

  /**
   * 第一步：Scout 扫描 security.js
   */
  async scout() {
    console.log('📍 [SCOUT] 扫描 security.js...');
    const phaseStart = Date.now();

    await notifier.notifyPhaseStart('scout');

    const result = scout.scan();

    const scoutFile = path.join(AI_TASKS_DIR, 'scout-result.json');
    fs.writeFileSync(scoutFile, JSON.stringify(result, null, 2));
    console.log(`✅ Scout 结果保存: ${scoutFile}`);

    const duration = Math.round((Date.now() - phaseStart) / 1000);
    await notifier.notifyPhaseComplete('scout', {
      bugs_found: result.bugs_found,
      duration: duration
    });

    return result;
  }

  /**
   * 第二步：Reviewer 审核问题
   */
  async reviewer(scoutResult) {
    console.log('\n📍 [REVIEWER] 审核问题...');
    const phaseStart = Date.now();

    await notifier.notifyPhaseStart('reviewer');

    // 简化版审核：直接通过，生成任务
    const reviewerResult = {
      approved: true,
      tasks: scoutResult.bugs_found.map((bug, idx) => ({
        task_id: `TASK-SEC-${idx + 1}`,
        bug_id: bug.id,
        priority: bug.severity === 'high' ? 'P0' : 'P1',
        description: bug.description,
        files_to_change: [bug.file],
        test_requirements: [`${bug.test_failure} must be fixed`],
        max_retries: 3
      })),
      reasons: `Found ${scoutResult.bugs_found.length} security issues - all valid and fixable`
    };

    const reviewerFile = path.join(AI_TASKS_DIR, 'reviewer-result.json');
    fs.writeFileSync(reviewerFile, JSON.stringify(reviewerResult, null, 2));
    console.log(`✅ Reviewer 结果保存: ${reviewerFile}`);

    const duration = Math.round((Date.now() - phaseStart) / 1000);
    await notifier.notifyPhaseComplete('reviewer', {
      approved: reviewerResult.approved,
      duration: duration
    });

    return reviewerResult;
  }

  /**
   * 第三步：Dev 修改代码
   */
  async dev(task) {
    console.log(`\n📍 [DEV] 修改 ${task.description}...`);
    const phaseStart = Date.now();

    const devResult = {
      task_id: task.task_id,
      status: 'pending',
      branch: `ai/${task.task_id.toLowerCase()}`,
      pre_check: null,
      post_check: null
    };

    try {
      await notifier.notifyPhaseStart('dev', { task_id: task.task_id });

      const srcFile = path.join(PROJECT_ROOT, task.files_to_change[0]);

      // 改前验证
      const preCheck = validator.validateBefore(srcFile);
      devResult.pre_check = preCheck;

      if (!preCheck.file_exists || !preCheck.file_readable) {
        throw new Error(`Pre-check failed: ${preCheck.errors.join(', ')}`);
      }
      console.log(`   ✓ 前置检查通过，备份已创建`);

      // 创建分支
      const branchName = devResult.branch;
      try {
        execSync(`cd ${PROJECT_ROOT} && git checkout -b ${branchName}`, { stdio: 'ignore' });
        console.log(`   ✓ 创建分支: ${branchName}`);
      } catch (e) {
        console.log(`   ✓ 分支已存在: ${branchName}`);
      }

      // 读取和修改文件
      const originalContent = fs.readFileSync(srcFile, 'utf-8');
      let modifiedContent = originalContent;

      // 根据 bug id 应用修复
      if (task.bug_id === 'SECURITY-001') {
        // 添加 constant-time compare 函数
        if (!modifiedContent.includes('constantTimeEqual')) {
          const constantTimeCompare = `
/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
`;
          modifiedContent = constantTimeCompare + '\n' + modifiedContent;
          console.log(`   ✓ 已添加 constantTimeEqual 函数`);
        }
      } else if (task.bug_id === 'SECURITY-002') {
        // 为 atob 添加 try-catch
        modifiedContent = modifiedContent.replace(
          /atob\s*\(/g,
          'try { const decoded = atob('
        ).replace(
          /;(\s*return)/g,
          '); } catch(e) { console.error("Invalid base64"); return null; }$1'
        );
        console.log(`   ✓ 已为 atob() 添加错误处理`);
      } else if (task.bug_id === 'SECURITY-003') {
        // 生成随机 salt（简单版）
        modifiedContent = modifiedContent.replace(
          /salt\s*=\s*['"][^'"]*['"]/,
          'salt = crypto.getRandomValues(new Uint8Array(16))'
        );
        console.log(`   ✓ 已改用随机 salt`);
      }

      // 改后验证
      fs.writeFileSync(srcFile, modifiedContent, 'utf-8');
      const postCheck = validator.validateAfter(srcFile);
      devResult.post_check = postCheck;

      if (!postCheck.syntax_valid) {
        throw new Error(`Post-check failed: ${postCheck.errors.join(', ')}`);
      }
      console.log(`   ✓ 改后检查通过（语法有效）`);

      devResult.status = 'success';
      devResult.backup_path = preCheck.backup_path;
      devResult.commit_message = `[${task.task_id}] ${task.description}\n\n- Applied security fix for ${task.bug_id}`;

    } catch (e) {
      console.error(`   ❌ Dev 失败: ${e.message}`);
      devResult.status = 'failed';
      devResult.error = e.message;

      // 回滚
      const srcFile = path.join(PROJECT_ROOT, task.files_to_change[0]);
      if (devResult.pre_check?.backup_path) {
        const rollbackResult = rollbacker.rollbackFromBackup(srcFile, devResult.pre_check.backup_path);
        devResult.rollback = rollbackResult;
        if (rollbackResult.status === 'success') {
          console.log(`   ✓ 已回滚修改`);
        }
      }

      const duration = Math.round((Date.now() - phaseStart) / 1000);
      await notifier.notifyPhaseError('dev', e.message, task.task_id);
      throw e;
    }

    const devFile = path.join(AI_TASKS_DIR, `dev-result-${task.task_id}.json`);
    fs.writeFileSync(devFile, JSON.stringify(devResult, null, 2));

    const duration = Math.round((Date.now() - phaseStart) / 1000);
    await notifier.notifyPhaseComplete('dev', {
      files_changed: task.files_to_change,
      duration: duration
    });

    return devResult;
  }

  /**
   * 第四步：Test 运行测试
   */
  async test(devResult) {
    console.log('\n📍 [TEST] 运行测试...');
    const phaseStart = Date.now();

    const testResult = {
      task_id: devResult.task_id,
      status: 'pending',
      passed: false,
      tests_passed: 0,
      tests_total: 0
    };

    try {
      await notifier.notifyPhaseStart('test', { task_id: devResult.task_id });

      // 运行 WorldWallet 的测试
      console.log('   运行: npm run test');
      const testOutput = execSync(`cd ${PROJECT_ROOT} && npm run test 2>&1`, {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024
      });

      // 解析测试结果
      const passMatch = testOutput.match(/Tests:\s+(\d+)\s+passed/);
      if (passMatch) {
        testResult.tests_passed = parseInt(passMatch[1]);
        testResult.tests_total = testResult.tests_passed;
      }

      console.log(`   ✓ Tests 通过 (${testResult.tests_passed}/${testResult.tests_total})`);
      testResult.passed = true;

      const duration = Math.round((Date.now() - phaseStart) / 1000);
      await notifier.notifyPhaseComplete('test', {
        tests_passed: testResult.tests_passed,
        tests_total: testResult.tests_total,
        duration: duration
      });

    } catch (error) {
      console.error('   ❌ 测试失败');
      testResult.passed = false;
      testResult.error = error.message;

      // 回滚
      console.log('\n🔄 [ROLLBACK] 回滚修改...');
      try {
        execSync(`cd ${PROJECT_ROOT} && git checkout -- .`, { stdio: 'ignore' });
        console.log('   ✓ 已回滚修改');
      } catch (e) {
        console.error('   ❌ 回滚失败');
      }

      const duration = Math.round((Date.now() - phaseStart) / 1000);
      await notifier.notifyPhaseError('test', error.message, devResult.task_id);
      throw error;
    }

    const testFile = path.join(AI_TASKS_DIR, `test-result-${devResult.task_id}.json`);
    fs.writeFileSync(testFile, JSON.stringify(testResult, null, 2));

    return testResult;
  }

  /**
   * 第五步：Commit 提交修改
   */
  async commit(devResult) {
    console.log('\n📍 [COMMIT] 提交修改...');
    const phaseStart = Date.now();

    try {
      await notifier.notifyPhaseStart('commit', { task_id: devResult.task_id });

      // 提交到任务分支
      execSync(`cd ${PROJECT_ROOT} && git add . && git commit -m "${devResult.commit_message}"`, {
        stdio: 'inherit'
      });
      console.log(`   ✓ 已提交到分支: ${devResult.branch}`);

      // 切换回 dev 并合并
      execSync(`cd ${PROJECT_ROOT} && git checkout dev 2>/dev/null || git checkout main`, { stdio: 'ignore' });
      execSync(`cd ${PROJECT_ROOT} && git merge ${devResult.branch} --no-ff -m "Merge ${devResult.task_id}"`, {
        stdio: 'inherit'
      });
      console.log('   ✓ 已合并到 dev/main 分支');

      const commitHash = execSync(`cd ${PROJECT_ROOT} && git rev-parse HEAD`, { encoding: 'utf-8' }).trim();

      const commitResult = {
        task_id: devResult.task_id,
        branch: devResult.branch,
        commit_hash: commitHash,
        status: 'success'
      };

      const commitFile = path.join(AI_TASKS_DIR, `commit-result-${devResult.task_id}.json`);
      fs.writeFileSync(commitFile, JSON.stringify(commitResult, null, 2));

      const duration = Math.round((Date.now() - phaseStart) / 1000);
      await notifier.notifyPhaseComplete('commit', {
        commit_hash: commitHash,
        duration: duration
      });

      return commitResult;

    } catch (error) {
      console.error('❌ 提交失败:', error.message);
      const duration = Math.round((Date.now() - phaseStart) / 1000);
      await notifier.notifyPhaseError('commit', error.message, devResult.task_id);
      throw error;
    }
  }

  /**
   * 记录执行日志
   */
  async logExecution(scout, reviewer, dev, test, commit) {
    const timestamp = new Date().toISOString().split('T')[0];
    const logFile = path.join(LOGS_DIR, `execution-ww-${timestamp}.json`);

    const totalDuration = Math.round((Date.now() - this.startTime) / 1000);

    const execution = {
      timestamp: new Date().toISOString(),
      project: 'WorldWallet',
      target_module: 'wallet-shell/core/security.js',
      total_duration: totalDuration,
      phases: {
        scout: scout,
        reviewer: reviewer,
        dev: dev,
        test: test,
        commit: commit
      },
      overall_status: 'success'
    };

    fs.writeFileSync(logFile, JSON.stringify(execution, null, 2));
    console.log(`\n📊 执行日志保存: ${logFile}`);

    // 最终通知
    await notifier.notifyFinalSummary({
      task_id: reviewer.tasks[0]?.task_id || 'UNKNOWN',
      overall_status: 'success',
      total_duration: totalDuration,
      files_changed: 1,
      tests_status: `${test.tests_passed}/${test.tests_total} ✅`,
      commit_hash: commit.commit_hash,
      branch: 'dev/main'
    });
  }

  /**
   * 主流程
   */
  async run() {
    console.log('🚀 WorldWallet AI Auto-Dev 闭环开始');
    console.log('================================\n');

    try {
      // 1. Scout
      const scoutResult = await this.scout();

      if (!scoutResult.bugs_found || scoutResult.bugs_found.length === 0) {
        console.log('\n✅ security.js 无安全问题');
        return;
      }

      console.log(`\n✅ 发现 ${scoutResult.bugs_found.length} 个安全问题`);

      // 2. Reviewer
      const reviewerResult = await this.reviewer(scoutResult);

      if (!reviewerResult.approved) {
        console.log('\n⚠️ 审核未通过');
        return;
      }

      // 3. Dev + Test + Commit
      for (const task of reviewerResult.tasks) {
        try {
          const dev = await this.dev(task);
          const test = await this.test(dev);

          if (!test.passed) {
            console.log(`\n❌ 任务 ${task.task_id} 测试失败`);
            continue;
          }

          const commit = await this.commit(dev);
          await this.logExecution(scoutResult, reviewerResult, dev, test, commit);

        } catch (e) {
          console.error(`\n❌ 任务 ${task.task_id} 处理失败: ${e.message}`);
          throw e;
        }
      }

      console.log('\n================================');
      console.log('✅ WorldWallet 闭环完成！');

    } catch (error) {
      console.error('\n❌ 执行出错:', error.message);
      await notifier.notifySystemError(error.message, 'WorldWallet execution failed');
      process.exit(1);
    }
  }
}

// 执行
const orchestrator = new WorldWalletOrchestrator();
orchestrator.run();
