#!/usr/bin/env python3
"""
watch-push.py — 每5秒检测文件变动，有改动立即 commit + push
"""
import os, time, subprocess, shutil

REPO = '/Users/daxiang/Desktop/Projects/WorldWallet'
ENV  = {**os.environ, 'PATH': '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin', 'HOME': '/Users/daxiang'}
SYNC_PAIRS = [
    ('dist/wallet.ui.js',       'assets/wallet.ui.js'),
    ('dist/wallet.runtime.js',  'assets/wallet.runtime.js'),
    ('dist/wallet.addr.js',     'assets/wallet.addr.js'),
    ('dist/wallet.tx.js',       'assets/wallet.tx.js'),
    ('dist/wallet.core.js',     'assets/wallet.core.js'),
    ('dist/wallet.css',         'assets/wallet.css'),
    ('dist/wallet.dom-bind.js', 'assets/wallet.dom-bind.js'),
    ('dist/wallet.html',        'assets/wallet.html'),
    ('dist/index.html',         'assets/index.html'),
    ('dist/app.html',           'assets/app.html'),
]

def git(args):
    return subprocess.run(['git'] + args, cwd=REPO, env=ENV,
                         capture_output=True, text=True)

def sync_dist_to_assets():
    for src_rel, dst_rel in SYNC_PAIRS:
        src = os.path.join(REPO, src_rel)
        dst = os.path.join(REPO, dst_rel)
        if os.path.exists(src) and os.path.exists(dst):
            if os.path.getmtime(src) != os.path.getmtime(dst):
                shutil.copy2(src, dst)

def commit_push():
    status = git(['status', '--porcelain']).stdout.strip()
    if not status:
        return
    sync_dist_to_assets()
    git(['add', '-A'])
    staged = git(['diff', '--cached', '--name-only']).stdout.strip()
    if not staged:
        return
    ts = time.strftime('%H:%M:%S')
    files = staged.replace('\n', ' ')[:80]
    r = git(['commit', '-m', f'auto[{ts}]: {files}', '--no-verify'])
    print(f'[watch-push] commit: {r.stdout.strip()[:80]}')
    r2 = git(['push', 'origin', 'HEAD'])
    print(f'[watch-push] push: {r2.stdout.strip()[:60] or r2.stderr.strip()[:60]}')

print(f'[watch-push] 启动，每5秒检测 {REPO}')
while True:
    try:
        commit_push()
    except Exception as e:
        print(f'[watch-push] 错误: {e}')
    time.sleep(5)
