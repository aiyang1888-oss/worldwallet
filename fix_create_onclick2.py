with open('/Users/daxiang/Desktop/WorldWallet/dist/wallet.html', 'r', encoding='utf-8') as f:
    content = f.read()

old = "if(w){REAL_WALLET=w;saveWallet(w);"
new = "if(w){window.REAL_WALLET=w;saveWallet(w);"

if old in content:
    content = content.replace(old, new, 1)
    print("✅ 修复完成")
else:
    print("❌ 找不到")

with open('/Users/daxiang/Desktop/WorldWallet/dist/wallet.html', 'w', encoding='utf-8') as f:
    f.write(content)
