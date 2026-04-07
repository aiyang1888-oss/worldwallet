# WorldToken 设计规范 v1.0

**日期:** 2026-04-07  
**版本:** 1.0  
**状态:** 核心设计确认

---

## 1. 本地语言助记词系统

### 核心原理

**不是翻译 BIP39，而是直接用本地文化符号替代。**

#### 为中文用户生成助记词

```
用户选择：中文简体

系统生成的 BIP39 词（内部使用，用户看不到）：
["abandon", "ability", "able", "about", "above", "absent", ...]

查表转换（中文词库）：
["金", "木", "水", "火", "土", "天", ...]

显示给用户（用户看到和记忆的）：
金 木 水 火 土 天 地 日 月 星 云 雨 ...

验证时，用户输入中文字，系统反向查表转换为 BIP39，再调用 ethers.js 派生私钥。
```

### 各语言词库设计

#### 中文简体（Simplified Chinese）

**词库来源：** 五行八卦 + 常用汉字

```
0: 金
1: 木
2: 水
3: 火
4: 土
5: 天
6: 地
7: 日
8: 月
9: 星
10: 云
11: 雨
12: 风
13: 雷
14: 电
15: 冰
16: 雪
17: 山
18: 河
19: 海
...
2047: (最后一个常用字)
```

**为什么选择五行八卦 + 常用字？**
- ✅ 文化内核 — 中国传统文化符号，所有华人都认识
- ✅ 易记忆 — 从小学就学过，不需要额外学习
- ✅ 易口头传达 — "金木水火土"可用普通话标准传达，无方言歧义
- ✅ 易错误检测 — 字体清晰，不会混淆

#### 日文（Japanese）

**词库来源：** 五十音图（あいうえお～ん）

```
0: あ
1: い
2: う
3: え
4: お
5: か
6: き
7: く
8: け
9: こ
...
45: ん
46-2047: (常用日文汉字和词汇)
```

**为什么选择五十音图？**
- ✅ 标准化 — 所有日文使用者都学过，唯一标准
- ✅ 无方言差异 — 不像汉字有多音字问题
- ✅ 易口头传达 — "あいうえお" 发音标准

#### 英文（English）

**词库来源：** BIP39 标准词表

```
0: abandon
1: ability
2: able
3: about
4: above
5: absent
...
2047: zone
```

### 密钥派生兼容性

**关键：保持与 BIP39 和 ethers.js 的完全兼容**

```javascript
// 用户看到的（中文）
const userMnemonic = "金 木 水 火 土 天 地 日 月 星";

// 系统内部转换
const bip39Mnemonic = "abandon ability able about above absent absorb abstract absurd abuse";

// 调用 ethers.js（完全标准）
const wallet = ethers.Wallet.fromMnemonic(bip39Mnemonic);

// 生成的私钥、地址完全标准，可被任何 BIP39 钱包识别
```

---

## 2. 万语地址系统（WWA）

### 格式定义

```
[8位随机数字] - [10个本地语言单字/单词] - [8位随机数字]

例如：
中文：   12345678-金木水火土天地日月星-87654321
日文：   24681357-あいうえおかきくけこ-13579246
英文：   11111111-abandon-ability-able-about-above-absent-absorb-abstract-absurd-abuse-22222222
混合：   99999999-金-able-月-about-土-absent-地-abstract-星-absurd-88888888
```

### 设计思路

#### 为什么是这个格式？

**[8数字]-[10单词]-[8数字]**

1. **前 8 位随机数字**
   - 提供安全熵
   - 用户记不住，依赖系统
   - 防止用户仅使用中间词汇导致碰撞

2. **中间 10 个单词**
   - 足够安全（10 × 2048 = 2^120+ 组合）
   - 用户可口头传达（20-30 秒说完）
   - 用户可记忆（十个词是人脑极限）

3. **后 8 位随机数字**
   - 再次提供熵
   - 镜像前缀，增强对称感
   - 防止地址部分泄露

### 单词来源

每个位置的单词来自该语言的 2048-词库的对应位置。

```
地址末尾 10 字节：[0x1A, 0x2B, 0x3C, 0x4D, 0x5E, 0x6F, 0x7A, 0x8B, 0x9C, 0x0D]
          ↓
转十进制：[26, 43, 60, 77, 94, 111, 122, 139, 156, 13]
          ↓
中文词库查表：
  26  → "天"
  43  → "雨"
  60  → "河"
  77  → "海"
  94  → "树"
  111 → "花"
  122 → "草"
  139 → "石"
  156 → "沙"
  13  → "雷"
          ↓
显示给用户：12345678-天雨河海树花草石沙雷-87654321
```

