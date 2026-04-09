#!/usr/bin/env node
/**
 * 从 dist/wallet.ui.js 中删除与 wallet.runtime.js 同名、且在 ui 文件内无任何外部引用的顶层 function。
 * 加载顺序下 runtime 会覆盖同名函数；若 ui 内其它代码从不调用该名，则 ui 中的定义可安全删除。
 *
 * 用法：node scripts/strip-ui-runtime-duplicate-fns.mjs [--dry-run]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'acorn';
import * as walk from 'acorn-walk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const UI = path.join(ROOT, 'dist/wallet.ui.js');
const RT = path.join(ROOT, 'dist/wallet.runtime.js');

const RE_SYNC_FN = /^function\s+(\w+)\s*\(/;
const RE_ASYNC_FN = /^async\s+function\s+(\w+)\s*\(/;

function topLevelFunctionNames(fileRel) {
  const abs = path.join(ROOT, fileRel);
  const lines = fs.readFileSync(abs, 'utf8').split(/\n/);
  const names = new Set();
  for (let i = 0; i < lines.length; i++) {
    let m = lines[i].match(RE_ASYNC_FN);
    if (m) {
      names.add(m[1]);
      continue;
    }
    m = lines[i].match(RE_SYNC_FN);
    if (m) names.add(m[1]);
  }
  return names;
}

function duplicateNames() {
  const ui = topLevelFunctionNames('dist/wallet.ui.js');
  const rt = topLevelFunctionNames('dist/wallet.runtime.js');
  const d = [];
  for (const n of ui) {
    if (rt.has(n)) d.push(n);
  }
  return d.sort();
}

/** 除「要删除的声明 id」外，是否还有对 name 的 Identifier 引用 */
function hasExternalIdRef(ast, deleteRanges) {
  const del = new Set(deleteRanges.map(([a, b]) => `${a}:${b}`));
  let bad = false;
  walk.simple(ast, {
    Identifier(node) {
      if (bad) return;
      const k = node.range[0] + ':' + node.range[1];
      if (del.has(k)) return;
      bad = true;
    },
  });
  return bad;
}

function main() {
  const dry = process.argv.includes('--dry-run');
  const dupSet = new Set(duplicateNames());
  const src = fs.readFileSync(UI, 'utf8');
  const ast = parse(src, {
    ecmaVersion: 'latest',
    sourceType: 'script',
    ranges: true,
    allowHashBang: true,
  });

  const toRemove = [];

  for (const stmt of ast.body) {
    if (stmt.type !== 'FunctionDeclaration') continue;
    const name = stmt.id && stmt.id.name;
    if (!name || !dupSet.has(name)) continue;
    const declRange = stmt.range;
    const sliced = src.slice(0, declRange[0]) + src.slice(declRange[1]);
    const subAst = parse(sliced, {
      ecmaVersion: 'latest',
      sourceType: 'script',
      ranges: true,
      allowHashBang: true,
    });
    const idRange = stmt.id.range;
    if (hasExternalIdRef(subAst, [idRange])) continue;
    toRemove.push({ name, start: declRange[0], end: declRange[1] });
  }

  toRemove.sort((a, b) => b.start - a.start);

  let out = src;
  let saved = 0;
  for (const r of toRemove) {
    saved += r.end - r.start;
    if (!dry) {
      out = out.slice(0, r.start) + out.slice(r.end);
    }
  }

  const pct = ((saved / src.length) * 100).toFixed(2);
  console.log(
    JSON.stringify(
      {
        file: 'dist/wallet.ui.js',
        bytesBefore: src.length,
        removableFns: toRemove.length,
        names: toRemove.map((x) => x.name).sort(),
        bytesRemoved: saved,
        percentOfFile: pct,
        dryRun: dry,
      },
      null,
      2
    )
  );

  if (!dry && toRemove.length) {
    fs.writeFileSync(UI, out, 'utf8');
    console.log('Wrote', UI);
  }
}

main();
