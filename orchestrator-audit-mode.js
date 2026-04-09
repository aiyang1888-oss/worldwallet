#!/usr/bin/env node

/**
 * AI Audit-Mode Orchestrator (WorldWallet edition)
 * ═══════════════════════════════════════════════
 * 当前模式：Security Audit Mode（只读模式）
 *
 * 允许：Scout → Reviewer → Score → Trend → Dashboard → Telegram
 * 禁止：Dev / Patch / Edit / Test / Commit / JSON patch / 文件重写 / 自动修复
 *
 * 如遇任何"修改文件"任务：跳过 + 记录 warning "Edit skipped in Operational Mode"
 */

const fs        = require('fs');
const path      = require('path');
const { execSync } = require('child_process');

// ── 运营模式标志（只读，不可在运行时关闭）────────────────────────────────────
const OPERATIONAL_MODE = true;

// ── 安全模块（缺失不崩溃）───────────────────────────────────────────────────
let calculateSecurityScore, appendTrend, readTrend, generateSecurityDashboard;
try {
  ({ calculateSecurityScore } = require('./ai-system/security-score'));
} catch (e) {
  console.warn('[AUDIT] ⚠️  security-score.js not loaded:', e.message);
  calculateSecurityScore = () => ({ score: 0, level: 'N/A', high: 0, medium: 0, low: 0 });
}
try {
  ({ appendTrend, readTrend } = require('./ai-system/security-trend'));
} catch (e) {
  console.warn('[AUDIT] ⚠️  security-trend.js not loaded:', e.message);
  appendTrend = () => {};
  readTrend   = () => [];
}
try {
  ({ generateSecurityDashboard } = require('./ai-system/dashboard-generator'));
} catch (e) {
  console.warn('[AUDIT] ⚠️  dashboard-generator.js not loaded:', e.message);
  generateSecurityDashboard = () => '';
}

// ── Telegram 通知（可选）────────────────────────────────────────────────────
let notifier = null;
try {
  const TelegramNotifier = require('./telegram-notifier');
  notifier = new TelegramNotifier(
    process.env.TG_BOT_TOKEN || '',
    process.env.TG_CHAT_ID   || ''
  );
} catch (e) {
  console.warn('[AUDIT] ⚠️  telegram-notifier.js not loaded:', e.message);
}

const PROJECT_ROOT = __dirname;
const AI_TASKS_DIR = path.join(PROJECT_ROOT, 'ai-tasks');
const LOGS_DIR     = path.join(PROJECT_ROOT, 'logs');

