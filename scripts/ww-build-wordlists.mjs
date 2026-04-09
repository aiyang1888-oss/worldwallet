#!/usr/bin/env node
/**
 * 生成 dist/wordlists.js（仅内嵌 en + 中文地名 zh）与 dist/wordlists/*.json（其余语种懒加载）。
 * 英文等自 bitcoinjs/bip39 raw；de/ru 自 bitcoin/bips PR 提交。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const distWl = path.join(root, 'dist', 'wordlists');
const BIP39_RAW = 'https://raw.githubusercontent.com/bitcoinjs/bip39/master/src/wordlists';

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data), 'utf8');
}

function txtToJsonLower(lines) {
  const arr = lines
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (arr.length !== 2048) throw new Error('expected 2048 lines, got ' + arr.length);
  return arr.map((w) => w.toLowerCase());
}

function txtToJsonRaw(lines) {
  const arr = lines
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (arr.length !== 2048) throw new Error('expected 2048 lines, got ' + arr.length);
  return arr;
}

async function fetchText(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('fetch ' + url + ' ' + r.status);
  return r.text();
}

async function fetchJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('fetch ' + url + ' ' + r.status);
  return r.json();
}

const en = await fetchJson(BIP39_RAW + '/english.json');
const zh = readJson(path.join(distWl, 'zh-cn.json'));
if (en.length !== 2048 || zh.length !== 2048) throw new Error('en/zh must be 2048');

const copyMap = {
  ja: 'japanese.json',
  ko: 'korean.json',
  es: 'spanish.json',
  fr: 'french.json',
  it: 'italian.json',
  pt: 'portuguese.json'
};
for (const [lang, file] of Object.entries(copyMap)) {
  const data = await fetchJson(BIP39_RAW + '/' + file);
  if (data.length !== 2048) throw new Error('bad length ' + lang);
  writeJson(path.join(distWl, lang + '.json'), data);
}

const germanTxt = await fetchText(
  'https://raw.githubusercontent.com/bitcoin/bips/c10c8224487d352055a87343f4b49be4f4f982bd/bip-0039/german.txt'
);
writeJson(path.join(distWl, 'de.json'), txtToJsonLower(germanTxt));

const russianTxt = await fetchText(
  'https://raw.githubusercontent.com/bitcoin/bips/9bd7b9ec0e5773e68b8865a6606147c8905ce523/bip-0039/russian.txt'
);
writeJson(path.join(distWl, 'ru.json'), txtToJsonRaw(russianTxt));

const header = `// WorldToken BIP39 词表：en/zh 内嵌，其余自 wordlists/*.json 懒加载（与 bitcoinjs/bip39 及 BIPs PR 索引对齐）
`;

const enLit = JSON.stringify(en);
const zhLit = JSON.stringify(zh);

const body = `${header}
var WT_WORDLISTS = {
  en: ${enLit},
  zh: ${zhLit}
};

var EN_WORD_INDEX = {};
var WT_LANG_INDEX = {};

function wwRebuildWordlistIndexes() {
  EN_WORD_INDEX = {};
  if (WT_WORDLISTS.en && WT_WORDLISTS.en.length) {
    for (var ei = 0; ei < WT_WORDLISTS.en.length; ei++) EN_WORD_INDEX[WT_WORDLISTS.en[ei]] = ei;
  }
  WT_LANG_INDEX = {};
  Object.keys(WT_WORDLISTS).forEach(function (lang) {
    var wl = WT_WORDLISTS[lang];
    if (!wl || wl.length !== 2048) return;
    WT_LANG_INDEX[lang] = {};
    for (var li = 0; li < wl.length; li++) WT_LANG_INDEX[lang][wl[li]] = li;
  });
}

/** 仅索引映射，不截断；中文展示词若异常，见 wallet.ui.js wwNormalizeZhWordlistForDisplay（或核对 zh-cn.json 是否经 verify-zh-wordlist）。 */
function wwMapEnWordsToLangWords(enWords, wlKey) {
  if (!wlKey || wlKey === 'en') return enWords.slice();
  var tab = WT_WORDLISTS[wlKey];
  if (!tab || tab.length !== 2048) return enWords.slice();
  var out = [];
  for (var i = 0; i < enWords.length; i++) {
    var w = enWords[i];
    var idx = EN_WORD_INDEX[w];
    if (idx === undefined) out.push(w);
    else out.push(tab[idx] || w);
  }
  return out;
}

var WT_WORDLIST_LOAD_PROMISES = Object.create(null);

function wwWordlistFetchName(lang) {
  if (lang === 'zh') return 'zh-cn';
  return lang;
}

function wwEnsureWordlistLoaded(lang) {
  if (!lang || lang === 'en' || lang === 'zh') return Promise.resolve();
  if (WT_WORDLISTS[lang] && WT_WORDLISTS[lang].length === 2048) return Promise.resolve();
  if (WT_WORDLIST_LOAD_PROMISES[lang]) return WT_WORDLIST_LOAD_PROMISES[lang];
  var base = wwWordlistFetchName(lang);
  WT_WORDLIST_LOAD_PROMISES[lang] = fetch('wordlists/' + base + '.json', { cache: 'force-cache' })
    .then(function (r) {
      if (!r.ok) throw new Error('wordlist fetch failed: ' + base);
      return r.json();
    })
    .then(function (arr) {
      if (!Array.isArray(arr) || arr.length !== 2048) throw new Error('invalid wordlist: ' + lang);
      WT_WORDLISTS[lang] = arr;
      wwRebuildWordlistIndexes();
    })
    .catch(function (e) {
      try {
        delete WT_WORDLIST_LOAD_PROMISES[lang];
      } catch (_d) {}
      throw e;
    });
  return WT_WORDLIST_LOAD_PROMISES[lang];
}

try {
  window.wwRebuildWordlistIndexes = wwRebuildWordlistIndexes;
  window.wwMapEnWordsToLangWords = wwMapEnWordsToLangWords;
  window.wwEnsureWordlistLoaded = wwEnsureWordlistLoaded;
} catch (_w) {}

wwRebuildWordlistIndexes();
`;

fs.writeFileSync(path.join(root, 'dist', 'wordlists.js'), body, 'utf8');
console.log('[ww-build-wordlists] OK → dist/wordlists.js + dist/wordlists/*.json');
