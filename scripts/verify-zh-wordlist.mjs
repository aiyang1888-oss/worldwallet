#!/usr/bin/env node
/**
 * 校验 dist/wordlists/zh-cn.json（或 env ZH_WL_PATH）：
 * - 长度 2048、无重复
 * - 每条 2～3 个 Unicode 字符（避免 UI 截断成伪词）
 * - 不含脚本排除的园区/街道等模式（与 generate-zh-cn-wordlist.cjs 对齐）
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const SKIP_RE =
  /街道|办事处|片区|园区|开发区|经济区|高新区|保税区|新区|风景区|管理区|保护区|监狱|农场|林场|水库|群岛|水域|海区|虚拟|不详|其它|其他|示范区|合作区|试验区|科技谷|物流园|工业园|聚集区|大学城|管理处|养殖场|铁厂街道/;

function ulen(s) {
  return [...String(s)].length;
}

function main() {
  const p = process.env.ZH_WL_PATH || path.join(root, 'dist', 'wordlists', 'zh-cn.json');
  const raw = fs.readFileSync(p, 'utf8');
  const zh = JSON.parse(raw);
  const errs = [];

  if (!Array.isArray(zh) || zh.length !== 2048) {
    errs.push('expected array of length 2048, got ' + (Array.isArray(zh) ? zh.length : typeof zh));
  } else {
    const seen = new Map();
    for (let i = 0; i < zh.length; i++) {
      const w = zh[i];
      if (typeof w !== 'string' || !w.trim()) {
        errs.push('index ' + i + ': empty or non-string');
        continue;
      }
      const L = ulen(w);
      if (L < 2 || L > 3) errs.push('index ' + i + ': length ' + L + ' not in [2,3] — ' + JSON.stringify(w));
      if (SKIP_RE.test(w)) errs.push('index ' + i + ': skipped pattern matched — ' + JSON.stringify(w));
      if (seen.has(w)) errs.push('duplicate ' + JSON.stringify(w) + ' at ' + i + ' and ' + seen.get(w));
      seen.set(w, i);
    }
  }

  if (errs.length) {
    console.error('[verify-zh-wordlist] FAILED\n' + errs.slice(0, 40).join('\n'));
    if (errs.length > 40) console.error('... +' + (errs.length - 40) + ' more');
    process.exit(1);
  }
  console.log('[verify-zh-wordlist] OK', p);
}

main();
