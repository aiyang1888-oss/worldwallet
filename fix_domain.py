import re
with open('/Users/daxiang/Desktop/WorldWallet/dist/wallet.html', 'r', encoding='utf-8') as f:
    c = f.read()

# 替换所有 worldtoken.co（不含 .com .cc 后缀）
fixed = re.sub(r'worldtoken\.co(?![mc])', 'worldtoken.cc', c)
count = c.count('worldtoken.co') - fixed.count('worldtoken.co')
print(f"替换 {count} 处 worldtoken.co → worldtoken.cc")

with open('/Users/daxiang/Desktop/WorldWallet/dist/wallet.html', 'w', encoding='utf-8') as f:
    f.write(fixed)
