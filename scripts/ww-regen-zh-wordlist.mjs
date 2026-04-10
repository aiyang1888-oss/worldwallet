#!/usr/bin/env node
/**
 * 中文助记词词表完整再生（与 BIP39 索引 0..2047 对齐）：
 * 1) scripts/generate-zh-cn-wordlist.cjs — 自 pcas 区划树按行政层级广度优先取 2～3 字地名
 * 2) scripts/verify-zh-wordlist.mjs — 长度/去重/排除模式
 * 3) scripts/ww-build-wordlists.mjs — 写入 dist/wordlists.js（内嵌 en+zh）与 dist/wordlists/*.json（需网络拉取 BIP39 英文等）
 *
 * 说明见 scripts/README-wordlists.md
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function run(rel, args = []) {
  const r = spawnSync(process.execPath, [path.join(__dirname, rel), ...args], {
    stdio: 'inherit',
    cwd: root
  });
  if (r.error) throw r.error;
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run('generate-zh-cn-wordlist.cjs');
run('verify-zh-wordlist.mjs');
run('ww-build-wordlists.mjs');
console.log(
  '[ww-regen-zh-wordlist] OK — zh-cn.json → dist/wordlists.js (WT_WORDLISTS.zh) + dist/wordlists/*.json'
);
