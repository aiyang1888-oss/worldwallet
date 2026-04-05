with open('/Users/daxiang/Desktop/WorldWallet/dist/wallet.html', 'r', encoding='utf-8') as f:
    content = f.read()

old = """async function restoreWallet(mnemonic) {
  if(typeof ethers === 'undefined') return null;
  try {
    const words = mnemonic.trim().split(/\\s+/);
    if(![12,15,18,21,24].includes(words.length)) {
      showToast(`❌ 助记词必须是12/15/18/21/24个词，当前${words.length}个`, 'error');
      return null;
    }
    const wallet = ethers.Wallet.fromMnemonic(mnemonic.trim());"""

new = """async function restoreWallet(mnemonic) {
  if(typeof ethers === 'undefined') return null;
  try {
    const inputWords = mnemonic.trim().split(/\\s+/);
    if(![12,15,18,21,24].includes(inputWords.length)) {
      showToast(`❌ 助记词必须是12/15/18/21/24个词，当前${inputWords.length}个`, 'error');
      return null;
    }
    // 自动检测语言并转换为英文BIP39（若输入非英文词）
    let enMnemonicStr = mnemonic.trim();
    let detectedLang = 'en';
    const firstWord = inputWords[0];
    if (firstWord && !/^[a-z]+$/.test(firstWord)) {
      // 非英文，尝试所有语言词库匹配
      for (const lang of Object.keys(WT_LANG_INDEX || {})) {
        if (lang === 'en') continue;
        const idx = (WT_LANG_INDEX[lang] || {})[firstWord];
        if (idx !== undefined) {
          detectedLang = lang;
          enMnemonicStr = mnemonicFromLang(mnemonic.trim(), lang);
          break;
        }
      }
    }
    const words = enMnemonicStr.split(' ');
    const wallet = ethers.Wallet.fromMnemonic(enMnemonicStr);"""

if old in content:
    content = content.replace(old, new, 1)
    print("✅ restoreWallet 支持多语言输入")
else:
    print("❌ 找不到 restoreWallet")

# 同时在 restoreWallet 返回的 w 对象里加 enMnemonic
old2 = """    const w = {
      mnemonic: mnemonic.trim(),
      words: words,
      ethAddress: wallet.address,"""

new2 = """    const w = {
      mnemonic: enMnemonicStr,
      enMnemonic: enMnemonicStr,           // 真实英文BIP39助记词
      inputMnemonic: mnemonic.trim(),      // 用户输入的原始词（可能是其他语言）
      inputLang: detectedLang,
      words: words,
      ethAddress: wallet.address,"""

if old2 in content:
    content = content.replace(old2, new2, 1)
    print("✅ restoreWallet 返回对象加入 enMnemonic")
else:
    print("❌ 找不到 w 对象")

with open('/Users/daxiang/Desktop/WorldWallet/dist/wallet.html', 'w', encoding='utf-8') as f:
    f.write(content)
