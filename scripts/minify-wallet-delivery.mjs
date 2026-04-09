#!/usr/bin/env node
/**
 * 压缩 wallet 主链路 JS/CSS（不混淆全局名）。
 * --assets-only  仅处理 assets/（供 npm run build 在 rsync 后调用，dist/ 保持可读真源）
 * 默认          处理 dist/（显式一键瘦身时用）
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { minify } from 'terser';
import CleanCSS from 'clean-css';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

async function minifyJs(abs) {
  const code = fs.readFileSync(abs, 'utf8');
  const r = await minify(code, {
    compress: { passes: 2, unsafe: false, dead_code: true },
    mangle: false,
    format: { comments: false, ecma: 2020 },
  });
  if (!r.code) throw new Error(abs + ': ' + (r.error && r.error.message));
  fs.writeFileSync(abs, r.code, 'utf8');
  return { before: code.length, after: r.code.length };
}

function minifyCss(abs) {
  const code = fs.readFileSync(abs, 'utf8');
  const out = new CleanCSS({ level: 2 }).minify(code);
  if (out.errors && out.errors.length) console.warn(abs, out.errors);
  fs.writeFileSync(abs, out.styles, 'utf8');
  return { before: code.length, after: out.styles.length };
}

async function runOnDir(dirRel) {
  const base = path.join(ROOT, dirRel);
  const files = ['wallet.ui.js', 'wallet.runtime.js', 'wallet.css'];
  let totalB = 0;
  let totalA = 0;
  for (const f of files) {
    const abs = path.join(base, f);
    if (!fs.existsSync(abs)) {
      console.warn('skip missing', abs);
      continue;
    }
    if (f.endsWith('.css')) {
      const o = minifyCss(abs);
      console.log(path.join(dirRel, f), o.before, '→', o.after, ((1 - o.after / o.before) * 100).toFixed(2) + '%');
      totalB += o.before;
      totalA += o.after;
    } else {
      const o = await minifyJs(abs);
      console.log(path.join(dirRel, f), o.before, '→', o.after, ((1 - o.after / o.before) * 100).toFixed(2) + '%');
      totalB += o.before;
      totalA += o.after;
    }
  }
  if (totalB > 0) {
    console.log(dirRel + ' TOTAL', totalB, '→', totalA, 'saved', ((1 - totalA / totalB) * 100).toFixed(2) + '%');
  }
}

async function main() {
  const assetsOnly = process.argv.includes('--assets-only');
  if (assetsOnly) {
    await runOnDir('assets');
  } else {
    await runOnDir('dist');
  }
}

main().catch(function (e) {
  console.error(e);
  process.exit(1);
});
