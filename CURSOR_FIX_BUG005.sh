#!/bin/bash
# BUG-005 修复脚本 - 直接修改文件

set -e

cd /Users/daxiang/Desktop/WorldWallet

echo "=== 修复 BUG-005：拦截资产列表点击 ==="

# 备份原文件
cp wallet-shell/wallet.ui.js wallet-shell/wallet.ui.js.bak

# 使用 sed 修改 wallet-shell/wallet.ui.js
# 在第 17-21 行添加资产点击拦截逻辑
cat > /tmp/fix_bug005.patch << 'EOF'
17,21c17,30
< document.addEventListener('click', function(ev) {
<   var el = ev.target.closest('.tab-item,.quick-btn,#homeCopyAddrBtn,#homeEditAddrBtn,#balRefreshBtn,.btn-primary,.btn-secondary');
<   if (!el) return;
<   tapHaptic(12);
< }, true);
---
> document.addEventListener('click', function(ev) {
>   // 拦截资产列表点击
>   if (ev.target.closest('.asset-item')) {
>     ev.preventDefault();
>     ev.stopPropagation();
>     tapHaptic(12);
>     if (typeof showToast === 'function') {
>       showToast('💎 代币详情页开发中...', 'info');
>     }
>     return;
>   }
>   
>   var el = ev.target.closest('.tab-item,.quick-btn,#homeCopyAddrBtn,#homeEditAddrBtn,#balRefreshBtn,.btn-primary,.btn-secondary');
>   if (!el) return;
>   tapHaptic(12);
> }, true);
EOF

# 应用补丁
ed -s wallet-shell/wallet.ui.js < /tmp/fix_bug005.patch

# 同步到 dist
cp wallet-shell/wallet.ui.js dist/wallet.ui.js

echo "✅ 文件修改完成"

# Git 提交
git add wallet-shell/wallet.ui.js dist/wallet.ui.js
git commit -m "fix: BUG-005 - 拦截资产列表点击，防止页面异常"

echo "✅ Git commit 完成"

# 推送
cd dist
git add wallet.ui.js
git commit -m "fix: BUG-005 - 拦截资产列表点击"
git push origin main

cd ..

echo "✅ 修复完成并已推送"
