#!/usr/bin/env python3
path = "/Users/daxiang/Desktop/WorldWallet/assets/wallet.html"
with open(path, encoding='utf-8') as f:
    c = f.read()

# 欢迎页两个按钮改为自适应宽度居中
old_btns = '''        <button class="btn-primary" onclick="goTo('page-create')" style="padding:13px;font-size:14px">🚀 开始使用</button>
        <button class="btn-secondary" onclick="goTo('page-import')" style="padding:10px;font-size:13px;margin-top:7px">📥 导入已有钱包</button>'''

new_btns = '''        <div style="display:flex;flex-direction:column;align-items:center;gap:10px">
          <button class="btn-primary" onclick="goTo('page-create')" style="padding:10px 32px;font-size:14px;width:auto;min-width:160px">🚀 开始使用</button>
          <button class="btn-secondary" onclick="goTo('page-import')" style="padding:8px 24px;font-size:13px;width:auto;min-width:140px">📥 导入已有钱包</button>
        </div>'''

if old_btns in c:
    c = c.replace(old_btns, new_btns, 1)
    print("✅ 按钮自适应宽度")
else:
    print("❌ 未找到按钮")

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

import shutil
shutil.copy(path, path.replace('assets', 'dist'))
print("✅ 已更新 dist")
