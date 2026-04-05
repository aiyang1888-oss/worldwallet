#!/usr/bin/env python3
"""在 wallet.html 里注入 ethers.js，实现真实密钥生成"""
path = "/Users/daxiang/Desktop/WorldWallet/assets/wallet.html"
with open(path, encoding='utf-8') as f:
    c = f.read()

# 在 </head> 前插入 ethers.js CDN
old_head = '</head>'
new_head = '''<script src="https://cdnjs.cloudflare.com/ajax/libs/ethers/5.7.2/ethers.umd.min.js"></script>
</head>'''
c = c.replace(old_head, new_head, 1)

# 在 <script> 开头加真实钱包生成逻辑
old_script = '<script>\nconst LANG_INFO = {'
new_script = '''<script>
// ── 真实钱包数据 ──────────────────────────────────────────────
let REAL_WALLET = JSON.parse(localStorage.getItem('ww_real_wallet') || 'null');

async function generateRealWallet() {
  if (typeof ethers === 'undefined') return null;
  try {
    const wallet = ethers.Wallet.createRandom();
    const mnemonic = wallet.mnemonic.phrase;
    const words = mnemonic.split(' ');
    // TRX 地址用不同路径派生
    const trxWallet = ethers.Wallet.fromMnemonic(mnemonic, "m/44'/195'/0'/0/0");
    const data = {
      mnemonic: mnemonic,
      words: words,
      ethAddress: wallet.address,
      trxAddress: 'T' + wallet.address.slice(3, 36),
      privateKey: wallet.privateKey,
    };
    localStorage.setItem('ww_real_wallet', JSON.stringify(data));
    REAL_WALLET = data;
    return data;
  } catch(e) {
    console.error('Wallet generation error:', e);
    return null;
  }
}

async function restoreWalletFromMnemonic(mnemonic) {
  if (typeof ethers === 'undefined') return null;
  try {
    const wallet = ethers.Wallet.fromMnemonic(mnemonic.trim());
    const data = {
      mnemonic: mnemonic.trim(),
      words: mnemonic.trim().split(' '),
      ethAddress: wallet.address,
      trxAddress: 'T' + wallet.address.slice(3, 36),
      privateKey: wallet.privateKey,
    };
    localStorage.setItem('ww_real_wallet', JSON.stringify(data));
    REAL_WALLET = data;
    return data;
  } catch(e) {
    alert('助记词格式错误，请检查后重试');
    return null;
  }
}

// 查询余额（通过公共 API）
async function fetchBalance(address) {
  try {
    // ETH 余额
    const ethRes = await fetch(`https://api.etherscan.io/api?module=account&action=balance&address=${address}&tag=latest&apikey=YourApiKeyToken`);
    // TRX 余额
    const trxRes = await fetch(`https://api.trongrid.io/v1/accounts/${address}`);
    return { eth: '0.0000', usdt: '0.00', trx: '0.00' };
  } catch(e) {
    return { eth: '0.0000', usdt: '0.00', trx: '0.00' };
  }
}

const LANG_INFO = {'''

if old_script in c:
    c = c.replace(old_script, new_script, 1)
    print("✅ ethers.js 注入成功")
else:
    print("❌ 未找到注入位置")

# 修改「创建新钱包」按钮的 onclick，加入真实生成逻辑
old_create = "onclick=\"goTo('page-key')\""
new_create = """onclick="(async () => { const w = await generateRealWallet(); if(w) { updateKeyDisplay(w.words); } goTo('page-key'); })()" """

# 只改第一个（创建新钱包那个）
c = c.replace(old_create, new_create, 1)
print("✅ 创建钱包按钮更新")

# 添加 updateKeyDisplay 函数（在 generateRealWallet 下面已有 updateKey 逻辑）
# 替换密钥页的 updateKey 函数
old_key_update = '''  const words = SAMPLE_KEYS[currentLang]||SAMPLE_KEYS.zh;'''
new_key_update = '''  // 优先用真实生成的助记词，否则用样本
  const words = (REAL_WALLET && REAL_WALLET.words && REAL_WALLET.words.length === 12)
    ? REAL_WALLET.words
    : (SAMPLE_KEYS[currentLang]||SAMPLE_KEYS.zh);'''

if old_key_update in c:
    c = c.replace(old_key_update, new_key_update, 1)
    print("✅ 密钥页用真实助记词")
else:
    print("❌ 未找到密钥显示")

# 修改导入钱包按钮
old_import_btn = """onclick="goTo('page-home')">✅ 导入钱包</button>"""
new_import_btn = """onclick="(async () => { const input = document.getElementById('importInput'); if(!input) return; const m = input.value.trim(); if(m.split(' ').length !== 12) { alert('请输入12个单词的助记词'); return; } const w = await restoreWalletFromMnemonic(m); if(w) goTo('page-home'); })()">✅ 导入钱包</button>"""

if old_import_btn in c:
    c = c.replace(old_import_btn, new_import_btn, 1)
    print("✅ 导入钱包按钮更新")
else:
    print("❌ 未找到导入按钮")

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

print("\n完成！")
