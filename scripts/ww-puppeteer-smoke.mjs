#!/usr/bin/env node
/**
 * 浏览器冒烟：本地静态服务 dist/，用 Puppeteer 打开 wallet.html，
 * 捕获 JS 异常与 console.error（依赖 ethers CDN，需网络）。
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const WWW = path.join(ROOT, 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
};

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME[ext] || 'application/octet-stream';
}

function createServer() {
  return http.createServer((req, res) => {
    try {
      const u = new URL(req.url || '/', 'http://127.0.0.1');
      let rel = u.pathname === '/' ? '/wallet.html' : u.pathname;
      if (rel.includes('..')) {
        res.writeHead(400);
        res.end();
        return;
      }
      const fp = path.join(WWW, rel);
      if (!fp.startsWith(WWW)) {
        res.writeHead(403);
        res.end();
        return;
      }
      fs.readFile(fp, (err, data) => {
        if (err) {
          res.writeHead(err.code === 'ENOENT' ? 404 : 500);
          res.end(err.code === 'ENOENT' ? 'Not found' : String(err));
          return;
        }
        res.setHeader('Content-Type', contentType(fp));
        res.writeHead(200);
        res.end(data);
      });
    } catch (e) {
      res.writeHead(500);
      res.end(String(e));
    }
  });
}

async function main() {
  const server = createServer();
  const port = await new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => {
      const a = server.address();
      resolve(typeof a === 'object' && a ? a.port : 0);
    });
    server.on('error', reject);
  });

  const url = `http://127.0.0.1:${port}/wallet.html`;
  const errors = [];
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
  } catch (e) {
    server.close();
    const msg = e && e.message ? e.message : String(e);
    console.warn('SKIP ww-puppeteer-smoke: 无法启动 Chromium —', msg.split('\n')[0]);
    console.warn('      安装: npx puppeteer browsers install chrome');
    process.exit(0);
  }
  try {
    const page = await browser.newPage();
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
    page.on('console', (msg) => {
      const t = msg.type();
      if (t === 'error') errors.push(`console.error: ${msg.text()}`);
    });

    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    if (!resp || !resp.ok()) {
      errors.push(`HTTP ${resp ? resp.status() : 'no response'} for ${url}`);
    }

    await page.waitForSelector('#page-welcome, .phone', { timeout: 30000 }).catch((e) => {
      errors.push(`selector: ${e.message}`);
    });

    // 等待 ethers 与首屏脚本（若 CDN 慢）
    await new Promise((r) => setTimeout(r, 2500));

    const hasWelcome = await page.evaluate(() => !!document.getElementById('page-welcome'));
    if (!hasWelcome) errors.push('missing #page-welcome');

    server.close();
    await browser.close();

    if (errors.length) {
      console.error('FAIL ww-puppeteer-smoke');
      errors.forEach((e) => console.error('  ', e));
      process.exit(1);
    }
    console.log(`OK ww-puppeteer-smoke (${url}) 无 pageerror / console.error`);
    process.exit(0);
  } catch (e) {
    try {
      server.close();
    } catch (_e) {}
    try {
      await browser.close();
    } catch (_e2) {}
    console.error('FAIL', e);
    process.exit(1);
  }
}

main();
