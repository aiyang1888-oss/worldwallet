# 📚 文档完善计划

**时间**: 2026-04-08 09:20+  
**目标**: API 文档、部署指南、安全指南  
**预期**: 新开发者 1 小时内上手  

---

## 📋 文档结构

```
docs/
├── README.md                    # 项目总览
├── API.md                       # API 文档
├── ARCHITECTURE.md              # 系统架构
├── SECURITY.md                  # 安全指南
├── DEPLOYMENT.md                # 部署指南
├── TROUBLESHOOTING.md           # 故障排除
├── DEVELOPMENT.md               # 开发指南
├── TESTING.md                   # 测试指南
└── CHANGELOG.md                 # 更新日志
```

---

## 🔧 文档详情

### 1. API 文档 (API.md)

**内容**:
```markdown
# WorldWallet API 文档

## Core Functions

### wwSealWalletSensitive(wallet)
- **用途**: 加密钱包敏感数据到会话
- **参数**: 
  - `wallet`: 完整钱包对象
- **返回**: Promise<void>
- **示例**:
  ```javascript
  await wwSealWalletSensitive(REAL_WALLET);
  ```
- **安全性**: 使用 AES-GCM，密钥仅在内存

### wwUnsealWalletSensitive()
- **用途**: 临时解密钱包敏感数据
- **参数**: 无
- **返回**: Promise<{ mnemonic, privateKeys }>
- **缓存**: 1 分钟内同一解密键可重用
- **示例**:
  ```javascript
  const sensitive = await wwUnsealWalletSensitive();
  console.log(sensitive.mnemonic);
  ```

### wwWithWalletSensitive(fn, cacheTime)
- **用途**: 访问敏感数据并执行函数
- **参数**:
  - `fn`: (sensitive) => any
  - `cacheTime`: 缓存时间（毫秒，默认 60000）
- **返回**: Promise<any>
- **示例**:
  ```javascript
  const txHash = await wwWithWalletSensitive(async (sensitive) => {
    return signTransaction(tx, sensitive.trxKey);
  });
  ```

### wwParsePositiveAmount(amount)
- **用途**: 验证和解析转账金额
- **参数**: 
  - `amount`: string | number
- **返回**: number | null
- **验证**:
  - 必须 > 0
  - 必须是有效数字
  - 不超过精度限制
- **示例**:
  ```javascript
  const valid = wwParsePositiveAmount('0.1');
  if (!valid) throw new Error('Invalid amount');
  ```

### wwB64StdToUint8Array(b64String)
- **用途**: 安全的 Base64 转 Uint8Array
- **参数**: 
  - `b64String`: 标准 Base64 字符串
- **返回**: Uint8Array | null
- **错误处理**: 返回 null 而不是抛出异常
- **示例**:
  ```javascript
  const data = wwB64StdToUint8Array(base64);
  if (!data) console.error('Invalid base64');
  ```

## Storage API

### wwIdbGet(key) / wwIdbSet(key, value)
- IndexedDB 操作
- 异步，自动备份到 localStorage

### wwMigrateLocalStorageToIdbOnce()
- 一次性迁移（检查标记）
- 页面加载时自动调用
```

**工时**: 2 小时

---

### 2. 系统架构文档 (ARCHITECTURE.md)

**内容**:
```markdown
# WorldWallet 系统架构

## 模块结构

```
wallet-shell/
├── core/
│   └── security.js          # 加密、PIN、密钥管理
├── wallet.*.js              # 核心钱包逻辑
│   ├── wallet.core.js       # 加载、创建、保存
│   ├── wallet.runtime.js    # 运行时、解锁
│   ├── wallet.ui.js         # UI 交互
│   ├── wallet.tx.js         # 交易逻辑
│   └── ...
├── js/
│   ├── idb-kv.js           # IndexedDB 抽象
│   ├── storage.js          # 存储接口
│   ├── globals.js          # 全局变量
│   └── api-config.js       # API 配置
└── index.html              # 入口
```

## 数据流

### 钱包创建流程
```
Input PIN
  ↓
generateMnemonic()
  ↓
deriveAddresses() → {eth, trx, btc}
  ↓
hashPin() → PIN hash with device salt
  ↓
