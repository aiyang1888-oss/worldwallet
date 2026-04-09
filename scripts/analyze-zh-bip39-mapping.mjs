#!/usr/bin/env node
/**
 * 分析 zh 词表与 BIP39 映射（与 wallet.ui.js 中 wwNormalizeZhWordlistForDisplay 行为一致）：
 * - 「虚假词」统计：展示词 disp[i] !== 词表原词 orig[i]（由长词截断前缀导致）
 * - 原词长度 ≥4 的条目（如历史「锡林郭勒」「齐齐哈尔」类）
 * - 展示列是否有重复字符串（会破坏 WT_LANG_INDEX 最后一写覆盖）
 *
 * 数据默认：dist/wordlists/zh-cn.json + dist/wordlists.js 中的 en（或仅用 zh-cn + bip39 包）
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function ulen(s) {
  return [...String(s)].length;
}

function wwNormalizeZhWordlistForDisplay(origArr) {
  if (!origArr || !origArr.length) return origArr ? origArr.slice() : [];
  let si;
  for (si = 0; si < origArr.length; si++) {
    if (Array.from(String(origArr[si] || '')).length > 3) break;
  }
  if (si >= origArr.length) return origArr.slice();

  const nList = origArr.length;
  let used = {};
  const disp = [];
  let i;
  let j;
  let w;
  let arr;
  let n;
  let L;
  let cand;
  let d;
  let hit;
  let guard;
  for (i = 0; i < nList; i++) {
    w = String(origArr[i] || '');
    arr = Array.from(w);
    n = arr.length;
    if (n <= 3) {
      used[w] = true;
      disp.push(w);
      continue;
    }
    let placed = false;
    for (L = 3; L <= n; L++) {
      cand = arr.slice(0, L).join('');
      if (!used[cand]) {
        used[cand] = true;
        disp.push(cand);
        placed = true;
        break;
      }
    }
    if (!placed) disp.push(arr.join(''));
  }
  for (i = 0; i < nList; i++) {
    d = disp[i];
    arr = Array.from(String(origArr[i] || ''));
    for (guard = 0; guard < 24; guard++) {
      hit = false;
      for (j = 0; j < nList; j++) {
        if (j === i) continue;
        if (String(origArr[j]) === d) {
          hit = true;
          break;
        }
      }
      if (!hit) break;
      L = Array.from(d).length + 1;
      if (L <= arr.length) {
        d = arr.slice(0, L).join('');
        disp[i] = d;
      } else break;
    }
  }
  used = {};
  for (i = 0; i < nList; i++) {
    d = disp[i];
    arr = Array.from(String(origArr[i] || ''));
    guard = 0;
    while (used[d] && guard++ < 40) {
      L = Array.from(d).length + 1;
      if (L <= arr.length) d = arr.slice(0, L).join('');
      else break;
    }
    used[d] = true;
    disp[i] = d;
  }
  return disp;
}

function loadEn2048() {
  const wlPath = path.join(root, 'dist', 'wordlists.js');
  const s = fs.readFileSync(wlPath, 'utf8');
  const key = 'en:';
  const start = s.indexOf(key);
  if (start === -1) throw new Error('en: not in wordlists.js');
  const bracket = s.indexOf('[', start);
  if (bracket === -1) throw new Error('en array start not found');
  let depth = 0;
  let i = bracket;
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
  const jsonSlice = s.slice(bracket, i);
  const en = JSON.parse(jsonSlice);
  if (!Array.isArray(en) || en.length !== 2048) throw new Error('expected 2048 en words');
  return en;
}

function main() {
  const zhPath = process.env.ZH_WL_PATH || path.join(root, 'dist', 'wordlists', 'zh-cn.json');
  const origArr = JSON.parse(fs.readFileSync(zhPath, 'utf8'));
  if (!Array.isArray(origArr) || origArr.length !== 2048) {
    console.error('[analyze-zh-bip39-mapping] bad zh array');
    process.exit(1);
  }

  const en = loadEn2048();
  const disp = wwNormalizeZhWordlistForDisplay(origArr);

  let fake = 0;
  const fakeSamples = [];
  let fourPlus = 0;
  const fourSamples = [];
  for (let i = 0; i < 2048; i++) {
    const o = String(origArr[i] || '');
    if (ulen(o) >= 4) {
      fourPlus++;
      if (fourSamples.length < 25) fourSamples.push({ i, word: o });
    }
    if (disp[i] !== o) {
      fake++;
      if (fakeSamples.length < 30) fakeSamples.push({ i, en: en[i], orig: o, disp: disp[i] });
    }
  }

  const byDisp = new Map();
  for (let i = 0; i < 2048; i++) {
    const d = disp[i];
    if (!byDisp.has(d)) byDisp.set(d, []);
    byDisp.get(d).push(i);
  }
  const dupDisp = [...byDisp.entries()].filter(([, idxs]) => idxs.length > 1);

  console.log('[analyze-zh-bip39-mapping] file:', zhPath);
  console.log('  BIP39 英文词数:', en.length);
  console.log('  「虚假词」条数 (disp !== 原词，通常由长地名前缀截断):', fake);
  console.log('  原词条 Unicode 长度 ≥4 的条数:', fourPlus);
  console.log('  展示词字符串重复 (索引数):', dupDisp.length);

  if (fourSamples.length) {
    console.log('\n  长度≥4 样例 (至多 25 条):');
    fourSamples.forEach((x) => console.log('   ', x.i, JSON.stringify(x.word)));
  }
  if (fakeSamples.length) {
    console.log('\n  disp≠orig 样例 (至多 30 条):');
    fakeSamples.forEach((x) =>
      console.log('   ', x.i, 'en=' + x.en, 'orig=' + JSON.stringify(x.orig), 'disp=' + JSON.stringify(x.disp))
    );
  }
  if (dupDisp.length) {
    console.log('\n  展示词重复样例 (至多 8 组):');
    dupDisp.slice(0, 8).forEach(([w, idxs]) => {
      console.log('   ', JSON.stringify(w), '-> indices', idxs.join(','));
    });
  }

  if (dupDisp.length) process.exit(2);
  process.exit(0);
}

main();
