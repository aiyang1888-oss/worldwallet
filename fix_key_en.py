with open('/Users/daxiang/Desktop/WorldWallet/dist/wallet.html', 'r', encoding='utf-8') as f:
    content = f.read()

old = """  const isEn = currentLang === 'en';
  if(isEn) {
    // 英文：检查当前词是否是英文词，否则重新生成
    const currentWords = REAL_WALLET && REAL_WALLET.words;
    const isEnWords = currentWords && currentWords.length === 12 && /^[a-z]+$/.test(currentWords[0]);
    if(isEnWords) {
      words = currentWords;
    } else {
      // 用 BIP39 词表重新生成12个英文词
      words = generateLocalMnemonic().split(' ');
      if(REAL_WALLET) {
        REAL_WALLET.enWords = words; // 单独存英文词
      }
    }
  } else {"""

new = """  const isEn = currentLang === 'en';
  if(isEn) {
    // 英文：直接显示真实 BIP39 英文助记词
    const enMnemonic = REAL_WALLET && REAL_WALLET.enMnemonic;
    if (!enMnemonic) {
      showToast('请先创建或导入钱包', 'warning');
      goTo('page-create');
      return;
    }
    words = enMnemonic.split(' ');
  } else {"""

if old in content:
    content = content.replace(old, new, 1)
    print("✅ 英文分支改用 enMnemonic")
else:
    print("❌ 找不到")

with open('/Users/daxiang/Desktop/WorldWallet/dist/wallet.html', 'w', encoding='utf-8') as f:
    f.write(content)
