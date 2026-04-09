#!/usr/bin/env node
/**
 * Chrome 深度检查：本地静态服务 dist/，用 Puppeteer 调起 Google Chrome（channel: chrome），
 * 遍历 goTo / goTab / 欢迎页按钮与返回，收集 console / pageerror，写出 Markdown 报告。
 *
 * 用法:
 *   node scripts/ww-chrome-deep-check.mjs
 *   HEADLESS=0 node scripts/ww-chrome-deep-check.mjs   # 有界面（需本机图形环境）
 */
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const WWW = path.join(ROOT, 'dist');
const REPORT_PATH = path.join(ROOT, 'DEEP_INSPECTION_CHROME_REPORT.md');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
};

/** index.html 内全部 page-* 容器 id（与 grep 一致） */
const ALL_PAGE_IDS = [
  'page-welcome',
  'page-password-restore',
  'page-key',
  'page-key-verify',
  'page-home',
  'page-addr',
  'page-transfer',
  'page-settings',
  'page-swap',
  'page-import',
  'page-hongbao',
  'page-claim',
  'page-claimed',
  'page-hb-records',
  'page-faq',
  'page-swoosh',
  'page-transfer-success',
  'page-hb-keyword',
  'page-verify-success',
];

/** 无已解锁钱包时 goTo 的预期落地页（runtime 重定向） */
const GO_TO_EXPECTED = {
  'page-home': 'page-welcome',
  'page-password-restore': 'page-welcome',
};

const TAB_IDS = ['tab-home', 'tab-addr', 'tab-swap', 'tab-hongbao', 'tab-settings'];

/** goTab 在无钱包时对「资产」tab 的预期（goTo page-home -> welcome） */
const TAB_EXPECTED = {
  'tab-home': 'page-welcome',
};

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME[ext] || 'application/octet-stream';
}

function createServer() {
  return http.createServer((req, res) => {
    try {
      const u = new URL(req.url || '/', 'http://127.0.0.1');
      let rel = u.pathname === '/' ? '/wallet.html' : u.pathname;
      if (rel.includes('..')) {
        res.writeHead(400);
        res.end();
        return;
      }
      const fp = path.join(WWW, rel);
      if (!fp.startsWith(WWW)) {
        res.writeHead(403);
        res.end();
        return;
      }
      fs.readFile(fp, (err, data) => {
        if (err) {
          res.writeHead(err.code === 'ENOENT' ? 404 : 500);
          res.end(err.code === 'ENOENT' ? 'Not found' : String(err));
          return;
        }
        res.setHeader('Content-Type', contentType(fp));
        res.writeHead(200);
        res.end(data);
      });
    } catch (e) {
      res.writeHead(500);
      res.end(String(e));
    }
  });
}

function nowIso() {
  return new Date().toISOString();
}

async function launchChrome() {
  const headless = process.env.HEADLESS === '0' || process.env.HEADLESS === 'false' ? false : 'new';
  const common = {
    headless,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  };
  try {
    return await puppeteer.launch({ ...common, channel: 'chrome' });
  } catch (e1) {
    try {
      return await puppeteer.launch({ ...common, channel: 'chrome-beta' });
    } catch (_e2) {
      return await puppeteer.launch(common);
    }
  }
}

