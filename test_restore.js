/**
 * Verifies zh create → import round-trip against dist/wallet.html WT_WORDLISTS:
 * English BIP39 mnemonic → map to zh display words → map back to English → same ETH address.
 *
 * Run: node test_restore.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { ethers } = require('ethers');

const WALLET_HTML = path.join(__dirname, 'dist', 'wallet.html');

function extractWtWordlists(html) {
  const marker = 'const WT_WORDLISTS = ';
  const idx = html.indexOf(marker);
  if (idx < 0) throw new Error('const WT_WORDLISTS not found');
  let i = html.indexOf('{', idx);
  if (i < 0) throw new Error('WT_WORDLISTS brace not found');
  let depth = 0;
  let j = i;
  for (; j < html.length; j++) {
    const c = html[j];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        j++;
        break;
      }
    }
  }
  const literal = html.slice(i, j);
  return vm.runInNewContext(`(${literal})`, Object.create(null));
}

function buildIndexes(WT_WORDLISTS) {
  const EN_WORD_INDEX = {};
  WT_WORDLISTS.en.forEach((w, idx) => {
    EN_WORD_INDEX[w] = idx;
  });
  const WT_LANG_INDEX = {};
  Object.keys(WT_WORDLISTS).forEach((lang) => {
    WT_LANG_INDEX[lang] = {};
    WT_WORDLISTS[lang].forEach((w, idx) => {
      WT_LANG_INDEX[lang][w] = idx;
    });
  });
  return { EN_WORD_INDEX, WT_LANG_INDEX };
}

function mnemonicToLang(mnemonic, lang, WT_WORDLISTS, EN_WORD_INDEX) {
  if (!lang || lang === 'en' || !WT_WORDLISTS[lang]) return mnemonic;
  const words = mnemonic.trim().split(/\s+/);
  return words
    .map((w) => {
      const idx = EN_WORD_INDEX[w];
      if (idx === undefined) return w;
      return WT_WORDLISTS[lang][idx] || w;
    })
    .join(' ');
}

function mnemonicFromLang(mnemonic, lang, WT_WORDLISTS, WT_LANG_INDEX) {
  if (!lang || lang === 'en' || !WT_WORDLISTS[lang]) return mnemonic;
  const words = mnemonic.trim().split(/\s+/);
  const langIndex = WT_LANG_INDEX[lang] || {};
  return words
    .map((w) => {
      const idx = langIndex[w];
      if (idx === undefined) return w;
      return WT_WORDLISTS.en[idx] || w;
    })
    .join(' ');
}

function assertSameAddr(enMnemonic, label) {
  const w1 = ethers.Wallet.fromMnemonic(enMnemonic);
  const zh = mnemonicToLang(enMnemonic, 'zh', WT_WORDLISTS, EN_WORD_INDEX);
  const back = mnemonicFromLang(zh, 'zh', WT_WORDLISTS, WT_LANG_INDEX);
  const w2 = ethers.Wallet.fromMnemonic(back);
  if (w1.address !== w2.address) {
    throw new Error(
      `${label}: address mismatch ${w1.address} vs ${w2.address}\n  zh: ${zh}\n  back: ${back}`
    );
  }
  const trx1 = ethers.Wallet.fromMnemonic(enMnemonic, "m/44'/195'/0'/0/0");
  const trx2 = ethers.Wallet.fromMnemonic(back, "m/44'/195'/0'/0/0");
  if (trx1.address !== trx2.address) {
    throw new Error(`${label}: TRX path address mismatch`);
  }
}

let WT_WORDLISTS;
let EN_WORD_INDEX;
let WT_LANG_INDEX;

function main() {
  const html = fs.readFileSync(WALLET_HTML, 'utf8');
  WT_WORDLISTS = extractWtWordlists(html);
  for (const lang of ['zh', 'en']) {
    if (!WT_WORDLISTS[lang] || WT_WORDLISTS[lang].length !== 2048) {
      throw new Error(`Expected 2048 ${lang} words, got ${WT_WORDLISTS[lang] && WT_WORDLISTS[lang].length}`);
    }
  }
  const idx = buildIndexes(WT_WORDLISTS);
  EN_WORD_INDEX = idx.EN_WORD_INDEX;
  WT_LANG_INDEX = idx.WT_LANG_INDEX;

  // Deterministic sample
  const fixed = ethers.utils.entropyToMnemonic(Buffer.alloc(16, 2));
  assertSameAddr(fixed, 'deterministic');

  // Random rounds
  const rounds = 24;
  for (let r = 0; r < rounds; r++) {
    const ent = ethers.utils.randomBytes(16);
    const m = ethers.utils.entropyToMnemonic(ent);
    assertSameAddr(m, `round ${r + 1}`);
  }

  console.log('OK: zh WT_WORDLISTS round-trip matches ethers address for', rounds + 1, 'mnemonics.');
}

main();
