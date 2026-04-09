#!/usr/bin/env node
/**
 * 为 wallet.html 中的相对路径 script src / link href 追加 ?v=WW_ASSET_VER，减轻 CDN/浏览器强缓存导致「线上仍是旧 JS」。
 * 由 sync-assets.sh 在 rsync 之后调用；跳过已是绝对 URL、data:、含 ? 的地址。
 */
import fs from 'fs';

const verRaw = process.env.WW_ASSET_VER || 'dev';
const ver = String(verRaw).replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 40) || 'dev';

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('usage: WW_ASSET_VER=<ver> node scripts/inject-html-asset-query.mjs <html>...');
  process.exit(1);
}

function inject(html) {
  return html.replace(/\b(src|href)=(["'])([^"']*)\2/g, (full, attr, q, url) => {
    const u = String(url).trim();
    if (!u) return full;
    if (u.startsWith('#')) return full;
    if (/^https?:\/\//i.test(u) || u.startsWith('//')) return full;
    if (/^data:/i.test(u)) return full;
    if (/^mailto:/i.test(u) || /^javascript:/i.test(u)) return full;
    if (u.includes('?')) return full;
    return `${attr}=${q}${u}?v=${ver}${q}`;
  });
}

for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  fs.writeFileSync(f, inject(html), 'utf8');
}
