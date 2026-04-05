with open('/Users/daxiang/Desktop/WorldWallet/dist/wallet.html', 'r', encoding='utf-8') as f:
    content = f.read()

# createRealWallet 要改成 async（里面有 await）
content = content.replace('function createRealWallet() {', 'async function createRealWallet() {', 1)

# 同时修复调用方：onclick="createRealWallet()" 要改成 onclick="createRealWallet().catch(e=>showToast(e.message,'error'))"
# 先不动，goTo('page-create') 先跳页，实际创建在另一个按钮

with open('/Users/daxiang/Desktop/WorldWallet/dist/wallet.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ createRealWallet 改为 async")

# 验证
import subprocess, re
with open('/Users/daxiang/Desktop/WorldWallet/dist/wallet.html') as f:
    html = f.read()
scripts = re.findall(r'<script(?![^>]*src)[^>]*>(.*?)</script>', html, re.DOTALL)
main = max(scripts, key=len)
cleaned = main.replace('async function', 'function').replace('await ', '')
with open('/tmp/wallet_new.html', 'w') as f: f.write(html)

chk = '''
const fs = require('fs');
const html = fs.readFileSync('/tmp/wallet_new.html','utf-8');
const ms = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\\s\\S]*?)<\\/script>/g)];
const main = ms.map(m=>m[1]).reduce((a,b)=>a.length>b.length?a:b,'');
const c = main.replace(/\\basync\\s+function\\b/g,'function').replace(/\\bawait\\b/g,'');
try{new Function(c);process.stdout.write('OK');}catch(e){process.stdout.write('ERR:'+e.message);}
'''
with open('/tmp/chk3.js','w') as f: f.write(chk)
r = subprocess.run(['node','/tmp/chk3.js'], capture_output=True, text=True, timeout=30)
print("语法检查:", r.stdout + r.stderr)
