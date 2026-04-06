# WorldWallet 产品需求文档（PRD）

> 版本：v1.0
> 日期：2026-04-06
> 作者：老郭 + 小郭

---

## 1. 产品概述

### 1.1 产品名称
WorldWallet（万语钱包）

### 1.2 产品定位
全球首款支持 10 种语言母语助记词的多链加密钱包。

### 1.3 一句话描述
用你的母语管理你的加密资产。

### 1.4 核心差异化
- 传统钱包：只支持英文 BIP39 助记词
- WorldWallet：10 种语言的母语助记词，降低非英语用户门槛

### 1.5 支持语言
中文、英文、日文、韩文、西班牙文、法文、阿拉伯文、俄文、葡萄牙文、印地文

### 1.6 线上地址
https://www.worldtoken.cc/wallet.html

### 1.7 GitHub
https://github.com/aiyang1888-oss/worldwallet

---

## 2. 目标用户

| 用户群体 | 痛点 | WorldWallet 方案 |
|----------|------|-----------------|
| 非英语国家加密新手 | 记不住英文助记词 | 母语助记词 |
| 东南亚跨境工作者 | 跨链收付款复杂 | 多链统一钱包 |
| 全球自由职业者 | 需要 TRX/ETH/USDT | 三链原生支持 |

---

## 3. 核心功能

### 3.1 创建钱包

**用户流程：**
1. 打开 App → 欢迎页
2. 点击「创建新钱包」
3. 进入密钥页，显示 12 个助记词（默认）
4. 可切换 12/15/18/21/24 词
5. 用户抄写助记词
6. 验证助记词（随机抽 3 个词确认）
7. 设置 PIN 码
8. 进入首页

**技术实现：**
- 调用 `createWallet(wordCount)` 生成 BIP39 助记词
- 通过 `deriveAddress(mnemonic)` 派生 ETH/TRX/BTC 地址
- 助记词仅存内存（TEMP_WALLET），确认后用 PIN 加密存储

### 3.2 导入钱包

**用户流程：**
1. 欢迎页点击「导入钱包」
2. 输入助记词（支持粘贴）
3. 自动识别语言，转换为英文 BIP39
4. 恢复 ETH/TRX/BTC 地址
5. 设置 PIN 码
6. 进入首页

**技术实现：**
- 调用 `importWallet(mnemonic)` 验证并恢复
- 多语言助记词通过词库索引映射回英文

### 3.3 查看余额

**用户流程：**
1. 首页显示总资产（USD 估值）
2. 分币种显示：USDT / TRX / ETH / BTC
3. 每个币种显示余额和 USD 价值
4. 下拉刷新

**技术实现：**
- 调用 `getBalance({eth, trx})` 并发查询链上余额
- 价格来源：CryptoCompare API
- TRX 余额 + TRC20 USDT：TronGrid API
- ETH 余额：Ankr RPC

### 3.4 发送交易

**用户流程：**
1. 点击「转账」
2. 选择币种（TRX / ETH / USDT）
3. 输入收款地址
4. 输入金额
5. 确认转账详情
6. 输入 PIN 解锁私钥
7. 发送交易
8. 显示交易哈希

**技术实现：**
- 调用 `sendTx(chain, to, amount, privateKey)` 发送
- PIN 解锁后通过 `decryptWalletSensitive(pin)` 获取私钥
- 支持 TRX / ETH / USDT-TRC20

---

## 4. 系统架构

### 4.1 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | 纯 HTML/CSS/JS（PWA） |
| 钱包引擎 | ethers.js 5.7.2 |
| TRX 支持 | TronWeb 5.3.2 |
| 部署 | GitHub Pages |
| 域名 | worldtoken.cc |

### 4.2 架构层级

```
WorldWallet
│
├── Core Layer（核心层）
│   ├── wallet.js        → createWallet / importWallet / deriveAddress / getBalance / sendTx
│   └── security.js      → AES-GCM 加密 / PIN 管理 / 安全存储
│
├── Data Layer（数据层）
│   ├── globals.js       → 全局变量统一定义
│   ├── storage.js       → localStorage 统一存取
│   └── wordlists.js     → 10 语言 × 2048 词库
│
├── UI Layer（界面层）
│   ├── wallet.ui.js     → 页面导航 / Toast / 设置 / PIN
│   ├── wallet.addr.js   → 地址系统 / 多语言显示
│   └── wallet.css       → 样式
│
└── Infrastructure（基础设施）
    ├── sw.js            → Service Worker / PWA 缓存
    ├── manifest.json    → PWA 配置
    └── index.html       → HTML 框架
```

