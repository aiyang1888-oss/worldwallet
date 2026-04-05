with open('/Users/daxiang/Desktop/WorldWallet/dist/wallet.html', 'r', encoding='utf-8') as f:
    content = f.read()

old = '📋 跳过验证，标记为已备份'
new = '⏭️ 暂时忽略验证'

count = content.count(old)
content = content.replace(old, new)
print(f"替换 {count} 处")

with open('/Users/daxiang/Desktop/WorldWallet/dist/wallet.html', 'w', encoding='utf-8') as f:
    f.write(content)
