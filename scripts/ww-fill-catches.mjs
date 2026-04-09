#!/usr/bin/env node
/**
 * 将「空 catch」替换为：
 * - 早于 wallet.core.js 加载的脚本：catch (e) { void e; }（避免引用尚未定义的 wwQuiet）
 * - 晚于 wallet.core.js：catch (e) { wwQuiet(e); }
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

/** 与 dist/wallet.html 中 wallet.core.js 之前的脚本一致 */
const PRE_CORE = [
  'dist/lib/ethers.umd.min.js',
  'dist/js/api-config.js',
  'dist/wallet.swap.js',
  'dist/wallet.swap.history.js',
  'dist/wallet.swap.exec.js',
  'dist/js/btc-segwit.js',
  'dist/js/idb-kv.js',
  'dist/js/storage.js',
  'dist/js/idb-cache.js',
  'dist/core/security.js',
  'dist/core/key-derivation-cache.js',
  'dist/core/wallet.js',
  'dist/wordlists.js',
];

const POST_CORE = [
  'dist/wallet.core.js',
  'dist/wallet.token.js',
  'dist/core/session-key-cache.js',
  'dist/wallet.ui.modals.js',
  'dist/wallet.ui.js',
  'dist/wallet.chains.js',
  'dist/wallet.tx.js',
  'dist/wallet.runtime.js',
  'dist/wallet.addr.js',
  'dist/wallet.dom-bind.js',
];

const RE_EMPTY_CATCH = /catch\s*\(\s*([a-zA-Z_$][\w$]*)\s*\)\s*\{\s*\}/g;

function processFile(rel, mode) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    console.warn('skip missing', rel);
    return 0;
  }
  let s = fs.readFileSync(abs, 'utf8');
  const before = (s.match(RE_EMPTY_CATCH) || []).length;
  if (before === 0) return 0;
  const repl = mode === 'void' ? 'catch ($1) { void $1; }' : 'catch ($1) { wwQuiet($1); }';
  s = s.replace(RE_EMPTY_CATCH, repl);
  fs.writeFileSync(abs, s, 'utf8');
  return before;
}

function main() {
  let nVoid = 0;
  let nQuiet = 0;
  for (const f of PRE_CORE) {
    const ethersSkip = f.includes('ethers.umd.min');
    if (ethersSkip) continue;
    nVoid += processFile(f, 'void');
  }
  for (const f of POST_CORE) {
    nQuiet += processFile(f, 'quiet');
  }
  console.log('ww-fill-catches: void=' + nVoid + ' wwQuiet=' + nQuiet);
}

main();
