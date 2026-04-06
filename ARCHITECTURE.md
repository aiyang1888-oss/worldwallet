# WorldWallet 项目架构文档

> 最后更新：2026-04-06
> 线上地址：https://www.worldtoken.cc/wallet.html
> GitHub：https://github.com/aiyang1888-oss/worldwallet

---

## 1. 项目模块结构

```
WorldWallet/
│
├── wallet-shell/                  ← 开发目录（源码）
│   ├── index.html                 ← UI 主体（HTML + CSS + 页面结构）
│   ├── wallet.runtime.js          ← 业务逻辑（所有 JS 函数）
│   └── app.js                     ← 废弃，可删除
│
├── dist/                          ← 部署目录（GitHub Pages）
│   ├── wallet.html                ← 从 index.html 复制
│   ├── wallet.runtime.js          ← 从 wallet-shell 复制
│   ├── sw.js                      ← Service Worker（缓存策略）
│   ├── manifest.json              ← PWA 配置
│   ├── icon-192.png / icon-512.png
│   ├── CNAME                      ← 自定义域名 worldtoken.cc
│   └── .git/                      ← 独立 git repo，push = 上线
│
├── copyright/                     ← 著作权申请材料
├── app/ src/ node_modules/        ← Expo/RN 残留（未使用，建议删除）
└── ARCHITECTURE.md                ← 本文件
```

### 核心文件关系

```
index.html (3617行)          wallet.runtime.js (6308行)
┌─────────────────┐          ┌─────────────────────┐
│ <style> CSS     │          │ UI 工具函数          │
│ 56 个 .page div │──引用──→ │ 钱包创建/导入        │
│ 内联 onclick    │          │ 地址系统             │
│ CDN: ethers.js  │          │ 交易/余额            │
│ CDN: qrcode.js  │          │ 设置/安全            │
│ CDN: tronweb    │          │ 100+ 占位功能        │
└─────────────────┘          └─────────────────────┘
        │                              │
        └──────── 复制到 ──────────────┘
                    │
              dist/ (GitHub Pages)
                    │
           worldtoken.cc/wallet.html
```

---

## 2. 数据流

### 2.1 钱包创建流程

```
用户点击「创建新钱包」
        │
        ▼
  createNewWallet()
        │
        ▼
  generateTempWallet(12)
        │
        ├─ ethers.utils.randomBytes(16)     ← 生成随机熵
        ├─ ethers.utils.entropyToMnemonic() ← 熵 → 12词助记词
        ├─ ethers.Wallet.fromMnemonic()     ← 派生 ETH 钱包
        ├─ 派生 TRX 钱包 (m/44'/195'/0'/0/0)
        ├─ 派生 BTC 钱包 (m/44'/0'/0'/0/0)
        │
        ▼
  window.TEMP_WALLET = { mnemonic, ethAddress, trxAddress, btcAddress, privateKey }
        │                     ↑
        │              只存内存，不写 localStorage
        ▼
  renderKeyGrid()  ← 显示词格
        │
        ▼
  用户抄写 → 验证 → 保存到 localStorage（确认后才持久化）
```

### 2.2 词数切换流程

```
用户选择 15词/18词/24词
        │
        ▼
  changeMnemonicLength(n)
        │
        ├─ 更新 currentMnemonicLength
        ├─ 同步下拉框 UI
        ├─ generateTempWallet(n)  ← 重新生成
        │
        ▼
  renderKeyGrid()  ← 重新渲染
```

### 2.3 数据存储

```
┌──────────────────────────────────────────────┐
│               localStorage                    │
├──────────────┬───────────────────────────────┤
│ ww_wallet    │ 钱包数据（含助记词、地址）⚠️   │
│ ww_pin       │ PIN 码                        │
│ ww_theme     │ 主题（dark/light）            │
│ ww_nickname  │ 钱包昵称                      │
│ ww_ref_*     │ 推荐码相关                    │
│ ww_hongbao_* │ 红包记录                      │
├──────────────┴───────────────────────────────┤
│             sessionStorage                    │
├──────────────┬───────────────────────────────┤
│ ww_last_page │ 刷新恢复页面                  │
│ ww_ref_pending│ 待处理推荐码                  │
├──────────────┴───────────────────────────────┤
│              内存变量                          │
├──────────────┬───────────────────────────────┤
│ TEMP_WALLET  │ 创建中的临时钱包（不持久化）   │
│ REAL_WALLET  │ 当前活跃钱包（从localStorage读）│
│ ADDR_WORDS   │ 地址显示用的随机词             │
│ currentMnemonicLength │ 当前词数选择          │
└──────────────┴───────────────────────────────┘
```

### 2.4 页面导航流程

```
page-welcome ──→ page-create ──→ page-key ──→ page-key-verify ──→ page-home
     │                │                                              │
     │                └──→ page-import ──→ page-home                 │
     │                                                               │
     └───────────────────────────────────────────────────────────────┘
                              ↕ tabBar ↕
                    page-home ↔ page-addr ↔ page-swap ↔ page-settings
```

---

## 3. 关键依赖

