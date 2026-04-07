# WorldToken 核心设计决策记录

**日期:** 2026-04-07  
**优先级:** 🔴 关键  
**状态:** Phase 1 执行中

---

## 助记词本地化的真正逻辑

**NOT 翻译 BIP39，而是直接替换词库**

### 核心原理

```
用户端语言选择
  ↓
系统生成 BIP39 英文词（内部使用，用户看不到）
  ↓
查表转换为本地语言词库
  ↓
显示给用户（用户看到和记忆的是本地语言）
  ↓
用户备份时看到本地语言
  ↓
用户验证时输入本地语言
  ↓
系统反向查表转换为 BIP39
  ↓
调用 ethers.js 派生私钥（完全标准 BIP39）
```

### 各语言词库定义

#### 中文（Simplified Chinese）

**词库来源：五行八卦 + 常用汉字**

```
索引   词汇
0:    金
1:    木
2:    水
3:    火
4:    土
5:    天
6:    地
7:    日
8:    月
9:    星
10:   云
11:   雨
12:   风
13:   雷
14:   电
15:   冰
16:   雪
17:   山
18:   河
19:   海
20:   石
21:   沙
22:   草
23:   树
24:   花
25:   林
...
2047: (最后一个词)
```

**关键点：**
- ✅ 共 2048 个词，每个词是**单个常用汉字**或**常见词**
- ✅ 选择标准：人类熟悉度最高的词
- ✅ 与 BIP39 的 2048 词一一对应（顺序严格相同）
- ✅ 用户看到的是母语，但生成的私钥与 BIP39 完全兼容

#### 日文（Japanese）

**词库来源：五十音 + 常用汉字**

```
索引   词汇
0:    あ
1:    い
2:    う
3:    え
4:    お
5:    か
6:    き
7:    く
8:    け
9:    こ
...
45:   ん
46+:  常用日文汉字
...
2047: (最后一个词)
```

#### 英文（English）

**词库来源：BIP39 标准**

```
0:    abandon
1:    ability
2:    able
3:    about
4:    above
...
2047: zone
```

### 实现细节

#### 创建钱包时的流程

```javascript
// 用户选择语言：中文

// 步骤 1：系统内部生成 BIP39 英文
const enMnemonic = ethers.utils.entropyToMnemonic(entropy);
// 结果：["abandon", "ability", "able", "about", "above", ...]

// 步骤 2：加载该语言的词库
const zhWordlist = require('./wordlists/zh-cn.json'); // [金, 木, 水, ...]

// 步骤 3：一一对应转换
const zhMnemonic = enMnemonic.split(' ').map((enWord, i) => {
  const index = BIP39_WORDLIST.indexOf(enWord);
  return zhWordlist[index];
});
// 结果：["金", "木", "水", ...]

// 步骤 4：显示给用户
console.log('你的助记词：' + zhMnemonic.join(' '));
// 显示：你的助记词：金 木 水 火 土 天 地 日 月 星...

// 用户看到的是【金 木 水 火 土...】，用户备份的也是【金 木 水 火 土...】
```

#### 验证时的反向流程

```javascript
// 用户输入：["金", "木", "水", "火", "土", "天", "地", "日", "月", "星"]

// 步骤 1：反向查表转换为英文
const zhWordlist = require('./wordlists/zh-cn.json');
const enWords = userInput.map(zhWord => {
  const index = zhWordlist.indexOf(zhWord);
  return BIP39_WORDLIST[index];
});
// 结果：["abandon", "ability", "able", "about", "above", ...]

// 步骤 2：标准 BIP39 派生
const wallet = ethers.Wallet.fromMnemonic(enWords.join(' '));
// 生成的私钥与之前完全相同
```

---

## 万语地址系统

### 格式

```
[8位随机数字] - [10个本地语言单词] - [8位随机数字]
```

### 单词来源

10 个单词来自对应语言的 2048-词库，索引由地址末尾字节确定。

```
地址末尾 10 字节：0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0xFF, 0x11, 0x22, 0x33, 0x44
转十进制：170, 187, 204, 221, 238, 255, 17, 34, 51, 68
查中文词库：
  170 % 2048 → 词库[170] = "雨"
  187 % 2048 → 词库[187] = "云"
  204 % 2048 → 词库[204] = "风"
  ...
显示：12345678-雨云风雷电冰雪山河海-87654321
```

### 多语言混合

用户可选择混合语言模式，每个位置的词来自不同语言：

```
混合示例（中日英）：
12345678-金-ability-あ-about-木-absent-い-abstract-水-absurd-87654321

显示时用不同颜色或符号分隔：
[金🇨🇳] [ability🇺🇸] [あ🇯🇵] [about🇺🇸] ...
```

---

## 当前 Bug #2 的根本原因

**现象：** 显示的中文词汇是"地名拼凑"而非"五行八卦"

**推测根本原因：**
1. `wordlists/zh-cn.json` 不存在或内容错误
2. 代码调用了错误的词库来源
3. 可能调用了 Google Translate 的地名数据库而非设计的词库

**立即修复：**
- 创建 `/Users/daxiang/Desktop/WorldWallet/wallet-shell/wordlists/zh-cn.json`
- 填入 2048 个中文常用字（五行八卦为主）
- 确保顺序与 BIP39 词表一一对应
- 修改 UI 代码调用正确的词库

---

## 文件结构（应该的样子）

```
wallet-shell/
├── wordlists/
│   ├── en.json          # BIP39 标准英文（2048 词）
│   ├── zh-cn.json       # 中文简体（2048 词：金木水火土...）[需要创建]
│   ├── zh-tw.json       # 中文繁体（2048 词）[可选]
│   ├── ja.json          # 日文（2048 词：あいうえお...）
│   ├── ko.json          # 韩文（2048 词）
│   ├── ar.json          # 阿拉伯文（2048 词）
│   └── ...              # 其他语言
├── wallet.core.js       # 调用 wordlists 进行转换
├── wallet.ui.js         # 显示本地语言词汇
└── wallet.addr.js       # 万语地址生成（调用 wordlists）
```

---

## 验收标准（Phase 1）

### ✅ 必须完成

1. **中文简体** — 2048 个五行八卦 + 常用字的词库
2. **日文** — 2048 个五十音 + 常用汉字的词库
3. **英文** — BIP39 标准词表
4. 用户选择语言时，显示对应语言的词汇
5. 反向验证时，正确转换为 BIP39 派生私钥
6. 万语地址显示本地语言的 10 个单词

### ⏳ 可延后

1. 其他语言（西班牙文、法文等）
2. 混合语言模式
3. 硬钱包支持

---

## Cursor 修复检查清单

### 创建词库文件
- [ ] `/wallet-shell/wordlists/zh-cn.json` — 2048 个中文词
- [ ] 验证词库顺序与 BIP39 完全对应

### 修改代码
- [ ] `wallet.core.js` — 创建转换函数 `convertBIP39ToLocalLanguage()`
- [ ] `wallet.ui.js` — 调用转换函数显示本地语言词汇
- [ ] `wallet.addr.js` — 使用本地语言词库生成万语地址

### 验证
- [ ] 创建中文钱包 → 显示中文词汇（金木水火...）
- [ ] 导入钱包 → 输入中文词汇 → 派生私钥正确
- [ ] 地址显示 → 使用中文单词（12345678-金木水火-87654321）

### 同步到 dist/
- [ ] 运行 `./scripts/sync-dist.sh`
- [ ] 刷新浏览器验证

---

**下一个汇报：Cursor commit hash + 修复验证结果**
