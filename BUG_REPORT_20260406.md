# WorldWallet Bug Report - 2026-04-06

## 测试环境
- 文件：`file:///Users/daxiang/Desktop/WorldWallet/dist/wallet.html`
- 服务器：`http://localhost:8765`
- 浏览器：Chrome/Chromium (OpenClaw browser control)

## Bug #1: 首页黑屏 - `drawHomeBalanceChart is not defined`

### 严重程度
🔴 **Critical** - 导致首页完全无法显示

### 问题描述
用户创建钱包后进入首页，页面内容区域完全黑屏，只显示底部导航栏。

### 根本原因
1. **缺失文件引用**：`wallet.runtime.js` 未在 HTML 中引入
2. **不安全的函数调用**：`wallet.tx.js` 第218行直接调用 `drawHomeBalanceChart(total)`，但该函数定义在 `wallet.runtime.js` (第5619行)，当 runtime.js 未加载时会抛出 `ReferenceError`

### 错误日志
```
ReferenceError: drawHomeBalanceChart is not defined
    at loadBalances (http://localhost:8765/wallet.tx.js:218:5)
```

### 修复方案

#### 修复 1: 在 HTML 中添加 wallet.runtime.js 引用

**文件**: `dist/wallet.html`  
**位置**: 第888行后

```html
<!-- 原代码 (line 885-888) -->
<script src="wallet.core.js"></script>
<script src="wallet.addr.js"></script>
<script src="wallet.tx.js"></script>
<script src="wallet.ui.js"></script>

<!-- 修复后 -->
<script src="wallet.core.js"></script>
<script src="wallet.addr.js"></script>
<script src="wallet.tx.js"></script>
<script src="wallet.ui.js"></script>
<script src="wallet.runtime.js"></script> <!-- ✅ 添加这一行 -->
```

#### 修复 2: 添加函数存在性检查

**文件**: `dist/wallet.tx.js`  
**位置**: 第218行

```javascript
// 原代码 (line 218)
drawHomeBalanceChart(total);

// 修复后
if (typeof drawHomeBalanceChart === 'function') drawHomeBalanceChart(total);
```

### 验证
修复后执行以下命令验证：
```bash
cd /Users/daxiang/Desktop/WorldWallet/dist
# 检查 HTML
grep "wallet.runtime.js" wallet.html

# 检查 JS
grep -n "typeof drawHomeBalanceChart" wallet.tx.js
```

### 影响范围
- 所有新创建钱包的用户
- 首页资产展示功能完全失效
- 图表渲染功能无法使用

---

## 其他观察到的问题

### API 调用失败（非关键）
- TronGrid API: 429 Too Many Requests (速率限制)
- Mempool.space API: 400 Bad Request (地址格式错误？)
- ETH RPC: 429 Too Many Requests
- CoinGecko API: ERR_FAILED (网络问题或API限制)

这些 API 错误不影响核心功能，但会导致：
- 余额显示为 0
- 价格数据无法加载
- 交易历史为空

**建议**：
1. 添加本地 fallback 数据
2. 优化 API 调用频率（添加缓存）
3. 提供离线模式提示

---

## 测试流程已完成步骤
✅ 1. 打开欢迎页  
✅ 2. 点击"创建新钱包"  
✅ 3. 生成12个词的助记词  
✅ 4. 跳过验证进入设置页  
✅ 5. 尝试进入首页（触发Bug）

## 待测试功能
- [ ] 助记词验证流程
- [ ] PIN码设置
- [ ] 导入钱包
- [ ] 转账功能
- [ ] 地址展示
- [ ] 礼物功能
- [ ] 兑换功能

---

**测试人**: AI开发总监（小郭）  
**测试时间**: 2026-04-06 17:43 GMT+7
