#!/usr/bin/env node
/**
 * 用 dist/wordlists/zh-cn.json（2048 词，与 BIP39 英文索引对齐）
 * 替换 dist/wordlists.js 中的 WT_WORDLISTS.zh 数组。
 * 使用括号深度匹配，避免正则误判字符串内的 ]。
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const zhPath = path.join(root, 'dist', 'wordlists', 'zh-cn.json');
const wlPath = path.join(root, 'dist', 'wordlists.js');

const zh = JSON.parse(fs.readFileSync(zhPath, 'utf8'));
if (!Array.isArray(zh) || zh.length !== 2048) {
  console.error('[inject-zh-wordlist] zh-cn.json must be an array of 2048 strings, got', zh && zh.length);
  process.exit(1);
}

let s = fs.readFileSync(wlPath, 'utf8');
const keyStart = s.indexOf('zh:');
if (keyStart === -1) {
  console.error('[inject-zh-wordlist] zh: not found');
  process.exit(1);
}
const arrStart = s.indexOf('[', keyStart);
if (arrStart === -1) {
  console.error('[inject-zh-wordlist] [ after zh: not found');
  process.exit(1);
}
let depth = 0;
let i = arrStart;
for (; i < s.length; i++) {
  const c = s[i];
  if (c === '[') depth++;
  else if (c === ']') {
    depth--;
    if (depth === 0) {
      i++;
      break;
    }
  }
}
/** `wordlists.js` 中 `en` 可在 `zh` 前或后；仅替换 `zh: [...]` 整段 */
const newS = s.slice(0, keyStart) + 'zh: ' + JSON.stringify(zh) + s.slice(i);
fs.writeFileSync(wlPath, newS, 'utf8');
console.log('[inject-zh-wordlist] OK — WT_WORDLISTS.zh ← zh-cn.json (2048)');
