# WorldWallet 系统级重构方案

> 生成时间：2026-04-06 05:05 GMT+7
> 当前代码总量：1892KB / 11728行 / 208函数

---

## 1. 当前架构问题

### 1.1 文件结构问题

| 问题 | 严重度 | 说明 |
|------|--------|------|
| `wallet.ui.js` 613KB | 🔴 高 | 占总代码 60%，包含全局变量+125函数+初始化逻辑 |
| `wallet.runtime.js` 残留 | 🟡 中 | 681KB 旧文件+备份未删除，浪费空间 |
| 无统一入口 | 🟡 中 | 全局变量散落在 ui.js，其他模块隐式依赖 |
| HTML 内联事件 | 🟡 中 | onclick 直接调用全局函数，难以追踪 |

### 1.2 代码质量问题

| 问题 | 数量 | 说明 |
|------|------|------|
| 超长函数 (>50行) | 15 | goTo 142行最严重 |
| 空 catch 块 | 148 | 错误被静默吞掉 |
| 重复 getElementById | 500次 | 无缓存，每次重新查 DOM |
| 重复 localStorage 调用 | 144次 | 无统一存取层 |
| innerHTML 赋值 | 78处 | XSS 风险点 |

### 1.3 模块耦合

```
REAL_WALLET: ui(70) + core(14) + addr(13) + tx(15) = 112次引用
→ 4个模块全部直接读写同一个全局变量，强耦合
```

### 1.4 性能问题

| 问题 | 影响 |
|------|------|
| 首次加载 1.9MB | 3G 网络 10-15秒 |
| 词库 392KB 同步加载 | 阻塞首屏渲染 |
| 500次 getElementById 无缓存 | CPU 浪费 |
| goTo 142行处理所有页面 | 每次导航都跑全部逻辑 |

---

## 2. 新架构设计

### 2.1 目标架构

```
wallet-shell/
├── index.html              ← HTML 框架（纯结构，无内联JS）
├── wallet.css              ← 样式
├── js/
│   ├── globals.js          ← 全局变量 + 共享常量（唯一定义点）
│   ├── storage.js          ← localStorage 统一存取层
│   ├── crypto.js           ← 加密/解密/PIN/TOTP
│   ├── wallet.js           ← 钱包创建/导入/派生
│   ├── addr.js             ← 地址系统/多语言
│   ├── tx.js               ← 转账/余额/价格
│   ├── ui.js               ← 导航/Toast/Loading
│   ├── pages/
│   │   ├── welcome.js      ← page-welcome 初始化
│   │   ├── create.js       ← page-create
│   │   ├── key.js          ← page-key + page-key-verify
│   │   ├── home.js         ← page-home
│   │   ├── transfer.js     ← page-transfer
│   │   ├── settings.js     ← page-settings
│   │   └── import.js       ← page-import
│   └── app.js              ← 入口：初始化 + 页面路由
├── data/
│   └── wordlists.js        ← 词库（懒加载）
└── sw.js                   ← Service Worker
```

### 2.2 模块职责

