with open('/Users/daxiang/Desktop/WorldWallet/dist/wallet.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 找所有 ]], 模式并修复（数组里的数组错误）
import re

# 找 ]],\n  [a-zA-Z']: 这种模式（词库key之间多了一个]）
old_count = len(re.findall(r'\]\],\n  [a-z]', content))
fixed = re.sub(r'\]\],(\n  [a-z])', r'],\1', content)
new_count = len(re.findall(r'\]\],\n  [a-z]', fixed))
print(f"修复了 {old_count - new_count} 处 ]],")

with open('/Users/daxiang/Desktop/WorldWallet/dist/wallet.html', 'w', encoding='utf-8') as f:
    f.write(fixed)
print("完成")
