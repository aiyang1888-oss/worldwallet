# WorldWallet 技术开发文档

**文档版本**: 2.1  
**最后更新**: 2026-04-08（GMT+7）  
**维护**: 开发团队  
**适用范围**: 基于 2026-04-06～2026-04-08 期间代码与流程变更整理的开发与运维说明  

---

## 目录

1. [文档说明](#文档说明)
2. [项目概览](#项目概览)
3. [仓库架构与构建（近期重大调整）](#仓库架构与构建近期重大调整)
4. [近期开发记录（2026-04-06～2026-04-08）](#近期开发记录2026-04-062026-04-08)
5. [核心模块说明](#核心模块说明)
6. [网络层、RPC 与外部依赖](#网络层rpc-与外部依赖)
7. [测试与质量保障](#测试与质量保障)
8. [AI 安全审计子系统](#ai-安全审计子系统)
9. [部署要求与检查清单](#部署要求与检查清单)
10. [性能、安全与已知问题](#性能安全与已知问题)
11. [附录](#附录)

---

## 文档说明

本文档在既有网络层/部署说明的基础上，**按时间线归纳近几日实际提交与决策**，便于新成员理解：

- **代码真源**已从多目录并行维护，收敛为 **`dist/` 唯一真源**；
- **构建与镜像**通过 `scripts/sync-assets.sh` 将 `dist/` 全量同步到 `assets/`；
- **安全策略**从「自动改安全关键代码」转为 **AI 只读审计 + 人工修复**（见 `ai-system/`）；
- **大量 2026-04-08 提交**覆盖 UI 打磨、导入流程、本地测试文档与 Telegram 辅助脚本。

若正文与线上行为不一致，以仓库内 **`dist/` 当前内容** 与 **`git log`** 为准。

---

## 项目概览

| 项 | 说明 |
|----|------|
| **名称** | WorldWallet（万语钱包）— Web3 多链非托管钱包 |
| **形态** | 纯前端 PWA：HTML / CSS / JavaScript（ES6+），无自有后端 |
| **加密** | Web Crypto API；PBKDF2、AES-GCM 等（实现见 `dist/core/security.js`） |
| **链** | Tron、Ethereum、Bitcoin 等（具体以 `dist/wallet.tx.js` 等为准） |
| **线上入口示例** | `https://www.worldtoken.cc/wallet.html`（部署以实际环境为准） |

**产品侧差异化（设计文档与词库）**：多语言助记词展示（如中文 2048 地名词表与 BIP39 索引对齐）、万语地址等；实现分布在 `dist/wordlists/`、`dist/wallet.addr.js`、`dist/wallet.ui.js` 等。

---

## 仓库架构与构建（近期重大调整）

### 唯一真源：`dist/`

近几日明确约定：

- **`dist/`** 为 **唯一 Web 应用源码目录**（编辑、评审、diff 均以该目录为主）。
- 历史上曾存在 `wallet-shell` 与 `dist` 双轨；已通过提交 **「以 dist 为真源，移除 wallet-shell，rsync 全量镜像 assets」** 收敛为单轨，避免「改了一处、另一处未同步」导致的 404 与行为漂移。

### 构建命令：`npm run build`

`package.json` 中：

```json
"build": "bash scripts/sync-assets.sh"
```

`scripts/sync-assets.sh` 主要职责：

1. **校验** `dist/` 下关键文件与目录存在（`wallet.html`、`wallet.*.js`、`wordlists/`、`js/`、`core/security.js` 等）。
2. **统一入口**：将 `dist/wallet.html` 复制为 `dist/index.html` 与 `dist/app.html`，避免多 HTML 入口内容分叉。
3. **镜像静态资源**：`rsync` **`dist/` → `assets/`**（`--delete`），使 `assets/` 成为可部署的完整镜像；**不应以手改 `assets/` 为主源**。

### 本地开发

- **开发服务器**：`npm run dev` → `python3 -m http.server 8766 --directory dist`（**根目录必须是 `dist/`**）。
- **健康检查**：`npm run dev:ping` 用于确认 `http://127.0.0.1:8766/wallet.html` 可访问。
- **测试 URL 说明**：见仓库根目录 **`LOCAL_TEST.md`**（统一 `localhost:8766` / `127.0.0.1:8766`，含 404 排障）。

### 与 `package.json` 描述一致

```text
Web 钱包：真源 dist/；build 将 wallet.html 复制为 index/app 并 rsync → assets/
```

---

## 近期开发记录（2026-04-06～2026-04-08）

### 3.1 时间线与主题（按 Git 归纳）

**2026-04-06～04-07（会话与设计侧）**

- 明确 **Phase 1 安全加固**方向：PIN 哈希化、助记词加密存储、私钥会话缓存与减少全局暴露、CSP/SRI 等（详见历史会话与项目内 `PHASE*` / 架构文档）。
- **线上/浏览器验证**：发现 **BUG-004 级问题** — 助记词/私钥曾暴露在 `window` 可访问对象上，存在 XSS/插件等场景下的资金风险；修复方向为加密存储 + 会话内取用 + 避免向 `window` 挂敏感明文（具体实现以 `dist/core/security.js` 与钱包创建/解锁流程为准）。
- **BUG-006**：无钱包时页面恢复逻辑导致空白屏 — 在无钱包时跳转欢迎页（`goTo('page-welcome')`）等修复已记录在会话日志中。
- **中文词库与 UI**：`zh-cn.json`（2048 词）与英文 BIP39 索引对齐；曾存在「显示乱码/转换不正确」类问题，需保证 UI 层正确加载 `wordlists` 并做英↔本地词表映射。

**2026-04-08（密集工程提交）**

下列主题为当日 `git log` 中反复出现的主线，**与产品体验与可维护性强相关**：

| 主题 | 说明 |
|------|------|
| **架构收口** | `dist` 唯一真源；删除 `wallet-shell` 双轨；`memory/` 纳入版本管理策略与 `.gitignore` 调整 |
| **构建与入口统一** | `build` 统一 `index.html` / `app.html` 与 `wallet.html`；官网 `official` 内链指向本域钱包；文档修正 LOCAL_TEST 404 与端口 |
| **安全与性能专题** | P0/P1 测试计划与报告模板；三类缓存相关模块（IDB、会话密钥、派生缓存）与安全规则扩展；性能基线与安全规则校验类提交 |
| **浏览器与 UI 审计** | Chrome 自动化深度检查、UI/按钮审计、CSS `background-clip` 兼容性修复、Cursor 可视化/CSS 修复指南类文档 |
| **交互与文案（当日多次 fix/feat）** | 见下节「UI/UX 明细」 |
| **Telegram × 本机开发** | 内联按钮遥控 Cursor CLI、Run（后台 `npm run dev`）、New Agent、LaunchAgent 登录自启、`assets/.env` 回退加载等 |
| **导入体验** | 导航栏语言与词数选择与「密钥页」一致；导入按所选词表解析 |
| **AI 安全审计** | `ai-system` 以 **只读扫描 + 报告** 为主，明确不自动修改 `security.js` 等生产安全模块（见下文专节） |

### 3.2 UI/UX 与文案（2026-04-08 提交摘要）

- **主页**：「修改地址」改为 **「转账」**，并跳转到转账页。
- **底栏**：「地址」改为 **「收款」**，图标调整为二维码风格；公链地址复制改为按钮化并与样式同步。
- **转账**：收款地址占位改为「输入任意地址」；金额输入时 **不再误触发「超额」抖动动画**；隐藏数字输入框 spinner（`input[type=number]`）。
- **复制反馈**：复制地址时同步剪贴板，成功态显示「复制成功」并可恢复默认样式（含可见性修复）。
- **资产页**：隐藏零余额时不误判为「加载中」；标题增加 tooltip 说明筛选行为。
- **Swap**：TRX 预估数量与汇率等格式化为 **两位小数**。
- **导入**：顶栏 **语言 + 词数** 与创建/密钥流程一致，解析路径与所选词表一致。

### 3.3 运行时架构注意点（会话与深度检查结论）

会话记录 **`memory/2026-04-08.md`** 指出：

- `wallet.ui.js` 先于 `wallet.runtime.js` 加载时，后者会覆盖大量同名顶层函数（如 `goTo`、`updateQRCode` 等），**易出现行为漂移**。
- 已针对 **`page-import`**、**`page-home`**、**`updateQRCode`**（含 BTC/金额与 QR 载荷）等路径做修复与对齐；曾修复 `updateQRCode` 内变量重复声明导致脚本未执行的问题，以及移除 `wallet.runtime.js` 中覆盖 `renderKeyGrid` 的重复实现以恢复 UI 侧逻辑。

**工程建议**：修改导航/二维码/导入相关逻辑时，同时检索 **`wallet.ui.js` 与 `wallet.runtime.js`** 两处定义，必要时运行 `npm run dup-fn` / `dup-fn:ui-rt`（见 `package.json`）检查重复符号。

### 3.4 P0 测试与 dist 同步（历史问题与结论）

**`memory/2026-04-08-p0-testing.md`** 记录：曾出现 **`dist/wallet.html` 引用 `dist/js/`、`dist/core/` 下缓存相关脚本，但文件未同步** 导致 404。处理方式是临时将 `wallet-shell` 侧文件拷入 `dist`；**根本解决**是当前架构下 **只维护 `dist/` 为真源** 并保证 `build`/`rsync` 流程一致。

自动化脚本示例：`test-p0-auto.js`、Puppeteer 类脚本可通过环境变量 **`WALLET_TEST_URL`** 覆盖默认测试 URL（见 `LOCAL_TEST.md`）。

---

## 核心模块说明

路径均以 **`dist/`** 为准（构建后再镜像到 `assets/`）。

| 文件 / 目录 | 职责摘要 |
|-------------|----------|
| `wallet.html` | 主入口；引用各 JS/CSS |
| `wallet.core.js` | 助记词、派生、核心钱包逻辑 |
| `wallet.ui.js` | 页面流、DOM、多数字符串与交互 |
| `wallet.runtime.js` | 运行时状态、PIN、与 UI 重叠的顶层函数覆盖（需谨慎修改） |
| `wallet.tx.js` | 转账、余额、链上 RPC、价格与重试等 |
| `wallet.addr.js` | 万语地址与链地址相关 |
| `wallet.dom-bind.js` | DOM 绑定 |
| `core/security.js` | 加密、PIN、会话密钥与敏感数据路径（**高风险模块**） |
| `js/idb-cache.js`、`js/idb-kv.js` | IndexedDB 封装 |
| `core/key-derivation-cache.js`、`core/session-key-cache.js` | 派生与会话密钥缓存 |
| `wordlists/` | 多语言词表 JSON |

---

## 网络层、RPC 与外部依赖

以下条目来自持续集成的前端侧改造与文档归纳，**部署生产时仍需配置密钥与可选代理**。

### CoinGecko 与 CORS

- 前端可封装「先直连、失败再同源代理」的获取逻辑；**生产环境**需在网关实现例如 `/api/coingecko-proxy` 类端点，否则浏览器可能因 CORS 无法取价。

### TronGrid

- 限流 **429**：客户端侧指数退避重试。
- **401**：需在页面或构建注入 **`TRON-PRO-API-KEY`**（如 `meta name="wt-tron-api-key"`），且密钥不得提交到公开仓库。

### 以太坊 RPC

- 多 RPC URL 轮询/故障转移，避免单点 llamaRPC 等限流；可在配置中维护列表（如 `js/api-config.js` 或构建时注入）。

### Ethers.js

- 推荐 **本地托管** `ethers.umd.min.js`，避免 CDN 版本漂移与 SRI 不匹配。

### 汇率与 Binance P2P

- 网络/DNS 不稳定时采用重试与降级汇率源；失败时可回落到保守默认值（实现以 `wallet.tx.js` 为准）。

### BTC 地址

- 需使用 **BTC 格式**（如 Native SegWit `bc1…` 等），禁止把 ETH 的 `0x…` 误作 BTC 地址；本地若残留旧缓存应清理或重新导入验证。

---

## 测试与质量保障

| 命令 | 用途 |
|------|------|
| `npm run dev` | 本地静态服务（`dist/`，端口 8766） |
| `npm run dev:ping` | 检查本机钱包页是否可访问 |
| `npm run build` | 校验 `dist/` 并同步 `assets/` |
| `npm run test:ww` | `scripts/ww-deep-check.mjs` — DOM/导航等静态一致性检查 |
| `npm run test:ww:e2e` | Puppeteer 冒烟 |
| `npm run test:ww:chrome` | Chrome 通道深度检查（需安装 Puppeteer 浏览器） |
| `npm run dup-fn` | 重复函数名扫描 |
| `npm run wordlist:zh` | 中文词表再生（见 `scripts/ww-regen-zh-wordlist.mjs`） |

**Puppeteer 找不到 Chrome**：在项目目录执行 `npx puppeteer browsers install chrome`（见 `LOCAL_TEST.md`）。

---

## AI 安全审计子系统

目录：**`ai-system/`**

- **定位**：对代码做 **只读扫描**，输出 **Markdown + JSON** 报告（如 `WORLDWALLET_SECURITY_REPORT.md`、`ai-system/reports/security-report-*.json`）。
- **原则**：**不自动修改** 源代码，尤其 **`dist/core/security.js`** 等密码学相关模块必须由人工评审后修改。
- **运行**：`node ai-system/audit-mode.js`（依赖与说明见 `ai-system/README.md`）。
- **与开发流程的关系**：审计结果可作为 Issue/修复清单；修复后应重新跑测试与审计对比。

`bugs/bugs.json` 中为规则扫描的结构化条目示例，包含 **atob 异常**、**PIN 盐值策略**、**大数组 `fromCharCode`**、**REAL_WALLET 空指针** 等类问题，**不代表全部已在线上修复**，以代码与测试为准。

---

## 部署要求与检查清单

### 必须关注（P0）

- [ ] **`dist/core/security.js` 与解锁流程**上线前经过人工安全评审。
- [ ] **TronGrid API Key** 在部署环境注入。
- [ ] **生产关闭开发用虚拟余额**（若代码中存在 `WW_DEV_VIRTUAL_USDT_BAL` 一类开关，须为 0 或等价关闭）。
- [ ] **同源代理**（若需）实现 CoinGecko 等跨域接口。
- [ ] **构建**：发布前执行 `npm run build`，确认 **`assets/`** 与 **`dist/`** 一致且入口 HTML 未分叉。

### 推荐（P1）

- ETH RPC API Key（如 Ankr）与多 URL 配置。
- 错误与性能监控（Sentry 等）。
- CSP、Referrer-Policy 等安全响应头（按托管平台配置）。

---

## 性能、安全与已知问题

### 性能（目标性指标）

会话与报告中曾记录类基准：**首屏、PIN、签名** 等耗时目标与缓存命中率；实际数值以当前环境与设备为准。缓存层级包括内存、`localStorage`、IndexedDB，TTL 逻辑见运行时实现。

### 加密与密钥管理（原则）

- PIN、助记词、私钥派生应使用标准算法与足够迭代次数；敏感缓冲区用后清零（以 `security.js` 实现为准）。
- 避免在 **`window`** 上长期挂载明文助记词/私钥。

### 已知/待办类项（来自审计与历史会话）

- **PIN 盐与哈希策略**：审计建议曾指出共享盐、哈希升级与迁移策略需产品级决策。
- **atob / decrypt 异常路径**：须防止损坏数据导致未捕获异常影响可用性。
- **runtime 与 ui 双份函数**：长期应收敛为单一来源或减少覆盖面。

---

## 附录

### A. 参考文档（仓库内）

- `LOCAL_TEST.md` — 本地 URL 与 404 排障  
- `ai-system/README.md` — 审计模式说明  
- `client/README.md` — 可选 React Native 客户端说明  

### B. 外部参考

- [Web Crypto API](https://www.w3.org/TR/WebCryptoAPI/)  
- [BIP-39 / BIP-44](https://github.com/bitcoin/bips)  

### C. 变更日志（文档层面）

| 版本 | 日期 | 摘要 |
|------|------|------|
| 2.1 | 2026-04-08 | 合并近几日架构收口、2026-04-08 提交主题、AI 审计模式、测试命令与会话结论 |
| 1.0 | 2026-04-08 | 初版网络层/部署/性能/安全清单（部分条目仍适用于本节引用） |

---

**文档维护**：开发团队  
**下一步建议**：以 `dist/` 为基准做一轮 **端到端回归**（创建钱包、导入、转账、收款二维码、多链切换），并对照 `bugs/bugs.json` 与 `ai-system` 报告逐项关闭或标注「接受风险」。