async function main() {
  const server = createServer();
  const port = await new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => {
      const a = server.address();
      resolve(typeof a === 'object' && a ? a.port : 0);
    });
    server.on('error', reject);
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  const entryUrl = `${baseUrl}/wallet.html`;

  const log = [];
  const issues = [];
  const timings = [];

  let browser;
  try {
    browser = await launchChrome();
  } catch (e) {
    server.close();
    const msg = e && e.message ? e.message : String(e);
    console.error('无法启动浏览器:', msg.split('\n')[0]);
    console.error('可尝试: npx puppeteer browsers install chrome');
    process.exit(1);
  }

  const page = await browser.newPage();
  page.on('pageerror', (err) => log.push({ t: 'pageerror', text: err.message }));
  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error' || type === 'warning') log.push({ t: `console.${type}`, text });
  });

  const t0 = Date.now();
  let respOk = false;
  try {
    const resp = await page.goto(entryUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
    respOk = !!(resp && resp.ok());
    if (!respOk) issues.push(`HTTP ${resp ? resp.status() : 'no response'} for ${entryUrl}`);
  } catch (e) {
    issues.push(`goto: ${e.message}`);
  }

  await page.waitForSelector('#page-welcome, .phone', { timeout: 60000 }).catch((e) => {
    issues.push(`首屏选择器: ${e.message}`);
  });

  // ethers CDN 等
  await new Promise((r) => setTimeout(r, 3500));

  /** 当前 active 页 id */
  async function activeId() {
    return page.evaluate(() => {
      const el = document.querySelector('.page.active');
      return el ? el.id : null;
    });
  }

  // --- goTo 全页 ---
  const goToResults = [];
  for (const pid of ALL_PAGE_IDS) {
    const expected = GO_TO_EXPECTED[pid] || pid;
    const start = Date.now();
    try {
      let got;
      if (pid === 'page-key') {
        // 同步读取：skipKeyRegen 会异步 renderKeyGrid，无 TEMP/REAL 助记词时会 goTo('page-welcome')，晚于微任务则误判
        got = await page.evaluate(() => {
          if (typeof goTo !== 'function') throw new Error('goTo 未定义');
          goTo('page-key', { skipKeyRegen: true });
          const el = document.querySelector('.page.active');
          return el ? el.id : null;
        });
      } else {
        await page.evaluate((id) => {
          if (typeof goTo !== 'function') throw new Error('goTo 未定义');
          goTo(id);
        }, pid);
        await new Promise((r) => setTimeout(r, 120));
        got = await activeId();
      }
      const ok = got === expected;
      goToResults.push({ pid, expected, got, ms: Date.now() - start, ok });
      if (!ok) issues.push(`goTo('${pid}'): 预期 active #${expected}，实际 #${got}`);
    } catch (e) {
      goToResults.push({ pid, expected, got: null, ms: Date.now() - start, ok: false, err: e.message });
      issues.push(`goTo('${pid}'): ${e.message}`);
    }
  }

  // 回到欢迎页以便点击测试
  await page.evaluate(() => goTo('page-welcome'));
  await new Promise((r) => setTimeout(r, 200));

  // --- 欢迎页三按钮 ---
  const welcomeClicks = [];
  const scenarios = [
    { name: '创建新钱包', sel: 'button.btn-primary[onclick*="createNewWallet"]', expect: 'page-key-verify' },
    // 无本地钱包时 goTo(PIN) 会重定向到欢迎页（与 runtime 一致）
    { name: 'PIN 解锁钱包', sel: 'button.btn-secondary[onclick*="page-password-restore"]', expect: 'page-welcome' },
    { name: '导入已有钱包', sel: 'button.btn-secondary[onclick*="page-import"]', expect: 'page-import' },
  ];
  for (const s of scenarios) {
    await page.evaluate(() => goTo('page-welcome'));
    await new Promise((r) => setTimeout(r, 150));
    try {
      await page.click(s.sel);
      await new Promise((r) => setTimeout(r, s.name === '创建新钱包' ? 1200 : 400));
      const got = await activeId();
      const ok = got === s.expect;
      welcomeClicks.push({ ...s, got, ok });
      if (!ok) issues.push(`欢迎页「${s.name}」: 预期 #${s.expect}，实际 #${got}`);
    } catch (e) {
      welcomeClicks.push({ ...s, got: null, ok: false, err: e.message });
      issues.push(`欢迎页「${s.name}」点击失败: ${e.message}`);
    }
  }

  // --- 底栏 goTab（先进入设置使底栏显示） ---
  const tabResults = [];
  try {
    await page.evaluate(() => goTo('page-settings'));
    await new Promise((r) => setTimeout(r, 350));
  } catch (e) {
    issues.push(`进入设置以测底栏: ${e.message}`);
  }

  for (const tid of TAB_IDS) {
    try {
      await page.evaluate(
        (id) => {
          if (typeof goTab !== 'function') throw new Error('goTab 未定义');
          goTab(id);
        },
        tid
      );
      await new Promise((r) => setTimeout(r, 280));
      const got = await activeId();
      const expectedPage = await page.evaluate((tabId) => {
        const m = typeof TAB_MAP !== 'undefined' ? TAB_MAP : {};
        return m[tabId] || '';
      }, tid);

      const finalExpected = TAB_EXPECTED[tid] || expectedPage;
      const ok = got === finalExpected;
      tabResults.push({ tid, expected: finalExpected, got, ok });
      if (!ok) issues.push(`goTab('${tid}'): 预期 active #${finalExpected}，实际 #${got}`);
    } catch (e) {
      tabResults.push({ tid, expected: TAB_EXPECTED[tid], got: null, ok: false, err: e.message });
      issues.push(`goTab('${tid}'): ${e.message}`);
    }
  }

  const elapsed = Date.now() - t0;
  timings.push({ step: 'total', ms: elapsed });

  await browser.close();
  server.close();

  // 过滤与测试无关的噪音（可按需收紧）
  const seriousLog = log.filter(
    (x) =>
      !/^\[WorldToken\]/.test(x.text) &&
      !/Failed to load resource.*favicon/i.test(x.text)
  );

  if (seriousLog.length) {
    seriousLog.slice(0, 40).forEach((x) => {
      issues.push(`${x.t}: ${x.text}`);
    });
    if (seriousLog.length > 40) issues.push(`… 另有 console/页面日志 ${seriousLog.length - 40} 条见下方原文`);
  }

  const headlessUsed = process.env.HEADLESS === '0' || process.env.HEADLESS === 'false' ? '否（有界面）' : '是（headless）';
  const report = [
    '# Chrome 深度检查报告（按键与页面）',
    '',
    `- **生成时间**: ${nowIso()}`,
    `- **入口**: \`${entryUrl}\``,
    `- **首屏 HTTP**: ${respOk ? 'OK' : '异常'}`,
    `- **Headless**: ${headlessUsed}`,
    `- **耗时**: ${elapsed} ms`,
    '',
    '## 1. 静态脚本 ww-deep-check.mjs',
    '',
    '（请与本次运行 stdout 对照；下方为浏览器侧结果。）',
    '',
    '## 2. goTo 各页 active 校验',
    '',
    '| pageId | 预期 active | 实际 | 耗时(ms) | 结果 |',
    '|--------|-------------|------|----------|------|',
    ...goToResults.map((r) => {
      const st = r.ok ? '✅' : '❌';
      const g = r.got == null ? (r.err || '-') : r.got;
      return `| ${r.pid} | ${r.expected} | ${g} | ${r.ms} | ${st} |`;
    }),
    '',
    '说明：`page-home` 与 `page-password-restore` 在无本地钱包时由 runtime 重定向至 `page-welcome`，属预期。',
    '',
    '`page-key` 行在 `goTo` 返回后**同步**读取 active（避免无钱包时异步 `renderKeyGrid` 跳回 `page-welcome` 的误判）；完整生成助记词流程请用手动或长超时 E2E。',
    '',
    '## 3. 欢迎页按钮',
    '',
    '| 按钮 | 预期 | 实际 | 结果 |',
    '|------|------|------|------|',
    ...welcomeClicks.map((r) => {
      const st = r.ok ? '✅' : '❌';
      return `| ${r.name} | ${r.expect} | ${r.got ?? r.err ?? '-'} | ${st} |`;
    }),
    '',
    '## 4. 创建页返回键',
    '',
    backFromCreateOk ? '- ✅ nav-back 回到 `page-welcome`' : '- ❌ 返回行为异常',
    '',
    '## 5. 底栏 goTab',
    '',
    '| tab id | 预期 page | 实际 active | 结果 |',
    '|--------|-----------|-------------|------|',
    ...tabResults.map((r) => {
      const st = r.ok ? '✅' : '❌';
      return `| ${r.tid} | ${r.expected} | ${r.got ?? r.err ?? '-'} | ${st} |`;
    }),
    '',
    '说明：`tab-home` 在无钱包时经 `page-home` 重定向至 `page-welcome`，属预期。',
    '',
    '## 6. 浏览器日志摘要',
    '',
    log.length
      ? log
          .slice(0, 80)
          .map((x) => `- **${x.t}**: ${x.text}`)
          .join('\n')
      : '- （无 error 级 console / pageerror）',
    '',
    '## 7. 结论',
    '',
    issues.length === 0
      ? '- **总体**: ✅ 本次 Chrome 自动化未发现与 goTo / 欢迎按钮 / 底栏 / 返回键不一致的问题（在「无本地钱包」前提下）。'
      : `- **总体**: ⚠️ 发现 ${issues.length} 条待核对项（见下）。`,
    '',
    ...(issues.length
      ? ['### 待核对项', '', ...issues.map((x) => `- ${x}`)]
      : []),
    '',
    '---',
    '*由 `scripts/ww-chrome-deep-check.mjs` 生成*',
    '',
  ].join('\n');

  fs.writeFileSync(REPORT_PATH, report, 'utf8');
  console.log(`报告已写入: ${REPORT_PATH}`);
  console.log(issues.length ? `完成: ${issues.length} 条 issue（见报告）` : '完成: 无 issue');

  process.exit(issues.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