encryptWallet() → AES-GCM
  ↓
Save to localStorage + IndexedDB
```

### 钱包解锁流程
```
Input PIN
  ↓
verifyPin() → compare with stored hash
  ↓
decryptWallet() → recover sensitive data
  ↓
wwSealWalletSensitive() → encrypt in session
  ↓
Load to REAL_WALLET
```

## 安全层

### 多层加密
1. **PIN Layer**: PBKDF2(100,000 iterations) + device salt
2. **Session Layer**: AES-GCM (in-memory only)
3. **Storage Layer**: localStorage + IndexedDB (encrypted)

### 密钥管理
- Device Salt: 每设备生成，不同用户不同
- Session Key: 每次解锁生成，仅在内存
- PBKDF2 iterations: 100,000 (安全优先)

## 数据持久化

### localStorage
- 主存储
- 容量: ~5-10MB
- 同步

### IndexedDB
- 备份存储
- 容量: ~50MB
- 异步，自动迁移

### 一致性保证
- 双写同步
- localStorage 为主源
- IDB 为备份

## 性能考虑

### 缓存策略
1. 内存缓存 (Memory)
2. localStorage 快速读取 (Sync)
3. IndexedDB 完整备份 (Async)

### 解密缓存
- Session 密钥 1 分钟缓存
- 派生密钥 3 分钟缓存
- 自动清理
```

**工时**: 2.5 小时

---

### 3. 安全指南 (SECURITY.md)

**内容**:
```markdown
# WorldWallet 安全指南

## 🔐 安全特性

### P0 安全修复
- ✅ Base64 安全解析 (atob error handling)
- ✅ 会话私钥加密 (AES-GCM in-memory)
- ✅ 设备盐 (per-device PIN salt)

### P1 安全修复
- ✅ IndexedDB 迁移 (localStorage → IDB)
- ✅ 输入验证 (amount, address)

## 🛡️ 威胁模型

### 已防护
- XSS 攻击: 私钥加密，localStorage 隔离
- 中间人攻击: 使用 HTTPS (客户端部署)
- 内存转储: 敏感数据加密
- 彩虹表: 每设备盐，100k 迭代

### 部分防护
- 侧信道攻击: 基础 timing-safe 比较
- 恶意脚本: 依赖浏览器沙箱

### 未防护 (限制)
- 硬件钱包集成: 不支持 (Web 限制)
- 离线签名: 不支持 (需离线设备)

## 📋 安全检查清单

### 部署前
- [ ] 删除所有 console.log 敏感数据
- [ ] 启用 HTTPS
- [ ] 配置 CSP headers
- [ ] 配置 CORS 限制
- [ ] 定期审计依赖项

### 运行时监控
- [ ] 监控异常 PIN 尝试
- [ ] 检测浏览器插件注入
- [ ] 记录交易失败
- [ ] 跟踪钱包创建

## 🚨 安全事件响应

### 发现问题时
1. 停止受影响功能
2. 通知用户（重要时）
3. 创建 GitHub issue
4. 修复 + 测试 + 审计
5. 发布补丁版本

## 🔄 持续安全

### 定期任务
- 每日: 自动安全审计
- 每周: 代码审查
- 每月: 安全报告 + 规则扩展
- 每季: 完整安全审计

## 联系

安全问题: security@example.com
```

**工时**: 1.5 小时

---

### 4. 部署指南 (DEPLOYMENT.md)

**内容**:
```markdown
# WorldWallet 部署指南

## 快速开始

### 本地开发
```bash
# 1. 克隆仓库
git clone https://github.com/user/worldwallet.git
cd worldwallet

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev

# 4. 打开浏览器
open http://localhost:3000
```

### 生产部署

#### 选项 1: 静态托管 (推荐)
```bash
# 构建
npm run build

# 输出在 dist/ 目录
# 部署到: GitHub Pages / Vercel / Netlify / S3

# GitHub Pages
npm run deploy

# Vercel
vercel --prod

# Netlify
netlify deploy --prod
```

#### 选项 2: Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t worldwallet:latest .
docker run -p 3000:3000 worldwallet:latest
```

### 安全配置

