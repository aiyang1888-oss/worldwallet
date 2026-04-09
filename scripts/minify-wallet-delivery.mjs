#!/usr/bin/env node
/**
 * 压缩 dist 主链路体积（不混淆标识符，避免破坏全局名与调试）：
 * - wallet.ui.js / wallet.runtime.js：terser compress + 去注释
 * - wallet.css：clean-css level 2
 *
 * 用法：node scripts/minify-wallet-delivery.mjs
 * 建议在修改上述文件后、npm run build 前执行；也可由 npm run minify:wallet 调用。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { minify } from 'terser';
import CleanCSS from 'clean-css';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

async function minifyJs(rel) {
  const p = path.join(ROOT, rel);
  const code = fs.readFileSync(p, 'utf8');
  const r = await minify(code, {
    compress: {
      passes: 2,
      unsafe: false,
      dead_code: true,
    },
    mangle: false,
    format: { comments: false, ecma: 2020 },
  });
  if (!r.code) throw new Error(rel + ': ' + (r.error && r.error.message));
  fs.writeFileSync(p, r.code, 'utf8');
  return { before: code.length, after: r.code.length };
}

function minifyCss(rel) {
  const p = path.join(ROOT, rel);
  const code = fs.readFileSync(p, 'utf8');
  const out = new CleanCSS({ level: 2 }).minify(code);
  if (out.errors && out.errors.length) console.warn(rel, out.errors);
  fs.writeFileSync(p, out.styles, 'utf8');
  return { before: code.length, after: out.styles.length };
}

async function main() {
  const js = ['dist/wallet.ui.js', 'dist/wallet.runtime.js'];
  let totalB = 0;
  let totalA = 0;
  for (const j of js) {
    const o = await minifyJs(j);
    console.log(j, o.before, '→', o.after, '(' + ((1 - o.after / o.before) * 100).toFixed(2) + '%)');
    totalB += o.before;
    totalA += o.after;
  }
  const c = minifyCss('dist/wallet.css');
  console.log(
    'dist/wallet.css',
    c.before,
    '→',
    c.after,
    '(' + ((1 - c.after / c.before) * 100).toFixed(2) + '%)'
  );
  totalB += c.before;
  totalA += c.after;
  console.log('TOTAL bytes', totalB, '→', totalA, 'saved', ((1 - totalA / totalB) * 100).toFixed(2) + '%');
}

main().catch(function (e) {
  console.error(e);
  process.exit(1);
});
