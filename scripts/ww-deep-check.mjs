#!/usr/bin/env node
/**
 * WorldWallet 深度静态检查（无需浏览器）：
 * 1) dom-bind 与 HTML 内联事件是否仍重复
 * 2) goTo('page-…') 目标是否在 HTML 中存在对应 #id
 * 3) 底栏 tab id 与 TAB_MAP 一致
 * 4) onclick 中简单全局函数名是否在 dist/*.js 中有定义
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

/** 仅以 dist 为真源；assets/ 由 npm run build（scripts/sync-assets.sh）从 dist 镜像 */
const HTML_PATHS = ['dist/wallet.html'];
const JS_GLOB = [
  'dist/wallet.core.js',
  'dist/wallet.ui.js',
  'dist/wallet.addr.js',
  'dist/wallet.tx.js',
  'dist/wallet.runtime.js',
  'dist/wallet.dom-bind.js',
];

const DOM_BIND = {
  forms: [
    { id: 'pageRestorePinForm', forbid: ['onsubmit'] },
    { id: 'pinUnlockForm', forbid: ['onsubmit'] },
  ],
  byId: [
    { id: 'importPageLang', forbid: ['onchange'] },
    { id: 'mnemonicLength', forbid: ['onchange'] },
    { id: 'hideZeroTokens', forbid: ['onchange'] },
    { id: 'txHistoryFilter', forbid: ['oninput'] },
    { id: 'qrChainSelect', forbid: ['onchange'] },
    { id: 'qrReceiveAmount', forbid: ['oninput'] },
    { id: 'transferAddr', forbid: ['oninput'] },
    { id: 'transferAmount', forbid: ['oninput'] },
    { id: 'swapAmountIn', forbid: ['oninput'] },
    { id: 'importPaste', forbid: ['oninput'] },
    { id: 'claimInput', forbid: ['onkeydown'] },
    { id: 'totpUnlockInput', forbid: ['onkeydown'] },
    { id: 'totpSetupVerifyInput', forbid: ['onkeydown'] },
  ],
  overlays: [
    { id: 'pinUnlockOverlay', forbid: ['onclick'] },
    { id: 'totpUnlockOverlay', forbid: ['onclick'] },
    { id: 'totpSetupOverlay', forbid: ['onclick'] },
    { id: 'transferConfirmOverlay', forbid: ['onclick'] },
    { id: 'pinSetupOverlay', forbid: ['onclick'] },
    { id: 'qrOverlay', forbid: ['onclick'] },
  ],
};

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function extractOpenTag(html, id) {
  const re = new RegExp(`<([a-zA-Z][^\\s>]*)[^>]*\\bid="${id}"[^>]*>`, 'i');
  const m = html.match(re);
  return m ? m[0] : null;
}

function extractFormInner(html, id) {
  const start = html.indexOf(`id="${id}"`);
  if (start < 0) return null;
  const formStart = html.lastIndexOf('<form', start);
  if (formStart < 0) return null;
  const sub = html.slice(formStart);
  const end = sub.indexOf('</form>');
  if (end < 0) return null;
  return sub.slice(0, end + 7);
}

function auditDomBindDuplicates(html, label) {
  const issues = [];
  for (const { id, forbid } of DOM_BIND.forms) {
    const chunk = extractFormInner(html, id);
    if (!chunk) continue;
    for (const attr of forbid) {
      if (chunk.includes(attr + '=')) issues.push(`${label}: <form#${id}> 仍含 ${attr}（与 wallet.dom-bind.js 重复）`);
    }
  }
  for (const { id, forbid } of DOM_BIND.byId) {
    const tag = extractOpenTag(html, id);
    if (!tag) continue;
    for (const attr of forbid) {
      if (tag.includes(attr + '=')) issues.push(`${label}: #${id} 开始标签仍含 ${attr}（与 dom-bind 重复）`);
    }
  }
  for (const { id, forbid } of DOM_BIND.overlays) {
    const tag = extractOpenTag(html, id);
    if (!tag) continue;
    for (const attr of forbid) {
      if (tag.includes(attr + '=')) issues.push(`${label}: #${id} 仍含 ${attr}（遮罩应由 bindOverlayBackdrop 处理）`);
    }
  }
  return issues;
}

function collectPageIds(html) {
  const ids = new Set();
  const re = /\bid="(page-[a-z0-9-]+)"/gi;
  let m;
  while ((m = re.exec(html))) ids.add(m[1]);
  return ids;
}

