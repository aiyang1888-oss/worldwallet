with open('/Users/daxiang/Desktop/WorldWallet/dist/wallet.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 在 SAMPLE_KEYS 里，每个词库 key 结束的 ] 后面必须有逗号
# 模式：] 换行 然后 两个空格加语言code:
import re
# 找 SAMPLE_KEYS 里的 ]\n  xx: 模式，加逗号
fixed = re.sub(r'(\])\n(  [a-z]{2}:[\'{\[])', r'\1,\n\2', content)
count = content.count(']\n  ') 
print(f"检查 {count} 处，替换后大小: {len(fixed)//1024}KB")

with open('/Users/daxiang/Desktop/WorldWallet/dist/wallet.html', 'w', encoding='utf-8') as f:
    f.write(fixed)
print("完成")