### 多语言支持

**用户可选择：**

1. **单语言模式** — 10 个词都来自同一语言
   ```
   中文单语言：12345678-金木水火土天地日月星-87654321
   ```

2. **混合语言模式** — 10 个词来自不同语言
   ```
   中文+英文混合：12345678-金-ability-木-about-水-absent-火-abstract-土-absurd-87654321
   日文+英文混合：12345678-あ-ability-い-about-う-absent-え-abstract-お-absurd-87654321
   三语言混合：   12345678-金-ability-あ-about-木-absent-い-abstract-水-absurd-87654321
   ```

**为什么支持混合语言？**
- ✅ **国际化** — 跨国团队、国际钱包可用
- ✅ **灵活性** — 用户自己选择最舒适的语言组合
- ✅ **无障碍** — 多语言用户可用自己熟悉的多种语言

---

## 3. 用户体验流程

### 创建钱包流程

```
1. 欢迎页
   ↓
2. 选择"创建新钱包"
   ↓
3. 选择语言（中文/日文/英文/混合等）
   ↓
4. 系统内部生成 BIP39 英文助记词（ethers.js）
   ↓
5. 转换为用户选择的语言
   ↓
6. 显示给用户（例如中文：金 木 水 火 土 天 地 日 月 星...）
   ↓
7. 用户抄写并离线保存
   ↓
8. 验证：系统随机抽查 3-4 个词，用户输入对应的词
   ↓
9. 验证成功 → 设置 PIN 码
   ↓
10. 设置 PIN（6 位数字）
   ↓
11. 钱包创建完成
    - 私钥已生成（本地保存）
    - 地址已生成（显示万语地址格式）
    - 用户可查看资产和进行转账
```

### 转账流程（使用万语地址）

```
发送方：
1. 点击"发送"
2. 选择链（Tron/Ethereum）
3. 输入接收方地址
   - 方式 A：粘贴标准地址（0x... 或 T...）
   - 方式 B：粘贴万语地址（12345678-金木水火-87654321）
4. 系统自动识别地址类型，转换为标准地址
5. 输入金额
6. 确认交易
7. 本地签名
8. 广播

接收方：
1. 告诉发送方：发送到我的"万语地址"
2. 给出万语地址：12345678-金木水火土天地日月星-87654321
3. 发送方听到或看到：
   "前缀：1, 2, 3, 4, 5, 6, 7, 8"
   "中间：金、木、水、火、土、天、地、日、月、星"
   "后缀：8, 7, 6, 5, 4, 3, 2, 1"
4. 接收方确认收到对方确认
5. 点击确认 ✓
```

**对比传统方式：**

| 操作 | 传统地址 | 万语地址 |
|------|--------|--------|
| 口头传达 | ❌ 不可能 | ✅ "金木水火..." 10 秒说完 |
| 短信验证 | ❌ 易出错 | ✅ 用词义识别 |
| 防钓鱼 | ❌ 难辨别 | ✅ 词汇一致性检查 |
| 记忆 | ❌ 不可能 | ✅ 可记住 10 个词 |
| 视觉确认 | ❌ 40 个字符 | ✅ 10 个单词 |

---

## 4. 技术实现要点

### 文件结构

```
wallet-shell/
├── wordlists/
│   ├── en.json          # BIP39 英文词库（2048）
│   ├── zh-cn.json       # 中文简体（五行八卦 + 汉字）
│   ├── zh-tw.json       # 中文繁体
│   ├── ja.json          # 日文（五十音 + 汉字）
│   ├── ko.json          # 韩文
│   ├── ar.json          # 阿拉伯文
│   └── ...              # 其他语言
├── wallet.core.js       # 钱包生成、加密、存储
├── wallet.ui.js         # UI 交互、页面管理
├── wallet.addr.js       # 万语地址生成和转换
└── index.html           # 主页面
```

### 关键函数