function collectGoToTargets(html) {
  const targets = new Set();
  const re = /goTo\s*\(\s*['"](page-[a-z0-9-]+)['"]/g;
  let m;
  while ((m = re.exec(html))) targets.add(m[1]);
  return targets;
}

function parseTabMap(js) {
  const m = js.match(/TAB_MAP\s*=\s*\{([^}]+)\}/);
  if (!m) return null;
  const keys = [];
  const kr = /['"](tab-[a-z0-9-]+)['"]\s*:/g;
  let x;
  while ((x = kr.exec(m[1]))) keys.push(x[1]);
  return keys;
}

function collectTabBarIds(html) {
  const re = /<div[^>]*\bid="(tab-[a-z0-9-]+)"[^>]*class="[^"]*tab-item/gi;
  const alt = /<div[^>]*class="[^"]*tab-item[^"]*"[^>]*\bid="(tab-[a-z0-9-]+)"/gi;
  const ids = new Set();
  let m;
  while ((m = re.exec(html))) ids.add(m[1]);
  while ((m = alt.exec(html))) ids.add(m[1]);
  return [...ids];
}

/** 从 onclick 串里抽「像函数名」的全局调用（启发式，排除关键字） */
const SKIP = new Set([
  'if', 'void', 'typeof', 'event', 'document', 'window', 'localStorage', 'confirm',
  'String', 'parseFloat', 'Math', 'history', 'location', 'encodeURIComponent',
  'decodeURIComponent', 'setTimeout', 'parseInt', 'Number', 'Date', 'JSON',
  'Array', 'Object', 'RegExp', 'Error', 'console', 'navigator', 'fetch',
  // DOM / 存储 常见方法名（内联 onclick 里会出现，非全局函数）
  'getElementById', 'querySelector', 'querySelectorAll', 'stopPropagation', 'preventDefault',
  'removeItem', 'getItem', 'setItem', 'focus', 'blur', 'click', 'open', 'closest', 'contains',
]);

function extractOnclickFunctions(html) {
  const names = new Set();
  const re = /onclick="([^"]+)"/gi;
  let m;
  while ((m = re.exec(html))) {
    const code = m[1];
    const callRe = /\b([a-zA-Z_$][\w$]*)\s*\(/g;
    let c;
    while ((c = callRe.exec(code))) {
      const name = c[1];
      if (!SKIP.has(name)) names.add(name);
    }
  }
  return names;
}

function functionDefinedInJs(js, name) {
  if (name === 'goTo' || name === 'goTab') return /\bfunction\s+goTo\b/.test(js) && /\bfunction\s+goTab\b/.test(js);
  const patterns = [
    new RegExp(`\\bfunction\\s+${name}\\s*\\(`),
    new RegExp(`\\basync\\s+function\\s+${name}\\s*\\(`),
    new RegExp(`\\bvar\\s+${name}\\s*=\\s*function`),
    new RegExp(`\\blet\\s+${name}\\s*=\\s*function`),
    new RegExp(`\\bconst\\s+${name}\\s*=\\s*function`),
    new RegExp(`\\bwindow\\.${name}\\s*=`),
  ];
  return patterns.some((p) => p.test(js));
}

function main() {
  let exit = 0;
  const allJs = JS_GLOB.map((p) => read(p)).join('\n');
  const uiJs = read('dist/wallet.ui.js');
  const tabKeys = parseTabMap(uiJs);
  if (!tabKeys || tabKeys.length === 0) {
    console.error('FAIL: 无法从 wallet.ui.js 解析 TAB_MAP');
    exit = 1;
  }

  for (const rel of HTML_PATHS) {
    const p = path.join(ROOT, rel);
    if (!fs.existsSync(p)) {
      console.warn(`SKIP: 不存在 ${rel}`);
      continue;
    }
    const html = read(rel);
    const label = rel;

    const dup = auditDomBindDuplicates(html, label);
    if (dup.length) {
      dup.forEach((x) => console.error('DUP\t' + x));
      exit = 1;
    } else {
      console.log(`OK\t${label}\tdom-bind 无重复内联`);
    }

    const pageIds = collectPageIds(html);
    const goTargets = collectGoToTargets(html);
    for (const t of goTargets) {
      if (!pageIds.has(t)) {
        console.error(`PAGE\t${label}\tgoTo('${t}') 但 HTML 中无 id="${t}"`);
        exit = 1;
      }
    }
    if ([...goTargets].every((t) => pageIds.has(t))) {
      console.log(`OK\t${label}\tgoTo 目标页共 ${goTargets.size} 个均已定义`);
    }

    const barIds = collectTabBarIds(html);
    if (tabKeys && barIds.length) {
      const missing = tabKeys.filter((k) => !barIds.includes(k));
      const extra = barIds.filter((k) => !tabKeys.includes(k));
      if (missing.length || extra.length) {
        console.error(`TAB\t${label}\t底栏与 TAB_MAP 不一致 missing=${missing.join(',')} extra=${extra.join(',')}`);
        exit = 1;
      } else {
        console.log(`OK\t${label}\tTAB_MAP 与底栏 tab id 一致 (${barIds.length})`);
      }
    }

    const fnames = extractOnclickFunctions(html);
    const missingFn = [];
    for (const fn of fnames) {
      if (!functionDefinedInJs(allJs, fn)) missingFn.push(fn);
    }
    if (missingFn.length) {
      console.error(`FN\t${label}\tonclick 中以下名称未在 dist/*.js 中匹配到定义: ${missingFn.join(', ')}`);
      exit = 1;
    } else if (fnames.size) {
      console.log(`OK\t${label}\tonclick 全局函数 ${fnames.size} 个均有定义`);
    }
  }

  process.exit(exit);
}

main();
