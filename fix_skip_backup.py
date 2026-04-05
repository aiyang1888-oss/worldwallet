with open('/Users/daxiang/Desktop/WorldWallet/dist/wallet.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 按钮 onclick 从 markBackupDone() 改成直接跳转，不标记备份
old = 'onclick="markBackupDone();goTo(window._keyBackPage||\'page-settings\')" style="margin-top:8px;background:linear-gradient(135deg,#26a17b,#1a7a5e);border-radius:14px;padding:13px 0;text-align:center;font-size:14px;font-weight:700;color:#fff;cursor:pointer">⏭️ 暂时忽略验证'
new = 'onclick="goTo(window._keyBackPage||\'page-settings\')" style="margin-top:8px;background:rgba(100,100,120,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:13px 0;text-align:center;font-size:14px;font-weight:700;color:rgba(255,255,255,0.5);cursor:pointer">⏭️ 暂时忽略验证'

if old in content:
    content = content.replace(old, new, 1)
    print("✅ 按钮逻辑修复：暂时忽略不再标记已备份，样式改为灰色低调")
else:
    print("❌ 找不到，检查一下")
    idx = content.find('暂时忽略验证')
    print(content[idx-200:idx+50])

with open('/Users/daxiang/Desktop/WorldWallet/dist/wallet.html', 'w', encoding='utf-8') as f:
    f.write(content)
