# WorldToken 钱包 — Cursor 任务清单 v2

## 项目信息
- **dist/wallet.html**：主文件，直接编辑这个
- **线上地址**：https://www.worldtoken.cc/wallet.html
- **GitHub**：https://github.com/aiyang1888-oss/worldwallet（push 到 main = 上线）

## 已完成（不用再做）
- ✅ 10 种语言词库（GeoNames 全球行政区，2048词/语言）
- ✅ 移动端 16px 输入框防止 iOS 缩放
- ✅ 复制地址按钮 bug 修复
- ✅ 恢复钱包逻辑修复

## 现在要做的功能（按优先级）

### 1. 创建→恢复流程端到端测试
用代码测试：
- 创建钱包，拿到地址 + 中文助记词
- 用中文助记词导入
- 验证恢复后的地址 = 创建时的地址
- 如果不一致，找 bug 修复

测试方法：在 wallet.html 里找 `createRealWallet()` 与 `doImportWallet()` → `getMnemonicFromGrid()` → `restoreWallet()`，用 Node.js 写测试脚本验证

### 2. 导入页面 UI 优化
- 导入助记词时，12个输入格应该支持「粘贴整串空格分隔的词」自动分割填入
- 例如用户复制「奥尔迪诺 马萨纳 恩坎普 …」粘贴到第一格，自动拆分到12格

### 3. 助记词页面增加「一键复制全部」按钮
- 点击后把12个词拼成空格分隔的字符串复制到剪贴板
- 按钮文字：「📋 复制助记词」，复制后变「✅ 已复制」，2秒后恢复

### 4. 设置页「备份密钥」功能
- 点进去显示当前钱包的助记词（需要验证 PIN 后才显示）
- 如果没有设置 PIN，直接显示

### 5. 多链地址显示
- 首页显示 TRX/ETH/BTC 三个地址
- 每个地址右侧有📋复制按钮

## 推送流程
```bash
cd /Users/daxiang/Desktop/WorldWallet/dist
git add wallet.html
git commit -m "feat: ..."
git push origin main
```

## 注意事项
- wallet.html 是单文件 app，所有逻辑在里面
- WT_WORDLISTS 是真实密钥词库（不要动）
- SAMPLE_KEYS 是展示用词库（可以动）
- createRealWallet() → 生成真实 BIP39 → 存 window.REAL_WALLET.enMnemonic
- renderKeyGrid(lang) → 用索引映射显示对应语言词
- importWallet(words, lang) → 反向映射回英文词 → ethers.js 解析