| 依赖 | 版本 | 用途 | 加载方式 | 大小 |
|------|------|------|----------|------|
| **ethers.js** | 5.7.2 | BIP39 助记词、钱包派生、签名 | CDN (jsdelivr) | ~800KB |
| **qrcode.js** | latest | 二维码生成 | CDN (jsdelivr) | ~30KB |
| **TronWeb** | 5.3.2 | TRX 地址转换 | 动态加载 | ~200KB |

### 无后端依赖
- 所有数据存 localStorage，不联网存储
- 余额/价格通过公开 API 查询（非必需）
- 完全离线可用（PWA）

---

## 4. 风险点

### 4.1 安全风险（按严重度排序）

| 级别 | 风险 | 详情 | 建议 |
|------|------|------|------|
| 🔴 严重 | 助记词明文存 localStorage | `saveWallet()` 把 mnemonic 存入 localStorage，任何同源 JS 可读 | 加密存储或不存 |
| 🔴 严重 | 私钥全局可访问 | `window.REAL_WALLET.privateKey` 在控制台可直接读取 | 用闭包封装，需时才解密 |
| 🟡 中 | 无 CSP | 没有 Content-Security-Policy，XSS 可注入任意 JS | 添加 CSP meta 标签 |
| 🟡 中 | CDN 无 SRI | ethers.js 等从 CDN 加载，无 integrity 校验 | 添加 SRI hash |
| 🟡 中 | PIN 存明文 | `ww_pin` 在 localStorage 中明文存储 | 至少 hash 存储 |

### 4.2 架构风险

| 级别 | 风险 | 详情 |
|------|------|------|
| 🔴 高 | 单文件架构 | 6300行 JS + 3600行 HTML，极难维护 |
| 🔴 高 | 手动部署 | cp + git push，容易文件不同步 |
| 🟡 中 | 56 个页面 | 其中 40+ 个是空壳占位，增加维护负担 |
| 🟡 中 | 游离 HTML 元素 | 部分元素不在 `.page` div 内，导致页面穿透 |
| 🟢 低 | Expo 残留 | app/ src/ node_modules/ 占空间但未使用 |

### 4.3 功能风险

| 级别 | 风险 | 详情 |
|------|------|------|
| 🔴 高 | PIN key 不一致 | 存 `ww_pin`，读 `ww_unlock_pin`，解锁会失败 |
| 🟡 中 | loadWallet 覆盖 | 启动时从 localStorage 读旧钱包覆盖 REAL_WALLET |
| 🟡 中 | SW 缓存更新慢 | 手机端 Service Worker 缓存可能导致用户看到旧版本 |

---

## 5. 优化路线图

### Phase 1：清理（当前阶段）
- [ ] 删除 40+ 无用页面，只保留核心 8-10 个
- [ ] 删除 Expo 残留（app/ src/ node_modules/）
- [ ] 修复 HTML 结构（所有内容必须在 `.page` 内部）
- [ ] 修复 PIN key 不一致 bug

### Phase 2：重构
- [ ] CSS 拆出独立文件 `wallet.css`
- [ ] JS 按功能拆分：
  - `wallet.core.js` — 钱包创建/导入/存储
  - `wallet.ui.js` — 页面导航/Toast/加载动画
  - `wallet.addr.js` — 地址系统/多语言
  - `wallet.tx.js` — 转账/余额/交易记录
- [ ] 写 `deploy.sh` 自动化部署脚本

### Phase 3：安全加固
- [ ] 助记词加密存储（用 PIN 派生的 key 加密）
- [ ] 私钥不存全局变量（用闭包 + 需时解密）
- [ ] 添加 CSP header
- [ ] CDN 添加 SRI integrity

### Phase 4：功能完善
- [ ] 创建钱包 → 词数选择（已完成 ✅）
- [ ] 助记词验证流程
- [ ] 导入钱包
- [ ] 转账功能
- [ ] 余额查询

---

## 6. 核心页面清单（建议保留）

| 页面 ID | 用途 | 状态 |
|---------|------|------|
| page-welcome | 欢迎/入口 | ✅ 保留 |
| page-create | 创建/导入选择 | ✅ 保留 |
| page-key | 助记词展示 | ✅ 保留 |
| page-key-verify | 助记词验证 | ✅ 保留 |
| page-import | 导入钱包 | ✅ 保留 |
| page-home | 首页/资产 | ✅ 保留 |
| page-addr | 收款地址 | ✅ 保留 |
| page-transfer | 转账 | ✅ 保留 |
| page-swap | 兑换 | ✅ 保留 |
| page-settings | 设置 | ✅ 保留 |
| page-faq | 帮助 | ✅ 保留 |
| 其余 45 个页面 | 空壳占位 | ❌ 删除 |

---

## 7. 部署流程

```bash
# 当前流程（手动）
cp wallet-shell/index.html dist/wallet.html
cp wallet-shell/wallet.runtime.js dist/wallet.runtime.js
# 更新 sw.js 版本号
cd dist && git add -A && git commit -m "描述" && git push origin main
# 等 2 分钟 GitHub Pages 生效

# 建议流程（自动化）
./deploy.sh "commit message"
```
