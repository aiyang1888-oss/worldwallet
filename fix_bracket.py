with open('/Users/daxiang/Desktop/WorldWallet/dist/wallet.html', 'r', encoding='utf-8') as f:
    content = f.read()

# WW_WORDS_EXTRA 里 zh 词库末尾有 ]], 应该是 ],
count = content.count(']],\n  en:')
print(f"找到 {count} 处 ]],")
content = content.replace(']],\n  en:', '],\n  en:', 1)

with open('/Users/daxiang/Desktop/WorldWallet/dist/wallet.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("✅ 修复完成")