| 模块 | 行数目标 | 职责 | 依赖 |
|------|----------|------|------|
| globals.js | <50 | 全局变量定义 + 共享常量 | 无 |
| storage.js | <80 | localStorage 读写封装 | globals |
| crypto.js | <120 | AES-GCM 加密/PBKDF2/PIN | 无 |
| wallet.js | <200 | 创建/导入/派生/保存 | globals, storage, crypto |
| addr.js | <200 | 地址渲染/多语言/复制 | globals, wordlists |
| tx.js | <250 | 转账/余额/价格/历史 | globals, storage, wallet |
| ui.js | <100 | goTo/Toast/Loading/Tab | globals |
| pages/*.js | 每个<100 | 各页面初始化逻辑 | 按需 |
| app.js | <50 | 入口 + 路由分发 | 全部 |

### 2.3 关键设计变更

#### 变更 1：goTo 拆分

**现在：** 1 个 142 行函数处理所有页面
```js
// 现在
function goTo(pageId) {
  // ... 142行 if/else
  if (pageId === 'page-key') { ... }
  if (pageId === 'page-home') { ... }
  if (pageId === 'page-settings') { ... }
}
```

**重构后：** 路由表 + 各页面独立初始化
```js
// 重构后
const PAGE_INIT = {
  'page-key': initPageKey,
  'page-home': initPageHome,
  'page-settings': initPageSettings,
};

function goTo(pageId) {
  // 10行：切换 DOM display
  hideAllPages();
  showPage(pageId);
  // 调用页面初始化
  if (PAGE_INIT[pageId]) PAGE_INIT[pageId]();
}
```

#### 变更 2：统一存储层

**现在：** 144 次直接调用 localStorage
```js
localStorage.getItem('ww_pin')
localStorage.setItem('ww_wallet', JSON.stringify(safe))
localStorage.getItem('ww_theme')
```

**重构后：** 统一存取
```js
// storage.js
const Store = {
  get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
  set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} },
  remove(key) { try { localStorage.removeItem(key); } catch {} },
  // 快捷方法
  getPin() { return this.get('ww_pin') || ''; },
  getTheme() { return this.get('ww_theme') || 'dark'; },
};
```

#### 变更 3：DOM 缓存

**现在：** 500 次 getElementById
```js
document.getElementById('keyWordGrid').innerHTML = ...
document.getElementById('balUsdt').textContent = ...
```

**重构后：** 缓存常用元素
```js
// globals.js
const DOM = {};
function cacheDOM() {
  DOM.keyWordGrid = document.getElementById('keyWordGrid');
  DOM.balUsdt = document.getElementById('balUsdt');
  // ...
}
```

#### 变更 4：词库懒加载

**现在：** 392KB 同步阻塞加载
```html
<script src="wordlists.js"></script>
```

**重构后：** 需要时才加载
```js
let _wordlistsLoaded = false;
async function loadWordlists() {
  if (_wordlistsLoaded) return;
  await import('./data/wordlists.js');
  _wordlistsLoaded = true;
}
```

---

## 3. 重构计划

### Phase R1：清理（30分钟）

| 任务 | 说明 |
|------|------|
| 删除 wallet.runtime.js | 旧文件 681KB |
| 删除 wallet.runtime.js.bak | 备份文件 |
| wallet.ui.js 再次清理死代码 | 目标 <200KB |

### Phase R2：抽取共享层（1小时）

| 任务 | 说明 |
|------|------|
| 创建 globals.js | 统一定义全局变量 |
| 创建 storage.js | localStorage 统一存取 |
| 从 wallet.core.js 抽取 crypto.js | 加密/解密独立模块 |

### Phase R3：goTo 拆分（1小时）

| 任务 | 说明 |
|------|------|
| 创建 pages/*.js | 每个页面独立初始化函数 |
| goTo 改为路由表 | 142行 → <20行 |
| 更新 index.html 加载顺序 | 添加新模块引用 |

### Phase R4：优化（1小时）

| 任务 | 说明 |
|------|------|
| DOM 缓存 | 减少 500 次 getElementById |
| 词库懒加载 | 首屏不加载 392KB |
| 空 catch 治理 | 148 处添加 console.warn |
| 超长函数拆分 | 15 个函数拆到 <50 行 |

### Phase R5：测试 + 文档（30分钟）

| 任务 | 说明 |
|------|------|
| 浏览器端到端测试 | 创建/导入/转账/设置 |
| 更新 ARCHITECTURE.md | 新架构文档 |
| 更新 sw.js | 缓存新文件列表 |

---

## 4. 预期效果

| 指标 | 现在 | 重构后 | 改善 |
|------|------|--------|------|
| 总文件大小 | 1892KB | ~900KB | -52% |
| 首屏加载 | 1892KB | ~500KB | -74% |
| 最大单文件 | 613KB | <200KB | -67% |
| goTo 函数 | 142行 | <20行 | -86% |
| 空 catch | 148 | 0 | -100% |
| 全局变量散落 | 4个文件 | 1个文件 | 集中管理 |
| 页面初始化 | 1个巨函数 | 7个小文件 | 独立维护 |

---

## 5. 风险评估

| 风险 | 级别 | 应对 |
|------|------|------|
| 重构过程中功能回退 | 高 | 每步都浏览器测试 |
| 加载顺序错误 | 中 | 严格按依赖顺序 |
| 全局变量迁移遗漏 | 中 | grep 全量扫描确认 |
| 词库懒加载时序 | 低 | 创建钱包前确保加载完 |

---

> 本方案不直接修改代码。确认后逐步执行。