### 4.3 核心 API

```
createWallet(wordCount)          → 生成新钱包
importWallet(mnemonic)           → 导入钱包
deriveAddress(mnemonic)          → 派生多链地址
getBalance(addresses)            → 查询余额
sendTx(chain, to, amount, key)   → 发送交易
```

### 4.4 安全架构

| 层级 | 方案 |
|------|------|
| 助记词存储 | AES-256-GCM 加密，PIN 派生密钥（PBKDF2, 100000轮） |
| 私钥管理 | 不存全局变量，需 PIN 解密才可用 |
| 传输安全 | HTTPS + CSP + SRI |
| CDN 安全 | ethers.js 添加 integrity 校验 |

---

## 5. 页面结构

| 页面 | ID | 说明 |
|------|----|------|
| 欢迎页 | page-welcome | 入口，创建/导入选择 |
| 创建页 | page-create | 创建/导入两个入口卡片 |
| 密钥页 | page-key | 显示助记词 + 词数选择器 |
| 验证页 | page-key-verify | 验证用户已抄写助记词 |
| 导入页 | page-import | 输入助记词恢复钱包 |
| 首页 | page-home | 余额 + 资产列表 |
| 地址页 | page-addr | 收款地址 + 二维码 |
| 转账页 | page-transfer | 发送交易 |
| 兑换页 | page-swap | 币种兑换（预留） |
| 设置页 | page-settings | PIN / 主题 / 备份 / 昵称 |
| 帮助页 | page-faq | 常见问题 |

---

## 6. 数据存储

### 6.1 localStorage

| Key | 内容 | 加密 |
|-----|------|------|
| ww_wallet | 钱包数据（地址明文 + 敏感数据加密） | 部分 |
| ww_pin | PIN 码 | 明文（待优化） |
| ww_theme | 主题（dark/light） | 否 |
| ww_wallet_nickname | 钱包昵称 | 否 |

### 6.2 内存变量

| 变量 | 说明 |
|------|------|
| REAL_WALLET | 当前钱包（公开信息 + 解锁后含私钥） |
| TEMP_WALLET | 创建中的临时钱包（不持久化） |

---

## 7. 多语言词库

### 7.1 词库来源
GeoNames 全球行政区数据库 + BIP39 标准词表

### 7.2 词库规格

| 语言 | 词数 | 来源 |
|------|------|------|
| zh（中文） | 2048 | 中国地名 |
| en（英文） | 2048 | BIP39 标准词表 |
| ja（日文） | 2048 | 律令国 + 名城 + 花鸟风月 |
| ko（韩文） | 2048 | 朝鲜古都 + 历史地名 |
| es（西班牙文） | 2048 | 西班牙 + 拉美古城 |
| fr（法文） | 2048 | 法国历史省份 + 法语非洲 |
| ar（阿拉伯文） | 2048 | 伊斯兰古城 + 经典词 |
| ru（俄文） | 2048 | 俄罗斯历史古城 + 西伯利亚 |
| pt（葡萄牙文） | 2048 | 巴西 + 葡萄牙地名 |
| hi（印地文） | 2048 | 印度圣地 + 梵语经典词 |

### 7.3 安全性
- 熵：128-256 bit（对标 BIP39）
- 英文模式直接兼容所有标准钱包

---

## 8. 商业模式（规划中）

| 模式 | 说明 |
|------|------|
| 免费基础版 | 创建/导入/转账/收款 |
| 高级版（$3/月） | 多钱包 / 地址簿 / 交易提醒 |
| 交易手续费 | 内置兑换功能抽成 0.3% |
| 企业版 | 多签钱包 / 团队管理 |

---

## 9. 上架计划

| 平台 | 状态 |
|------|------|
| PWA（网页版） | ✅ 已上线 |
| Apple App Store | 注册中（$99 已付） |
| Google Play Store | 待注册 |

---

## 10. 开发进度

### 已完成
- [x] 10 语言词库（2048 × 10）
- [x] 密钥引擎（编解码 + 跨语言互转）
- [x] UI 框架（11 个页面）
- [x] 核心 API（5 个函数）
- [x] 安全层（AES-GCM + PIN）
- [x] PWA（Service Worker + manifest）
- [x] GitHub Pages 部署

### 进行中
- [ ] 导入钱包 UI 对接新 API
- [ ] 查看余额 UI 对接新 API
- [ ] 发送交易 UI 对接新 API
- [ ] 端到端测试

### 待做
- [ ] 多语言 UI 切换
- [ ] 母语地址系统完善
- [ ] 交易历史
- [ ] 币种兑换
- [ ] Apple / Google 上架
