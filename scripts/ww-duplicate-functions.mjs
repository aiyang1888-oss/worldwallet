#!/usr/bin/env node
/**
 * 对比 dist/ 下钱包脚本中的「同名函数声明」——后加载文件会覆盖先加载的同名全局函数（静默、无报错）。
 *
 * 匹配：行首无缩进的 function / async function（顶层声明；缩进嵌套如 function apply() 不计入）。
 * 说明：箭头函数、const f = function、类方法不在此列。
 *
 * 用法：
 *   node scripts/ww-duplicate-functions.mjs
 *   node scripts/ww-duplicate-functions.mjs --json
 *   node scripts/ww-duplicate-functions.mjs --ui-runtime-only
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

/** 与 dist/wallet.html 中 <script src="wallet.*.js"> 顺序一致（后者覆盖前者） */
const DEFAULT_FILES = [
  'dist/wallet.core.js',
  'dist/wallet.ui.js',
  'dist/wallet.addr.js',
  'dist/wallet.tx.js',
  'dist/wallet.runtime.js',
  'dist/wallet.dom-bind.js',
];

/** 仅顶层声明：行首为 function / async function（无缩进），排除嵌套 function apply() 等误报 */
const RE_SYNC_FN = /^function\s+(\w+)\s*\(/;
const RE_ASYNC_FN = /^async\s+function\s+(\w+)\s*\(/;

function extractFunctions(fileRel) {
  const abs = path.join(ROOT, fileRel);
  if (!fs.existsSync(abs)) {
    console.error('Missing file:', fileRel);
    return { fileRel, entries: [] };
  }
  const text = fs.readFileSync(abs, 'utf8');
  const lines = text.split(/\n/);
  const entries = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let m = line.match(RE_ASYNC_FN);
    if (m) {
      entries.push({ name: m[1], line: i + 1, kind: 'async function' });
      continue;
    }
    m = line.match(RE_SYNC_FN);
    if (m) {
      entries.push({ name: m[1], line: i + 1, kind: 'function' });
    }
  }
  return { fileRel, entries };
}

function main() {
  const argv = process.argv.slice(2);
  const asJson = argv.includes('--json');
  const uiRuntimeOnly = argv.includes('--ui-runtime-only');

  const files = uiRuntimeOnly
    ? ['dist/wallet.ui.js', 'dist/wallet.runtime.js']
    : DEFAULT_FILES;

  const byName = new Map();
  for (const fileRel of files) {
    const { entries } = extractFunctions(fileRel);
    for (const e of entries) {
      if (!byName.has(e.name)) byName.set(e.name, []);
      byName.get(e.name).push({ file: fileRel, line: e.line, kind: e.kind });
    }
  }

  const duplicates = [];
  for (const [name, locs] of byName) {
    if (locs.length < 2) continue;
    const fileSet = new Set(locs.map((l) => l.file));
    if (fileSet.size < 2) continue;
    const orderIdx = (f) => files.indexOf(f);
    locs.sort((a, b) => orderIdx(a.file) - orderIdx(b.file) || a.line - b.line);
    const winner = locs[locs.length - 1];
    duplicates.push({ name, locations: locs, winner });
  }

  duplicates.sort((a, b) => a.name.localeCompare(b.name));

  if (asJson) {
    console.log(JSON.stringify({ files, count: duplicates.length, duplicates }, null, 2));
    return;
  }

  console.log('WorldWallet — 跨文件重复的 function / async function 声明');
  console.log('加载顺序（后者覆盖前者）: ' + files.join(' → '));
  console.log('共 ' + duplicates.length + ' 个同名符号出现在多个文件中。\n');

  for (const d of duplicates) {
    const lines = d.locations
      .map((l) => '  ' + l.file + ':' + l.line + ' (' + l.kind + ')')
      .join('\n');
    console.log(d.name + ':');
    console.log(lines);
    console.log('  → 运行时生效: ' + d.winner.file + ':' + d.winner.line);
    console.log('');
  }
}

main();
