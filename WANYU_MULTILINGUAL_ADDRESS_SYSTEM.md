# WorldWallet 万语地址与多语言地名助记词系统文档

**文档版本**: 1.0  
**最后更新**: 2026-04-08 GMT+7  
**系统名称**: 万语地址(WanYu Address) + 多语言地名助记词  
**文档类型**: 文字版本（可直接复制）  

---

## 目录

1. [系统概览](#系统概览)
2. [万语地址介绍](#万语地址介绍)
3. [多语言地名助记词](#多语言地名助记词)
4. [核心实现](#核心实现)
5. [使用示例](#使用示例)
6. [技术规范](#技术规范)
7. [常见问题](#常见问题)

---

## 系统概览

### 什么是万语地址？

**万语地址(WanYu Address)**是WorldWallet独创的地址展示体系，具有以下特点：

```
特点 1: 用户友好性
├─ 摒弃冗长的钱包地址 (如 0x1234567890...)
├─ 用 10 个地名汉字 + 16 位数字前后缀展示地址
└─ 示例: 12345678-上海北京广州深圳成都-87654321

特点 2: 多链统一身份
├─ 同一钱包在不同链上派生的地址
├─ 通过统一的 10 字地名组合展示
└─ 便于用户识别和记忆

特点 3: 多语言支持
├─ 中文: 2048 个地名(汉字)
├─ 英文: 2048 个标准 BIP39 单词
└─ 未来支持: 日文、韩文、西班牙文等

特点 4: 去中心化生成
├─ 完全基于用户的助记词派生
├─ 无服务器依赖
├─ 用户可自验证地址对应性
```

### 系统架构

```
用户助记词
    ↓
[BIP-39 转换]
    ↓
[链派生]
    ├─ TRX 链地址 → TRON 地址
    ├─ ETH 链地址 → Ethereum 地址
    └─ BTC 链地址 → Bitcoin 地址
    ↓
[万语地址生成器]
    ├─ 地址组合 Hash
    ├─ 提取前 8 位数字 + 后 8 位数字
    └─ 从多语言词表中取 10 个地名
    ↓
[展示层]
    ├─ 主界面: 10 字地名 (中文)
    ├─ QR 二维码: 8数字-10汉字-8数字
    ├─ 转账成功: 带金色高亮显示
    └─ 底栏芯片: 随机地名高亮
```

---

## 万语地址介绍

### 格式规范

```
标准格式:
┌─────────────────────────────────┐
│ XXXXXXXX-城市名1名2名3名4名5-YYYYYYYY │
│ (8位数字)-(10字地名)-(8位数字)     │
└─────────────────────────────────┘

示例 1 (中文):
┌─────────────────────────────────┐
│ 12345678-北京上海广州深圳成都-87654321 │
└─────────────────────────────────┘

示例 2 (英文):
┌─────────────────────────────────┐
│ 23456789-abandon ability able about-98765432 │
└─────────────────────────────────┘

示例 3 (短显示):
┌─────────────────────────────────┐
│ 12345678...87654321                 │
│ (仅显示前后 8 位数字, 用于空间受限)   │
└─────────────────────────────────┘
```

### 数据来源

#### 中文地名词表 (2048 个)

**来源**: 中国大陆 + 港澳台 + 主要城市区县

词表规模:
- 直辖市: 北京、上海、广州、深圳、重庆
- 省会城市: 成都、杭州、武汉、西安、南京 (等 30+)
- 地级市: 宁波、苏州、长沙、郑州、青岛 (等 300+)
- 县级市: 义乌、慈溪、余姚、海宁、桐乡 (等 1000+)
- 特殊区划: 香港、澳门、台北、台中、高雄

**词表格式** (JSON):
```json
{
  "zh": [
    "北京", "上海", "广州", "深圳", "成都",
    "重庆", "杭州", "武汉", "西安", "南京",
    // ... 2038 个其他城市和地名
    "香港", "澳门", "台北"
  ]
}
```

**文件位置**: `dist/wordlists/zh-cn.json` (33.4 KB)

#### 英文词表 (2048 个)

**来源**: BIP-39 标准英文单词表

词表规模:
- 国家地名: abandon, ability, above, absent (等)
- 日常词汇: about, abuse, access, accident (等)
- 技术术语: accept, account, accuse, achieve (等)

**词表特点**:
- 完全遵循 BIP-39 规范
- 与硬件钱包兼容 (Ledger, Trezor 等)
- 前 4 字符唯一性 (便于输入联想)

**词表规模**: 2048 个单词

---

## 多语言地名助记词

### 创建钱包时的流程

```
步骤 1: 选择语言与单词数
┌─────────────────────────────────┐
│ 语言选择:                         │
│ ○ 中文 (地名词表)                  │
│ ○ English (BIP-39)               │
│                                   │
│ 单词数:                           │
│ ○ 12 个 (128 bits)                │
│ ◉ 24 个 (256 bits)                │
│                                   │
│ [下一步]                           │
└─────────────────────────────────┘

步骤 2: 自动生成或手动输入
┌─────────────────────────────────┐
│ 生成的 24 个地名:                  │
│                                   │
│ 北京 上海 广州 深圳 成都          │
│ 重庆 杭州 武汉 西安 南京          │
│ 天津 苏州 长沙 郑州 青岛          │
│ 沈阳 宁波 东莞 无锡 福州          │
│ 厦门 哈尔滨 昆明 大连             │
│                                   │
│ [复制] [保存] [下一步]             │
└─────────────────────────────────┘

步骤 3: 验证与确认
┌─────────────────────────────────┐
│ 验证: 输入第 3、7、15、22 个单词  │
│                                   │
│ 第 3 个: [广州     ▼]             │
│ 第 7 个: [杭州     ▼]             │
│ 第 15 个: [郑州    ▼]             │
│ 第 22 个: [昆明    ▼]             │
│                                   │
│ [确认]                            │
└─────────────────────────────────┘

步骤 4: 创建 PIN 码
┌─────────────────────────────────┐
│ 设置 PIN 码 (6-8 位数字):          │
│ [●●●●●●]                        │
│                                   │
│ 确认 PIN: [●●●●●●]              │
│                                   │
│ [创建钱包]                        │
└─────────────────────────────────┘
```

### 导入现有钱包

```
步骤 1: 选择语言与单词数
┌─────────────────────────────────┐
│ 语言选择:                         │
│ ○ 中文 (地名词表)                  │
│ ○ English (BIP-39)               │
│                                   │
│ 单词数:                           │
│ ○ 12 个 (128 bits)                │
│ ◉ 24 个 (256 bits)                │
│                                   │
│ [下一步]                           │
└─────────────────────────────────┘

步骤 2: 输入助记词
┌─────────────────────────────────┐
│ 输入 24 个助记词:                  │
│                                   │
│ 1. [北京      ]  2. [上海      ]  │
│ 3. [广州      ]  4. [深圳      ]  │
│ 5. [成都      ]  6. [重庆      ]  │
│ ...                              │
│ 23. [大连     ]  24. [福州     ]  │
│                                   │
│ [下一步]                           │
└─────────────────────────────────┘

步骤 3: 选择派生路径 (可选)
┌─────────────────────────────────┐
│ 派生账户:                         │
│ ◉ 账户 1 (推荐)                   │
│ ○ 账户 2                         │
│ ○ 自定义账户号                    │
│                                   │
│ [导入]                            │
└─────────────────────────────────┘
```

### 英文单词映射

当用户选择英文时，系统自动转换:

```
用户输入: abandon ability able about above absent
    ↓
[BIP-39 映射]
    ↓
中文映射 (仅内部): 北京 上海 广州 深圳 成都 重庆
    ↓
密钥派生 (使用英文单词)
    ↓
生成地址
```

**关键原理**: 
- 英文单词按照 BIP-39 的索引顺序对应中文地名的索引
- 第 0 个英文单词(abandon) → 第 0 个中文单词(北京)
- 第 1 个英文单词(ability) → 第 1 个中文单词(上海)
- 以此类推...

---

## 核心实现

### 1. 万语地址生成算法

**文件**: `dist/wallet.addr.js` (1,175+ 行)

```javascript
// 核心函数: 生成万语地址
function generateWanYuAddress() {
  // 步骤 1: 获取链上地址组合
  const seed = _wwWanYuSeedStr(); // 格式: "TRX_ADDR\0ETH_ADDR\0BTC_ADDR"
  
  // 步骤 2: 生成前后缀 (8 位数字)
  const hash = crypto.subtle.digest('SHA-256', seed);
  const hashArray = new Uint8Array(hash);
  
  // 提取前 8 位数字
  const prefix8 = extractDigits(hashArray.slice(0, 4), 8);
  
  // 提取后 8 位数字
  const suffix8 = extractDigits(hashArray.slice(-4), 8);
  
  // 步骤 3: 从词表中选取 10 个地名
  const wordIndices = extractIndices(hashArray, 10);
  const selectedWords = wordIndices.map(idx => ADDR_WORDS[idx % ADDR_WORDS.length]);
  
  // 步骤 4: 组装成标准格式
  return `${prefix8}-${selectedWords.join('')}-${suffix8}`;
}

// 辅助函数: 提取数字
function extractDigits(buffer, count) {
  let result = '';
  for (let i = 0; i < count; i++) {
    result += (buffer[i % buffer.length] % 10);
  }
  return result.padStart(count, '0');
}

// 辅助函数: 提取词索引
function extractIndices(buffer, count) {
  const indices = [];
  for (let i = 0; i < count; i++) {
    // 从 buffer 中每 2 字节提取一个 16 位数
    const idx = (buffer[i * 2] << 8) | buffer[i * 2 + 1];
    indices.push(idx & 0x7FF); // 取 11 bits (支持 2048 个词)
  }
  return indices;
}
```

### 2. 地址词表初始化

**文件**: `dist/wordlists.js` (14,000+ 行)

```javascript
// 全局词表对象
const WT_WORDLISTS = {
  zh: [
    "北京", "上海", "广州", "深圳", "成都", "重庆", "杭州", "武汉", "西安", "南京",
    "天津", "苏州", "长沙", "郑州", "青岛", "沈阳", "宁波", "东莞", "无锡", "福州",
    // ... 2028 个其他城市
    "香港", "澳门", "台北"
  ],
  
  en: [
    "abandon", "ability", "able", "about", "above", "absent", "absorb", "abstract", "absurd",
    // ... 2039 个其他 BIP-39 单词
    "zoo"
  ]
};

// 初始化函数
function initAddrWords(lang = 'zh') {
  if (ADDR_WORDS.length > 0) return; // 已初始化
  
  const words = WT_WORDLISTS[lang] || WT_WORDLISTS.zh;
  ADDR_WORDS.push(...words);
  
  console.log(`[WanYu] Initialized ${words.length} address words for language: ${lang}`);
}
```

### 3. 语言与词表映射

**文件**: `dist/wallet.ui.js` (多处)

```javascript
// 语言切换时更新词表
function switchLanguage(lang) {
  currentLang = lang;
  
  // 清空旧的地址词表
  ADDR_WORDS.length = 0;
  
  // 重新初始化新语言的词表
  initAddrWords(lang);
  
  // 重新生成万语地址
  updateAddr();
  
  // 刷新 UI
  renderAddrWords();
  renderHomeAddrChip();
}

// 助记词显示时的语言同步
function displayMnemonicWords(lang) {
  const mnemonicList = document.getElementById('mnemonicWords');
  mnemonicList.innerHTML = '';
  
  const words = currentLang === 'zh' 
    ? convertBIP39ToChineseCities(MNEMONIC_WORDS) // BIP-39 转中文地名
    : MNEMONIC_WORDS; // 英文单词直接显示
  
  words.forEach((word, idx) => {
    const li = document.createElement('li');
    li.textContent = `${idx + 1}. ${word}`;
    mnemonicList.appendChild(li);
  });
}
```

### 4. 地址显示各区域

```javascript
// QR 二维码区域 (大字显示)
function renderQRArea() {
  const qp1 = document.getElementById('qrPart1');
  const qp2 = document.getElementById('qrPart2');
  
  if (currentLang === 'zh' && qp1) {
    const nativeAddr = getNativeAddr(); // 获取完整万语地址
    qp1.textContent = nativeAddr; // 例: "12345678-北京上海广州深圳成都-87654321"
    qp1.style.fontSize = '12px';
    qp1.setAttribute('data-ww-copy', nativeAddr); // 支持点击复制
  }
  
  if (qp2) qp2.style.display = 'none'; // 隐藏英文部分
}

// 首页地址芯片 (带高亮)
function renderHomeAddrChip() {
  const chip = document.getElementById('addrChip');
  if (!chip) return;
  
  const nativeAddr = getNativeAddr();
  const shortAddr = formatAddressChip(nativeAddr); // 格式化显示
  
  // 随机高亮中间 3 个地名
  const highlightIndices = getRandomIndices(3, 10); // 在 10 个地名中随机选 3 个
  
  chip.innerHTML = highlightIndices
    .map((idx, i) => {
      const word = extractAddressWord(nativeAddr, idx);
      const isHighlight = highlightIndices.includes(idx);
      return isHighlight 
        ? `<span style="color: gold; font-weight: bold;">${word}</span>`
        : `<span>${word}</span>`;
    })
    .join('');
}

// 转账页面地址显示
function renderTransferAddress() {
  const transferAddr = document.getElementById('transferFromAddr');
  if (transferAddr) {
    const nativeAddr = getNativeAddr();
    transferAddr.textContent = nativeAddr;
    transferAddr.style.fontSize = '14px';
    transferAddr.style.fontFamily = 'monospace';
  }
}

// 转账成功页面
function renderSuccessPage() {
  const successLabel = document.getElementById('successFromSenderLabel');
  if (successLabel) {
    const nativeAddr = getNativeAddr();
    successLabel.textContent = formatAddressChip(nativeAddr);
    successLabel.style.color = 'var(--primary)';
  }
}
```

---

## 使用示例

### 示例 1: 创建中文地名钱包

```
用户操作:
1. 点击「新建钱包」
2. 选择「中文」语言
3. 选择「24 个单词」
4. 系统生成:
   ┌──────────────────────────────────────────┐
   │ 第 1 个:  北京      第 2 个:  上海       │
   │ 第 3 个:  广州      第 4 个:  深圳       │
   │ 第 5 个:  成都      第 6 个:  重庆       │
   │ 第 7 个:  杭州      第 8 个:  武汉       │
   │ 第 9 个:  西安      第 10 个: 南京       │
   │ 第 11 个: 天津      第 12 个: 苏州       │
   │ 第 13 个: 长沙      第 14 个: 郑州       │
   │ 第 15 个: 青岛      第 16 个: 沈阳       │
   │ 第 17 个: 宁波      第 18 个: 东莞       │
   │ 第 19 个: 无锡      第 20 个: 福州       │
   │ 第 21 个: 厦门      第 22 个: 哈尔滨     │
   │ 第 23 个: 昆明      第 24 个: 大连       │
   └──────────────────────────────────────────┘

5. 用户手写记录或拍照保存这 24 个地名
6. 验证: 输入第 5、12、18、24 个单词确认
   (系统随机选择位置)
   
7. 设置 PIN 码: 123456
8. 创建成功 ✓

钱包生成:
├─ TRON 地址: TQFHjbu4AEBDca1EdqE3BFayB4xdRb8ftm
├─ Ethereum 地址: 0xe87964709b027FEf614a0b91E11FB1e46E991111
├─ Bitcoin 地址: bc1q3aq8v7nh9xly0y3vf40pdy8z3l60ql9f6z7xey
└─ 万语地址: 38294651-北京上海广州深圳成都-92847361

首页显示:
┌──────────────────────────────────────────┐
│        万语钱包 - WorldToken            │
│                                          │
│  资产: ≈ 9,163.31 USDT                  │
│  约 ≈ 62,952 CNY                        │
│                                          │
│  地址: 38294651...92847361             │
│        (上海) (深圳) (杭州)   << 随机高亮
│                                          │
│  [收款]  [转账]  [交换]  [设置]          │
└──────────────────────────────────────────┘

QR 二维码页面:
┌──────────────────────────────────────────┐
│    收款二维码                             │
│                                          │
│   ┌─────────────────────┐               │
│   │ █████████████████   │               │
│   │ ██           ██     │               │
│   │ ██  █████  ██       │               │
│   │ ██           ██     │               │
│   │ █████████████████   │               │
│   │                     │               │
│   │ (编码的地址数据)      │               │
│   └─────────────────────┘               │
│                                          │
│  38294651-北京上海广州深圳成都-92847361  │
│                                          │
│  [点击复制]                              │
└──────────────────────────────────────────┘
```

### 示例 2: 导入英文 BIP-39 钱包

```
用户操作:
1. 点击「导入钱包」
2. 选择「English (BIP-39)」语言
3. 输入 24 个单词:
   ┌──────────────────────────────────────────┐
   │ 1. abandon    2. ability      3. able      │
   │ 4. about      5. above        6. absent    │
   │ 7. absorb     8. abstract     9. absurd    │
   │ 10. abuse     11. access      12. accident  │
   │ 13. account   14. accuse      15. achieve   │
   │ 16. acid      17. acoustic    18. acquire   │
   │ 19. across    20. act         21. action    │
   │ 22. actor     23. actual      24. adapt     │
   └──────────────────────────────────────────┘

4. 系统内部自动转换为中文地名 (不展示):
   abandon(北京) → ability(上海) → able(广州) → ...

5. 生成钱包:
   ├─ 完全兼容硬件钱包 (Ledger, Trezor)
   ├─ 地址与标准 BIP-39 完全一致
   └─ 可在任何钱包导入此助记词

6. 万语地址生成:
   38294651-北京上海广州深圳成都-92847361
   (使用对应的中文地名显示)

7. 设置 PIN 码: 123456
8. 导入成功 ✓
```

### 示例 3: 多链转账与地址识别

```
场景: 用户向朋友转账 100 USDT

用户输入收款地址时:
┌──────────────────────────────────────────┐
│  输入收款地址:                            │
│                                          │
│  输入框: [38294651-北京上海广州深            │
│                                          │
│  地址识别:                               │
│  ✓ 中文地名格式 (万语地址)               │
│  → 自动识别为「北京上海广州深...」       │
│                                          │
│  对应链: TRON (默认)                    │
│  真实地址: TQFHjbu4AEBDca1EdqE3Fay...   │
│                                          │
│  [切换链] [确认转账]                     │
└──────────────────────────────────────────┘

转账成功页面:
┌──────────────────────────────────────────┐
│    转账成功!                              │
│                                          │
│  转账人: 38294651...92847361            │
│         (北京上海广州)  << 高亮显示
│                                          │
│  收款人: 87654321...12345678            │
│         (深圳成都重庆)  << 高亮显示
│                                          │
│  金额: 100 USDT                         │
│  手续费: 0.1 USDT                       │
│  时间: 2026-04-08 21:49 GMT+7          │
│                                          │
│  [查看详情] [继续转账] [返回首页]        │
└──────────────────────────────────────────┘
```

---

## 技术规范

### 密钥派生路径 (BIP-44)

```
标准路径: m/44'/coin_type'/account'/change/address_index

对于 WorldWallet:
├─ Bitcoin:
│  └─ m/44'/0'/0'/0/0   (第一个 BTC 地址)
│     m/44'/0'/0'/0/1   (第二个 BTC 地址, 等)
│
├─ Ethereum:
│  └─ m/44'/60'/0'/0/0  (第一个 ETH 地址)
│     m/44'/60'/0'/0/1  (第二个 ETH 地址, 等)
│
└─ Tron:
   └─ m/44'/195'/0'/0/0 (第一个 TRX 地址)
      m/44'/195'/0'/0/1 (第二个 TRX 地址, 等)
```

### 词表索引映射

```
中文 ↔ 英文映射关系:

索引 0   → 北京    ↔ abandon
索引 1   → 上海    ↔ ability
索引 2   → 广州    ↔ able
索引 3   → 深圳    ↔ about
索引 4   → 成都    ↔ above
...
索引 2047 → 高雄   ↔ zoo

映射规则:
- 完全一一对应
- 索引顺序保持一致
- 双向转换支持
```

### 地址编码算法

```
输入: 三链地址组合 (TRX + ETH + BTC)

处理步骤:
1. 字符串拼接
   seed = TRX_ADDR + "\0" + ETH_ADDR + "\0" + BTC_ADDR

2. SHA-256 哈希
   hash = SHA256(seed)
   // 输出: 32 字节 (256 bits)

3. 提取前 8 位数字
   prefix = hash[0:4] → 4 字节
   prefix_str = 取每字节的个位数 (0-9)
   // 示例: 38 29 46 51 → "38294651"

4. 提取后 8 位数字
   suffix = hash[-4:] → 最后 4 字节
   suffix_str = 取每字节的个位数 (0-9)
   // 示例: 92 84 73 61 → "92847361"

5. 提取 10 个词索引
   indices = []
   for i in range(10):
     idx = (hash[i*2] << 8) | hash[i*2+1]
     indices.append(idx % 2048)

6. 从词表中选词
   words = []
   for idx in indices:
     words.append(WT_WORDLISTS[lang][idx])

7. 组装最终地址
   wanyu_addr = f"{prefix}-{''.join(words)}-{suffix}"
   // 示例: "38294651-北京上海广州深圳成都-92847361"
```

### 验证地址一致性

```javascript
// 用户可以验证万语地址与链上地址的对应关系
function verifyWanYuAddress(wanyuAddr, trxAddr, ethAddr, btcAddr) {
  // 重新生成地址
  const seed = trxAddr + "\0" + ethAddr + "\0" + btcAddr;
  const hash = SHA256(seed);
  
  // 提取前后缀
  const prefix = extractDigits(hash.slice(0, 4), 8);
  const suffix = extractDigits(hash.slice(-4), 8);
  
  // 提取词索引
  const indices = [];
  for (let i = 0; i < 10; i++) {
    const idx = (hash[i*2] << 8) | hash[i*2+1];
    indices.push(idx % 2048);
  }
  
  // 获取词
  const words = indices.map(idx => ADDR_WORDS[idx]);
  
  // 拼装新地址
  const newAddr = `${prefix}-${words.join('')}-${suffix}`;
  
  // 比对
  return wanyuAddr === newAddr;
}
```

---

## 常见问题

### Q1: 万语地址和链上地址的关系是什么?

```
A: 万语地址是链上地址的「视觉友好化展示」

万语地址 ←→ 链上地址 (一对一映射)
        ↓
    可相互验证
    可单向转换 (从链上地址推导万语地址)

示例:
万语: 38294651-北京上海广州深圳成都-92847361
TRON: TQFHjbu4AEBDca1EdqE3BFayB4xdRb8ftm
ETH:  0xe87964709b027FEf614a0b91E11FB1e46E991111
BTC:  bc1q3aq8v7nh9xly0y3vf40pdy8z3l60ql9f6z7xey

同一个钱包,三个链上地址组合唯一确定了一个万语地址。
```

### Q2: 中文地名和英文单词可以混用吗?

```
A: 不建议混用,但技术上可以兼容

推荐做法:
√ 创建时选择一种语言 (中文或英文)
√ 导入时按照原语言输入
√ UI 展示时根据用户选择显示语言

不支持:
✗ 混合输入 (中英文混合输入助记词)
✗ 自动转换用户输入的语言

原因: 确保安全性和一致性
```

### Q3: 如果忘记了助记词怎么办?

```
A: 万语地址本身无法恢复助记词

但可以:
1. 检查备份 (纸质、图片、密码管理器)
2. 检查多设备同步 (如有登录其他设备)
3. 使用硬件钱包恢复 (如曾导出到 Ledger)

⚠️ 重要: 不要向任何人透露助记词!
```

### Q4: 不同设备上的万语地址会一样吗?

```
A: 是的,同一个助记词生成的万语地址完全一致

示例:
iPhone:     38294651-北京上海广州深圳成都-92847361  ✓ 一致
Android:    38294651-北京上海广州深圳成都-92847361  ✓ 一致
Web 版:     38294651-北京上海广州深圳成都-92847361  ✓ 一致
硬件钱包:    38294651-北京上海广州深圳成都-92847361  ✓ 一致

原理: 地址基于数学派生,与设备无关
```

### Q5: 如何保证万语地址的安全性?

```
A: 安全性基于以下三个层面:

1️⃣ 密钥安全:
   ├─ 助记词永远不上传到服务器
   ├─ 私钥本地生成和存储
   └─ 支持离线签名

2️⃣ 地址一致性:
   ├─ 地址由链上三地址唯一确定
   ├─ 不可篡改
   └─ 用户可验证

3️⃣ 用户体验:
   ├─ 易于识别和记忆
   ├─ 减少复制粘贴错误
   └─ 支持视觉验证
```

### Q6: 万语地址支持哪些币种?

```
A: 目前完整支持:
✓ TRON (TRX/USDT-TRC20)
✓ Ethereum (ETH/USDC/其他 ERC-20)
✓ Bitcoin (BTC)

未来规划:
□ Solana (SOL)
□ Polygon (MATIC)
□ Arbitrum (ARB)
□ 其他主流链
```

### Q7: 可以修改万语地址吗?

```
A: 不可以修改

万语地址完全由以下因素决定:
└─ 用户的助记词 (固定)
   └─ 派生的链上地址 (固定)
      └─ 组合的 SHA-256 哈希 (固定)

如果想要不同的万语地址:
方案: 创建新的钱包 (新的助记词)
```

### Q8: 万语地址能在其他钱包使用吗?

```
A: 不能直接使用,但兼容:

✓ 可以将助记词导入其他钱包
  └─ 得到相同的链上地址
  └─ 万语地址会自动生成

✗ 不能在其他钱包直接输入万语地址
  └─ 其他钱包不了解万语地址格式
  └─ 需要转换为链上地址

推荐: 保留链上地址 (0x... / bc1... / T...) 用于兼容其他钱包
```

---

## 附录

### 中文地名词表完整列表

**直辖市与特区** (8 个):
北京、上海、广州、深圳、重庆、香港、澳门、台北

**主要城市** (30+):
成都、杭州、武汉、西安、南京、天津、苏州、长沙、郑州、青岛、沈阳、宁波、东莞、无锡、福州、厦门、哈尔滨、昆明、大连、合肥、济南、温州、南宁、长春、贵阳、佛山、南昌、石家庄、太原、...

**地级市与县级市** (1000+):
[详见 dist/wordlists/zh-cn.json 完整列表]

### 英文 BIP-39 单词列表

**前 100 个单词**:
abandon, ability, able, about, above, absent, absorb, abstract, absurd, abuse, access, accident, account, accuse, achieve, acid, acoustic, acquire, across, act, action, actor, actress, actual, adapt, add, addict, address, adjust, admit, adult, advance, advice, aerobic, affair, afford, afraid, again, age, agent, agree, ahead, aim, air, airport, aisle, alarm, album, alcohol, alert, alien, all, alley, allow, almost, alone, alpha, already, also, alter, always, amateur, amazing, among, amount, amused, analyst, anchor, ancient, anger, angle, angry, animal, ankle, announce, annual, another, answer, antenna, antique, anxiety, any, apart, apology, appear, apple, approve, april, arch, arctic, area, arena, argue, arm, armed, armor, army, around, arrange, arrest, arrive, arrow, art, ...

**完整列表**: [详见 dist/wordlists.js 中 WT_WORDLISTS.en 数组]

---

**文档完成日期**: 2026-04-08  
**文档维护**: WorldWallet 开发团队  
**最后更新**: 2026-04-08 21:49 GMT+7  
**版本**: 1.0 (初版，文字可复制)

---

## 可复制的关键信息

### 万语地址格式
```
XXXXXXXX-城市名1城市名2城市名3城市名4城市名5-YYYYYYYY

示例:
38294651-北京上海广州深圳成都-92847361
```

### 创建钱包三步
```
1. 选择语言 (中文/英文)
2. 生成或输入助记词 (12/24 个)
3. 设置 PIN 码 (6-8 位数字)
```

### 核心文件位置
```
dist/wallet.addr.js          - 万语地址生成核心逻辑
dist/wordlists.js            - 全球语言词表
dist/wordlists/zh-cn.json    - 中文地名词表 (2048 个)
```

### 关键函数
```
initAddrWords(lang)           - 初始化词表
generateWanYuAddress()        - 生成万语地址
switchLanguage(lang)          - 切换语言
verifyWanYuAddress()          - 验证地址一致性
```

### 支持的语言与单词数
```
语言: 中文 (地名) / 英文 (BIP-39)
单词数: 12 (128 bits) / 24 (256 bits)
```

---

✅ **文档编写完成** - 所有内容均可复制使用
