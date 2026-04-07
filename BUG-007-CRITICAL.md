# BUG-007 - P0 级别：首次访问跳转错误页面

## 问题编号
BUG-007

## 严重等级
**P0 - Critical**（阻断所有新用户使用）

## 问题现象

清空 localStorage 后刷新页面（模拟首次访问）：
1. URL 自动变为 `https://www.worldtoken.cc/wallet.html#page-home`
2. 页面显示空白内容区域，只有底部导航栏（资产/地址/兑换/礼物/设置）
3. 用户无法创建钱包、无法使用产品

**预期行为：**
- 首次访问应显示欢迎页（`#page-welcome`）
- 用户可以选择：创建钱包 / PIN 解锁 / 导入钱包

## 根本原因

**文件：** `dist/wallet.ui.js` 第 355-365 行

```javascript
} catch (_eWb) {}
if (_savedWalletBoot && typeof goTo === 'function') {
  setTimeout(function () { goTo('page-home'); }, 0);
} else {
  var welcomePage = document.getElementById('page-welcome');
  if (welcomePage) {
    welcomePage.classList.add('active');
  }
  var _tbBoot = document.getElementById('tabBar');
  if (_tbBoot) _tbBoot.style.display = 'none';
}
```

**逻辑缺陷：**
1. 当 `_savedWalletBoot = false`（无钱包数据）时，正确执行了 else 分支
2. else 分支只添加了 `welcomePage.classList.add('active')`
3. **但页面仍然被后续路由逻辑重定向到 `#page-home`**
4. 可能是 URL hash 恢复逻辑或默认路由导致

## 影响范围

**受影响用户：**
- ✅ 所有首次访问的新用户（100%）
- ✅ 清空数据后重新访问的用户
- ✅ 无痕/隐私模式访问的用户

**业务影响：**
- 产品完全无法被新用户使用
- 0% 转化率（用户无法创建钱包）
- 严重 UX 问题

## 修复方案

### 方案一：强制重定向到欢迎页（推荐）

修改 `dist/wallet.ui.js` 第 355-365 行：

```javascript
} catch (_eWb) {}
if (_savedWalletBoot && typeof goTo === 'function') {
  setTimeout(function () { goTo('page-home'); }, 0);
} else {
  // 强制跳转到欢迎页
  setTimeout(function () { 
    var welcomePage = document.getElementById('page-welcome');
    if (welcomePage) {
      welcomePage.classList.add('active');
    }
    var _tbBoot = document.getElementById('tabBar');
    if (_tbBoot) _tbBoot.style.display = 'none';
    
    // 清空可能的错误 hash
    if (location.hash && location.hash !== '#page-welcome') {
      location.hash = '';
    }
  }, 0);
}
```

**优点：**
- 确保无钱包时不会跳转到其他页面
- 清除错误的 URL hash

### 方案二：修改路由恢复逻辑

查找页面加载时的路由恢复代码，添加钱包检查：

```javascript
// 页面加载时的路由逻辑（伪代码示意）
window.addEventListener('load', function() {
  var hasWallet = checkWalletExists(); // 检查钱包是否存在
  var hash = location.hash;
  
  if (!hasWallet && hash !== '#page-welcome') {
    // 无钱包时，阻止跳转到其他页面
    location.hash = '';
    goTo('page-welcome');
    return;
  }
  
  // 正常路由恢复
  if (hash) {
    restoreFromHash(hash);
  }
});
```

## 测试验证步骤

### 准备工作
```bash
cd /Users/daxiang/Desktop/WorldWallet
git add dist/wallet.ui.js
git commit -m "fix: BUG-007 prevent redirect to page-home when no wallet exists"
git push origin main
```

### 手动测试

**测试用例 1：首次访问（清空 localStorage）**
1. 打开浏览器控制台
2. 执行 `localStorage.clear(); location.reload();`
3. **预期结果：**
   - URL 保持为 `https://www.worldtoken.cc/wallet.html` 或 `#page-welcome`
   - 页面显示欢迎页内容（创建钱包/PIN 解锁/导入钱包按钮）
   - 底部导航栏隐藏

**测试用例 2：无痕模式访问**
1. 打开无痕窗口
2. 访问 `https://www.worldtoken.cc/wallet.html`
3. **预期结果：** 同测试用例 1

**测试用例 3：已有钱包后正常访问**
1. 创建一个钱包（设置 PIN）
2. 刷新页面
3. **预期结果：**
   - URL 变为 `#page-home`
   - 显示资产页面
   - 底部导航栏正常显示

**测试用例 4：直接访问 `#page-home`（无钱包）**
1. 清空 localStorage
2. 访问 `https://www.worldtoken.cc/wallet.html#page-home`
3. **预期结果：**
   - 自动重定向到欢迎页
   - URL 变为空或 `#page-welcome`

## 代码审查清单

- [ ] 修改 `dist/wallet.ui.js` 第 355-365 行启动逻辑
- [ ] 检查是否有其他路由恢复逻辑需要修改
- [ ] 确认 `goTo()` 函数不会在无钱包时被错误调用
- [ ] 验证所有主页面（`page-home`, `page-swap` 等）都有钱包检查
- [ ] 测试所有测试用例

## 相关文件

- **主文件：** `/Users/daxiang/Desktop/WorldWallet/dist/wallet.ui.js`
- **测试 URL：** https://www.worldtoken.cc/wallet.html

## 提交信息模板

```
fix: BUG-007 prevent redirect to page-home when no wallet exists

- Force redirect to welcome page when no wallet data
- Clear incorrect URL hash on first visit
- Add wallet existence check before routing
- Hide bottom navigation bar on welcome page

Fixes #BUG-007
```

---

**创建时间：** 2026-04-07 06:06  
**优先级：** P0  
**状态：** 待修复  
**责任人：** Cursor
