import re

with open('/Users/daxiang/Desktop/WorldWallet/dist/wallet.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 修复双逗号 ],, -> ],
count = content.count('],,')
print(f"找到 {count} 处 ],,")
fixed = content.replace('],,', '],')

with open('/Users/daxiang/Desktop/WorldWallet/dist/wallet.html', 'w', encoding='utf-8') as f:
    f.write(fixed)

print(f"✅ 修复完成！")