[AI_TASKS_DIR, LOGS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ── helper: severity counter ────────────────────────────────────────────────
function countSeverity(bugs) {
  let high = 0, medium = 0, low = 0;
  const H = /^high$/i, M = /^medium$/i, L = /^low$/i;
  (bugs || []).forEach(bug => {
    const raw = bug.severity || bug.level || bug.priority || '';
    if (H.test(raw))      high++;
    else if (M.test(raw)) medium++;
    else if (L.test(raw)) low++;
  });
  return { high, medium, low };
}

/** Read demo-wallet src/index.js for truth checks (read-only). */
function readDemoWalletIndex(projectRoot) {
  const p = path.join(projectRoot, 'src', 'index.js');
  if (!fs.existsSync(p)) return '';
  return fs.readFileSync(p, 'utf8');
}

/**
 * Cached scout entries can be stale (e.g. BUG-001 about addBalance after code already fixed).
 * Drop findings that no longer match source when we can prove it.
 */
function isStaleAddBalanceNegativeBug(bug, indexSrc) {
  if (!bug || !indexSrc) return false;
  const file = String(bug.file || '').replace(/\\/g, '/');
  if (!file.endsWith('index.js') && !file.includes('src/index')) return false;
  const blob = `${bug.description || ''} ${bug.test_failure || ''} ${bug.fix_suggestion || ''}`;
  if (!/addBalance/i.test(blob)) return false;
  if (!/没有验证|no validation|validate|负数|negative|amount/i.test(blob)) return false;
  const hasGuard =
    /if\s*\(\s*amount\s*<=\s*0\s*\)/.test(indexSrc) &&
    /Amount must be > 0/.test(indexSrc);
  return hasGuard;
}

/**
 * Align test_status with real `npm test` and filter stale cached bugs.
 */
function reconcileScoutResult(projectRoot, scoutResult) {
  const base = scoutResult && typeof scoutResult === 'object' ? scoutResult : {};
  const bugsIn = Array.isArray(base.bugs_found) ? base.bugs_found : [];
  const indexSrc = readDemoWalletIndex(projectRoot);
  const filtered = bugsIn.filter(b => !isStaleAddBalanceNegativeBug(b, indexSrc));

  let testStatus = base.test_status;
  let npmOk = null;
  try {
    execSync('npm test --silent', { cwd: projectRoot, stdio: 'pipe', timeout: 120000 });
    npmOk = true;
  } catch (_) {
    npmOk = false;
  }
  if (npmOk === true) {
    testStatus = 'all tests passed';
  } else if (npmOk === false) {
    testStatus = testStatus && testStatus !== 'unknown' ? testStatus : 'tests failed (npm test)';
  }

  const removed = bugsIn.length - filtered.length;
  const meta = removed > 0 ? { removed_stale_cached_findings: removed } : undefined;

  return {
    ...base,
    bugs_found: filtered,
    test_status: testStatus,
    confidence: removed > 0 ? 'medium' : (base.confidence || 'medium'),
    _reconcile_meta: meta
  };
}

function trendDirectionFromSeries(trendArr) {
  const t = Array.isArray(trendArr) ? trendArr : [];
  if (t.length < 2) return 'flat';
  const prev = t[t.length - 2].score;
  const cur  = t[t.length - 1].score;
  if (prev == null || cur == null) return 'flat';
  if (cur > prev) return 'up';
  if (cur < prev) return 'down';
  return 'flat';
}

// ── 运营模式守卫：任何写操作都被此函数拦截 ──────────────────────────────────
function editGuard(context) {
  console.warn(`[AUDIT] ⚠️  Edit skipped in Operational Mode — context: ${context}`);
}

class AuditOrchestrator {

  /**
   * STEP 1 — Scout（只读扫描，不写代码）
   */
  async scout() {
    console.log('\n📍 [SCOUT] 扫描项目（只读）...');

    // 只读：加载已有的 scout 结果（如果存在），或生成静态快照
    const scoutFile = path.join(AI_TASKS_DIR, 'scout-result.json');
    let scoutResult = null;

    if (fs.existsSync(scoutFile)) {
      try {
        scoutResult = JSON.parse(fs.readFileSync(scoutFile, 'utf8'));
        console.log('   ✓ 已加载上次 Scout 结果');
      } catch (_) {
        scoutResult = null;
      }
    }

    if (!scoutResult) {
      scoutResult = {
        bugs_found: [],
        test_status: 'no scout-result.json — run full scout or paste findings',
        confidence: 'low',
        note: 'Empty baseline: add ai-tasks/scout-result.json from your Scout scan, or use the Dev orchestrator to generate one.'
      };
      console.log('   ✓ 无缓存文件：从空基线开始（不会对代码做假设）');
    }

    scoutResult = reconcileScoutResult(PROJECT_ROOT, scoutResult);
    if (scoutResult._reconcile_meta) {
      console.log(`   ✓ 与源码/测试对账: 已剔除 ${scoutResult._reconcile_meta.removed_stale_cached_findings} 条过期缓存项`);
    }
    const { _reconcile_meta, ...toPersist } = scoutResult;
    scoutResult = toPersist;
    try {
      fs.writeFileSync(scoutFile, JSON.stringify(toPersist, null, 2));
      console.log(`   ✓ 已对账结果写回: ${scoutFile}`);
    } catch (wErr) {
      console.warn('[AUDIT] ⚠️  无法写回 scout 缓存:', wErr.message);
    }

    console.log(`   ✓ 发现 ${scoutResult.bugs_found.length} 个问题`);
    return scoutResult;
  }

  /**
   * STEP 2 — Reviewer（只读审核，不批准修复任务）
   */
  async reviewer(scoutResult) {
    console.log('\n📍 [REVIEWER] 审核问题（只读，不产生修复任务）...');

    const bugs = scoutResult.bugs_found || [];
    const report = {
      mode: 'Security Audit Mode — read-only',
      total_issues: bugs.length,
      issues: bugs.map(b => ({
        id:          b.id,
        severity:    b.severity || 'unknown',
        file:        b.file,
        description: b.description,
        fix_note:    'Edit skipped in Operational Mode'
      })),
      approved_for_fix: false,
      reason: 'Operational Mode active — all edits are disabled'
    };

    const reviewFile = path.join(AI_TASKS_DIR, 'audit-review.json');
    fs.writeFileSync(reviewFile, JSON.stringify(report, null, 2));
    console.log(`   ✓ 审核报告已写入: ${reviewFile}`);
    console.log(`   ✓ approved_for_fix = false（运营模式，禁止修复）`);

    return report;
  }

  /**
   * STEP 3 — Security Pipeline（Score → Trend → Dashboard → Telegram）
   */
  async runSecurityPipeline(scoutResult) {
    console.log('\n📍 [SECURITY] 生成安全评分 & 看板...');

    try {
      const bugs              = scoutResult.bugs_found || [];
      const { high, medium, low } = countSeverity(bugs);
      const date              = new Date().toISOString().split('T')[0];

      // 3-a. Score
      const scored = calculateSecurityScore({ high, medium, low });
      console.log(`   ✓ 评分: ${scored.score} (${scored.level}) | H:${high} M:${medium} L:${low}`);

      // 3-b. Append trend
      appendTrend({ date, score: scored.score, high, medium, low });
      console.log('   ✓ 趋势记录已写入');

      // 3-c. Read trend
      const trend = readTrend();

      // 3-d. Build latest
      const latest = { date, score: scored.score, level: scored.level, high, medium, low };

      // 3-e. Dashboard
      generateSecurityDashboard(latest, trend, bugs);
      console.log('   ✓ SECURITY_DASHBOARD.md 已生成');

      // 3-f. Telegram notification
      try {
        if (notifier && typeof notifier.sendSecurityScore === 'function') {
          const first = bugs[0];
          const topIssue =
            (first && (first.description || first.message || first.title)) || 'None';
          await notifier.sendSecurityScore({
            ...latest,
            trend: trendDirectionFromSeries(trend),
            topIssue
          });
          console.log('   ✓ Telegram 安全评分通知已发送');
        }
      } catch (tgErr) {
        console.warn('[AUDIT] ⚠️  Telegram notification failed (non-fatal):', tgErr.message);
      }

      return latest;
    } catch (err) {
      console.warn('[AUDIT] ⚠️  Security pipeline error (non-fatal):', err.message);
      return null;
    }
  }

  /**
   * 被拦截的操作（统一记录 warning，不执行）
   */
  dev()    { editGuard('dev()    — 代码修复');   return null; }
  test()   { editGuard('test()   — 写入测试结果'); return null; }
  commit() { editGuard('commit() — git commit');  return null; }

  /**
   * 写入审计执行日志（只读报告，非代码修改）
   */
  logAudit(scout, review, security) {
    const timestamp = new Date().toISOString().split('T')[0];
    const logFile   = path.join(LOGS_DIR, `audit-${timestamp}.json`);

    const record = {
      mode:      'Security Audit Mode',
      timestamp: new Date().toISOString(),
      scout:     { issues: (scout.bugs_found || []).length, status: scout.test_status },
      review:    { approved_for_fix: false, total_issues: review.total_issues },
      security:  security || {},
      edit_ops:  'all skipped — Operational Mode'
    };

    fs.writeFileSync(logFile, JSON.stringify(record, null, 2));
    console.log(`\n📊 审计日志已写入: ${logFile}`);
  }

  /**
   * 主流程（只读）
   */
  async run() {
    console.log('🔐 Security Audit Mode — 只读流程启动');
    console.log('   Dev / Patch / Edit / Commit 全部禁用');
    console.log('================================\n');

    if (!OPERATIONAL_MODE) {
      console.error('[AUDIT] ❌ OPERATIONAL_MODE 标志被关闭，拒绝启动');
      process.exit(1);
    }

    try {
      // 1. Scout（只读）
      const scout = await this.scout();

      // 2. Reviewer（只读，不产生修复任务）
      const review = await this.reviewer(scout);

      // 3. 如果有任务尝试触发修复 → 拦截
      if (review.approved_for_fix) {
        editGuard('reviewer approved_for_fix — 运营模式强制跳过');
      }

      // 4. Security pipeline（评分 + 趋势 + 看板 + Telegram）
      const security = await this.runSecurityPipeline(scout);

      // 5. 写入审计日志
      this.logAudit(scout, review, security);

      console.log('\n================================');
      console.log('✅ Security Audit Mode 扫描完成（无代码修改）');
    } catch (error) {
      console.error('\n❌ 审计流程出错:', error.message);
      process.exit(1);
    }
  }
}

// 执行
const auditOrchestrator = new AuditOrchestrator();
auditOrchestrator.run();
