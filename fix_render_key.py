with open('/Users/daxiang/Desktop/WorldWallet/dist/wallet.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 替换 renderKeyGrid 里的非英文逻辑
old = """  } else {
    // 非英文：每次根据当前语言重新随机选词
    const pool = SAMPLE_KEYS[currentLang] || SAMPLE_KEYS.zh;
    const mnLen = parseInt(document.getElementById('mnemonicLength')?.value || '12');
    const indices = [];
    while(indices.length < mnLen) {
      const idx = Math.floor(Math.random() * pool.length);
      if(!indices.includes(idx)) indices.push(idx);
    }
    words = indices.map(i => pool[i]);
    // 保存到 REAL_WALLET
    if(!REAL_WALLET) {
      REAL_WALLET = {ethAddress:'', trxAddress:'', worldPrefix:'12345678', worldSuffix:'87654321', worldChars:[]};
    }
    if(!REAL_WALLET.backedUp) REAL_WALLET.words = words; // 已备份则不覆盖
    REAL_WALLET.mnemonic = words.join(' ');
    saveWallet(REAL_WALLET);
  }"""

new = """  } else {
    // 非英文：把真实英文助记词转换为目标语言（索引对应BIP39，双向可逆）
    const enMnemonic = REAL_WALLET && REAL_WALLET.enMnemonic;
    if (!enMnemonic) {
      // 没有真实助记词，先跳回创建
      showToast('请先创建或导入钱包', 'warning');
      goTo('page-create');
      return;
    }
    const langMnemonic = mnemonicToLang(enMnemonic, currentLang);
    words = langMnemonic.split(' ');
    // 存储当前语言词（仅展示用，enMnemonic 是真实密钥）
    if (REAL_WALLET) {
      REAL_WALLET.displayLang = currentLang;
      REAL_WALLET.displayWords = words;
    }
  }"""

if old in content:
    content = content.replace(old, new, 1)
    print("✅ renderKeyGrid 逻辑修复完成")
else:
    print("❌ 找不到目标代码")

with open('/Users/daxiang/Desktop/WorldWallet/dist/wallet.html', 'w', encoding='utf-8') as f:
    f.write(content)
