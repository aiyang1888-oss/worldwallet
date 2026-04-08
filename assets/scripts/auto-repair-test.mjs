import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    if (ent.name === '.git') continue;
    const p = join(dir, ent.name);
    if (ent.isDirectory()) yield* walk(p);
    else yield p;
  }
}

let exitCode = 0;
for (const p of walk(root)) {
  if (!p.endsWith('.js')) continue;
  try {
    execFileSync(process.execPath, ['--check', p], { stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    const stderr = e.stderr ? e.stderr.toString() : '';
    console.error('CHECK FAIL', relative(root, p), stderr || e.message);
    exitCode = 1;
  }
}
process.exit(exitCode);
