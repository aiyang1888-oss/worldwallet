#!/usr/bin/env node
/**
 * 维护 WT_WORDLISTS.zh：scripts/pcas-code.json → generate-zh-cn-wordlist.cjs
 * → dist/wordlists/zh-cn.json → inject-zh-wordlist.cjs → dist/wordlists.js。
 * 与密钥页「非英语 → WT_WORDLISTS[wlKey][i]」展示一致（wlKey 为 zh 时使用本列表）。
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function run(rel) {
  const r = spawnSync(process.execPath, [path.join(__dirname, rel)], { stdio: 'inherit', cwd: root });
  if (r.error) throw r.error;
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run('generate-zh-cn-wordlist.cjs');
run('inject-zh-wordlist.cjs');
console.log('[ww-regen-zh-wordlist] OK — dist/wordlists/zh-cn.json → dist/wordlists.js (WT_WORDLISTS.zh)');
