import re

with open('/Users/daxiang/Desktop/WorldWallet/dist/wallet.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 找出所有字母间的单引号（城市名撇号）
matches = re.findall(r"[a-zA-Z]'[a-zA-Z]", content)
print(f"找到 {len(matches)} 处城市名内嵌单引号（如 N'Goussa、O'Connor、T'alin）")

# 替换：字母之间的单引号 → 转义 \'
fixed = re.sub(r"([a-zA-Z])'([a-zA-Z])", r"\1\\'\2", content)

with open('/Users/daxiang/Desktop/WorldWallet/dist/wallet.html', 'w', encoding='utf-8') as f:
    f.write(fixed)

print(f"✅ 修复完成！文件大小: {len(fixed):,} 字节")
