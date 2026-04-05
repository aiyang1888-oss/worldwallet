#!/usr/bin/env node
/**
 * Copies the single-page wallet to public/wallet.html (Expo web → /wallet.html).
 * 不写入 assets/，避免把 1MB+ 构建产物反复塞进仓库；原生 App 内嵌页见 app/index.tsx 远程地址。
 *
 * 优先级：dist/wallet.html（完整构建）→ assets/wallet.html（精简版）。
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist', 'wallet.html');
const pub = path.join(root, 'public', 'wallet.html');
const assets = path.join(root, 'assets', 'wallet.html');

function statSafe(p) {
  try {
    return fs.statSync(p);
  } catch {
    return null;
  }
}

function needsCopy(from, to) {
  const a = statSafe(from);
  if (!a || !a.isFile()) return false;
  const b = statSafe(to);
  if (!b) return true;
  return a.mtimeMs !== b.mtimeMs || a.size !== b.size;
}

const primary = fs.existsSync(dist) ? dist : fs.existsSync(assets) ? assets : null;

if (!primary) {
  console.warn(
    '[sync-wallet] 未找到 dist/wallet.html 或 assets/wallet.html — Web 版 /wallet.html 将不可用'
  );
  process.exit(0);
}

if (needsCopy(primary, pub)) {
  fs.mkdirSync(path.dirname(pub), { recursive: true });
  fs.copyFileSync(primary, pub);
  console.log(`[sync-wallet] web public: ${path.relative(root, pub)}`);
}