```javascript
// 生成本地语言助记词（中文为例）
function generateLocalizedMnemonic(language, wordCount = 12) {
  // 1. 生成 BIP39 英文助记词
  const enMnemonic = ethers.utils.entropyToMnemonic(
    ethers.utils.randomBytes(16)
  ); // 12 词的 128 bits 熵
  
  // 2. 转换为本地语言
  const enWords = enMnemonic.split(' ');
  const wordlist = getWordlist(language);
  const localizedWords = enWords.map(word => {
    const index = BIP39_WORDLIST.indexOf(word);
    return wordlist[index];
  });
  
  // 3. 返回本地语言版本
  return localizedWords.join(' ');
}

// 验证本地语言助记词并派生私钥
function verifyAndDerivePrivateKey(localizedMnemonic, language) {
  // 1. 本地语言反向转换为 BIP39
  const localWords = localizedMnemonic.split(' ');
  const wordlist = getWordlist(language);
  const bip39Words = localWords.map(word => {
    const index = wordlist.indexOf(word);
    return BIP39_WORDLIST[index];
  });
  const bip39Mnemonic = bip39Words.join(' ');
  
  // 2. 标准 BIP39 派生
  const wallet = ethers.Wallet.fromMnemonic(bip39Mnemonic);
  
  return wallet.privateKey;
}

// 生成万语地址
function generateWWAddress(baseAddress, language) {
  // 1. 生成前缀数字
  const prefix = Math.floor(Math.random() * 100000000)
    .toString()
    .padStart(8, '0');
  
  // 2. 生成后缀数字
  const suffix = Math.floor(Math.random() * 100000000)
    .toString()
    .padStart(8, '0');
  
  // 3. 提取地址末尾 10 字节
  const hexAddress = baseAddress.replace('0x', '');
  const last20chars = hexAddress.slice(-20);
  
  // 4. 转换为 10 个词索引
  const wordlist = getWordlist(language);
  const words = [];
  for (let i = 0; i < 10; i++) {
    const byte = parseInt(last20chars.substr(i * 2, 2), 16);
    const index = byte % wordlist.length; // 安全地映射到词库
    words.push(wordlist[index]);
  }
  
  // 5. 拼装
  return `${prefix}-${words.join('')}-${suffix}`;
}

// 解析和验证万语地址
function parseWWAddress(wwAddress, language) {
  const parts = wwAddress.split('-');
  if (parts.length !== 3) throw new Error('Invalid WWA format');
  
  const [prefix, wordString, suffix] = parts;
  
  // 验证前后缀
  if (!/^\d{8}$/.test(prefix) || !/^\d{8}$/.test(suffix)) {
    throw new Error('Invalid prefix or suffix');
  }
  
  // 验证中间词汇数量（根据语言的字长）
  const wordlist = getWordlist(language);
  let words = [];
  
  if (language === 'ja') {
    // 日文每个词是一个字符
    words = wordString.split('');
  } else if (language === 'zh-cn') {
    // 中文每个词是一个字符
    words = wordString.split('');
  } else {
    // 其他语言以空格或特定分隔符分隔
    words = wordString.split('-');
  }
  
  if (words.length !== 10) {
    throw new Error('Must have exactly 10 words');
  }
  
  // 验证所有词都在词库中
  words.forEach(word => {
    if (!wordlist.includes(word)) {
      throw new Error(`Word "${word}" not found in ${language} wordlist`);
    }
  });
  
  return { prefix, words, suffix };
}
```

---

## 5. 安全考虑

### ✅ 已有保护

1. **私钥本地生成和存储** — 永不上传到服务器
2. **BIP39 标准兼容** — 使用 ethers.js，不创建新密钥标准
3. **本地语言词库**——来自人类熟悉的符号（五行八卦、五十音等），不是随意创造
4. **万语地址的随机性** — 前后各 8 位随机数字 + 10 个词位置的随机性，足以防止碰撞

### 🔄 需要持续关注

1. **词库的完整性和准确性** — 确保没有重复或缺失的词
2. **多语言翻译质量** — 确保用户看到的词是正确的本地语言
3. **用户教育** — 用户理解"万语地址"的用途和限制
4. **浏览器安全** — CSP 政策、iframe 隔离、Service Worker 签名验证

---

## 6. 实现优先级

### Phase 1（MVP - 2026 Q2）

- [x] 英文 BIP39（标准）
- [ ] 中文简体 + 中文繁体
- [ ] 基础万语地址（单语言模式）
- [ ] 钱包创建、导入、转账的核心流程
- [ ] Ethereum + Tron 支持

### Phase 2（2026 Q3）

- [ ] 日文、韩文、阿拉伯文支持
- [ ] 万语地址混合语言模式
- [ ] Bitcoin 完整支持
- [ ] 硬钱包集成（Ledger）

### Phase 3（2026 Q4+）

- [ ] 所有 120+ 语言支持
- [ ] 高级功能（DeFi、NFT）
- [ ] iOS/Android 原生应用

---

## 总结

WorldToken 的设计核心：

**本地化不妥协 + 标准不牺牲 + 易用不复杂**

用户用母语创建和管理钱包，系统内部保持与 BIP39 的完全兼容，外部显示万语地址而不是冷硬的十六进制。

这是真正的**全球多语言钱包**。

