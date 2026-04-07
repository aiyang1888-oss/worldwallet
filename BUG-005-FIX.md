# BUG-005 修复方案

## 问题描述
点击资产列表项（USDT/TRX/ETH/BTC）后，页面内容消失，只剩导航栏。

## 根本原因
资产列表的 `.asset-item` 元素有 `cursor: pointer` 样式，但**没有绑定点击事件处理器**，导致点击后触发未定义行为。

## 修复方案

### 临时修复：拦截点击并显示提示

在 `wallet-shell/wallet.ui.js` 的第 17-21 行，修改全局点击监听器：

**修改前：**
```javascript
document.addEventListener('click', function(ev) {
  var el = ev.target.closest('.tab-item,.quick-btn,#homeCopyAddrBtn,#homeEditAddrBtn,#balRefreshBtn,.btn-primary,.btn-secondary');
  if (!el) return;
  tapHaptic(12);
}, true);
```

**修改后：**
```javascript
document.addEventListener('click', function(ev) {
  // 拦截资产列表点击
  if (ev.target.closest('.asset-item')) {
    ev.preventDefault();
    ev.stopPropagation();
    tapHaptic(12);
    if (typeof showToast === 'function') {
      showToast('💎 代币详情页开发中...', 'info');
    }
    return;
  }
  
  var el = ev.target.closest('.tab-item,.quick-btn,#homeCopyAddrBtn,#homeEditAddrBtn,#balRefreshBtn,.btn-primary,.btn-secondary');
  if (!el) return;
  tapHaptic(12);
}, true);
```

### 测试验证

修复后测试：
1. 打开 `dist/wallet.html`
2. 点击 USDT/TRX/ETH/BTC 任意资产项
3. **预期结果**：显示 "💎 代币详情页开发中..." 提示，页面不消失
4. **原问题**：页面内容消失只剩导航栏

### 提交命令

```bash
cd /Users/daxiang/Desktop/WorldWallet
git add wallet-shell/wallet.ui.js
git commit -m "fix: BUG-005 - 拦截资产列表点击，防止页面异常"
cd dist && git add . && git commit -m "fix: BUG-005 - 拦截资产列表点击" && git push origin main
```

## 长期方案

实现代币详情页（`page-token-detail`），包含：
- 当前余额和美元价值
- 最近交易记录
- 转账/收款按钮
- 价格走势图表

修改点击处理逻辑：
```javascript
if (ev.target.closest('.asset-item')) {
  ev.preventDefault();
  ev.stopPropagation();
  tapHaptic(12);
  
  var asset = ev.target.closest('.asset-item');
  var symbol = 'USDT'; // 从 asset.id 提取
  if (asset.id === 'assetRowTrx') symbol = 'TRX';
  else if (asset.id === 'assetRowEth') symbol = 'ETH';
  else if (asset.id === 'btcAssetRow') symbol = 'BTC';
  
  if (typeof goTo === 'function') {
    goTo('page-token-detail', { symbol: symbol });
  }
  return;
}
```