#### HTTPS
```nginx
# Nginx
server {
  listen 443 ssl;
  ssl_certificate /path/to/cert.pem;
  ssl_certificate_key /path/to/key.pem;
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL;
}
```

#### CSP Headers
```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline';" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
```

#### Environment Variables
```bash
REACT_APP_API_ENDPOINT=https://api.example.com
REACT_APP_TRON_FULLNODE=https://api.trongrid.io
REACT_APP_ETH_RPC=https://eth-mainnet.example.com
```

## 监控和维护

### 健康检查
```bash
curl https://wallet.example.com/health
```

### 日志
```bash
# 部署日志
journalctl -u worldwallet -f

# 应用日志
tail -f logs/app.log
```

### 备份
- IndexedDB: 自动备份到 localStorage
- 配置: 保存 .env 文件
- 数据库: 定期备份用户数据

## 故障排除

### 问题: 钱包加载缓慢
- 检查网络延迟
- 检查浏览器缓存
- 清除 IndexedDB: DevTools → IndexedDB → Clear All

### 问题: 交易失败
- 验证网络连接
- 检查节点状态
- 查看浏览器控制台错误
```

**工时**: 2 小时

---

### 5. 开发指南 (DEVELOPMENT.md)

**内容**:
```markdown
# WorldWallet 开发指南

## 环境设置

### 系统要求
- Node.js 18+
- npm 8+
- 浏览器: Chrome 90+, Firefox 88+, Safari 14+

### 安装
```bash
git clone https://github.com/user/worldwallet.git
cd worldwallet
npm install
npm run dev
```

## 代码规范

### 目录结构
```
src/
├── core/          # 核心逻辑
├── ui/            # UI 组件
├── utils/         # 工具函数
└── types/         # TypeScript 类型
```

### 命名约定
- 函数: camelCase
- 类: PascalCase
- 常量: UPPER_SNAKE_CASE
- 私有: _leadingUnderscore

### 安全编码规则
1. 永远验证输入
2. 敏感数据不要 console.log
3. 使用 crypto API，不用 Math.random()
4. 及时清除敏感数据
5. 注释关键安全逻辑

## 测试

### 单元测试
```bash
npm run test:unit
```

### 集成测试
```bash
npm run test:integration
```

### 功能测试 (浏览器)
```bash
npm run test:functional
```

## 提交流程

### 1. 创建分支
```bash
git checkout -b feature/your-feature
```

### 2. 开发和测试
```bash
npm run dev
npm run test
```

### 3. 提交
```bash
git add .
git commit -m "feat: add feature description"
git push origin feature/your-feature
```

### 4. PR 检查
- 自动安全审计 (GitHub Actions)
- 代码审查 (至少 1 个批准)
- 测试通过 (100%)

### 5. Merge
```bash
# Squash and merge recommended
```

## 版本管理

### 版本号
遵循 Semantic Versioning: MAJOR.MINOR.PATCH

### 发布
```bash
npm run release:patch   # 1.0.0 → 1.0.1
npm run release:minor   # 1.0.0 → 1.1.0
npm run release:major   # 1.0.0 → 2.0.0
```
```

**工时**: 1.5 小时

---

## 📊 文档实现计划

| 文档 | 内容 | 工时 |
|------|------|------|
| API.md | 所有公开函数 + 示例 | 2h |
| ARCHITECTURE.md | 模块、数据流、安全层 | 2.5h |
| SECURITY.md | 安全特性、威胁模型、检查清单 | 1.5h |
| DEPLOYMENT.md | 本地/生产部署、配置、监控 | 2h |
| DEVELOPMENT.md | 环境、规范、测试、提交流程 | 1.5h |
| **总计** | **完整技术文档** | **10.5h** |

---

## 📚 额外文档（可选）

- **TESTING.md**: 详细测试指南
- **TROUBLESHOOTING.md**: 常见问题解决
- **CHANGELOG.md**: 版本历史
- **README.md**: 项目总览（更新）

---

## 🎯 成功标准

- [ ] 新开发者能在 1 小时内部署本地环境
- [ ] 所有公开 API 都有文档和示例
- [ ] 安全性要求清晰明确
- [ ] 部署步骤完整无误
- [ ] 代码示例都能运行

---

**文档完善计划完成**。
