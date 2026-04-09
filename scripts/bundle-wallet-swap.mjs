#!/usr/bin/env node
import * as esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const entry = path.join(root, 'dist/wallet.swap.entry.js');
const outfile = path.join(root, 'dist/wallet.swap.js');

await esbuild.build({
  entryPoints: [entry],
  bundle: true,
  outfile,
  format: 'iife',
  platform: 'browser',
  target: ['es2020'],
  legalComments: 'none',
  logLevel: 'info'
});

console.log('✅ bundled', path.relative(root, outfile));
