with open('/Users/daxiang/Desktop/WorldWallet/dist/wallet.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 在 wallet 对象里加 enMnemonic 字段
old = """      mnemonic: mnemonic,
      words: mnemonic.split(' '),
      ethAddress: wallet.address,        // 标准 42 字符 ETH 地址"""

new = """      mnemonic: mnemonic,
      enMnemonic: mnemonic,              // 始终保存英文BIP39助记词（真实密钥）
      words: mnemonic.split(' '),
      ethAddress: wallet.address,        // 标准 42 字符 ETH 地址"""

if old in content:
    content = content.replace(old, new, 1)
    print("✅ wallet 对象加入 enMnemonic 字段")
else:
    print("❌ 找不到")

# 同时修复导入钱包逻辑：导入时也要保存 enMnemonic，并支持从非英文词还原
# 找 restoreWallet 函数
idx = content.find('async function restoreWallet(mnemonic)')
print(f"restoreWallet 位置: {idx}")

with open('/Users/daxiang/Desktop/WorldWallet/dist/wallet.html', 'w', encoding='utf-8') as f:
    f.write(content)
