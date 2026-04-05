#!/usr/bin/env python3
import subprocess, re

SRC = '/Users/daxiang/Desktop/WorldWallet/dist/wallet.html'

with open(SRC, 'r', encoding='utf-8') as f:
    lines = f.readlines()

start = next(i for i,l in enumerate(lines) if 'const WW_WORDS_EXTRA = {' in l)
end = next(i for i in range(start+1, len(lines)) if lines[i].strip() == '};')
print(f"替换第{start+1}~{end+1}行，共{end-start+1}行")

CLEAN = open('/tmp/clean_words.txt').read()
new_content = ''.join(lines[:start]) + CLEAN + ''.join(lines[end+1:])
print(f"新文件大小: {len(new_content)//1024}KB")

# 写临时文件
with open('/Users/daxiang/Desktop/WorldWallet/dist/wallet_new.html', 'w', encoding='utf-8') as f:
    f.write(new_content)

# 用 node 检查（排除 await 误报）
check = '''
const fs = require('fs');
const html = fs.readFileSync('/Users/daxiang/Desktop/WorldWallet/dist/wallet_new.html', 'utf-8');
const ms = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\\s\\S]*?)<\\/script>/g)];
const main = ms.map(m=>m[1]).reduce((a,b)=>a.length>b.length?a:b,'');
// 移除 await 再检查纯语法
const noawait = main.replace(/\\bawait\\b/g,'/*await*/');
try { new Function(noawait); process.stdout.write('OK'); }
catch(e) { process.stdout.write('ERR:'+e.message); }
'''
with open('/tmp/chk.js','w') as f: f.write(check)

result = subprocess.run(['node', '/tmp/chk.js'], capture_output=True, text=True, timeout=60)
out = result.stdout + result.stderr
print("检查结果:", out.strip())

import os
os.remove('/Users/daxiang/Desktop/WorldWallet/dist/wallet_new.html')

if out.strip() == 'OK':
    with open(SRC, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"✅ 写入完成，文件大小: {len(new_content)//1024}KB")
else:
    print("❌ 还有语法错误，未写入")
    # 定位错误
    err = out.strip()
    print(f"错误: {err}")
