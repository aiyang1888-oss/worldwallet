#!/bin/bash
# WorldWallet Bug #1 修复脚本
# 修复首页黑屏问题：添加 wallet.runtime.js 引用和函数安全检查

set -e  # 遇到错误立即退出

DIST_DIR="/Users/daxiang/Desktop/WorldWallet/dist"
cd "$DIST_DIR" || exit 1

echo "🔧 开始修复 WorldWallet Bug #1..."

# 备份原文件
echo "📦 备份原文件..."
cp -f wallet.html wallet.html.backup_$(date +%Y%m%d_%H%M%S)
cp -f wallet.tx.js wallet.tx.js.backup_$(date +%Y%m%d_%H%M%S)

# 修复 1: 在 HTML 中添加 wallet.runtime.js
echo "✅ [1/2] 添加 wallet.runtime.js 引用到 HTML..."
if grep -q "wallet.runtime.js" wallet.html; then
    echo "   ⏭️  wallet.runtime.js 已存在，跳过"
else
    # 在 wallet.ui.js 后面添加 wallet.runtime.js
    sed -i.tmp '/<script src="wallet.ui.js"><\/script>/a\
<script src="wallet.runtime.js"></script>' wallet.html
    echo "   ✔️  已添加 wallet.runtime.js"
fi

# 修复 2: 添加函数存在性检查
echo "✅ [2/2] 添加 drawHomeBalanceChart 函数安全检查..."
if grep -q "if(typeof drawHomeBalanceChart==='function')" wallet.tx.js; then
    echo "   ⏭️  函数检查已存在，跳过"
else
    # 替换直接调用为安全调用
    sed -i.tmp2 "s/drawHomeBalanceChart(total);/if(typeof drawHomeBalanceChart==='function') drawHomeBalanceChart(total);/" wallet.tx.js
    echo "   ✔️  已添加函数安全检查"
fi

# 清理临时文件
rm -f wallet.html.tmp wallet.tx.js.tmp wallet.tx.js.tmp2

# 验证修复
echo ""
echo "🔍 验证修复结果..."
echo "   HTML 引用检查:"
if grep -q "wallet.runtime.js" wallet.html; then
    echo "   ✔️  wallet.runtime.js 已正确引入"
else
    echo "   ❌  wallet.runtime.js 引入失败"
    exit 1
fi

echo "   JS 函数检查:"
if grep -q "if(typeof drawHomeBalanceChart==='function')" wallet.tx.js; then
    echo "   ✔️  函数安全检查已添加"
else
    echo "   ❌  函数安全检查添加失败"
    exit 1
fi

echo ""
echo "✅ 修复完成！"
echo ""
echo "📋 下一步："
echo "   1. 刷新浏览器 (Ctrl+R 或 Cmd+R)"
echo "   2. 清除缓存 (Ctrl+Shift+R 或 Cmd+Shift+R)"
echo "   3. 测试首页是否正常显示"
echo ""
echo "💾 备份文件位置: $DIST_DIR/wallet.*.backup_*"
echo "📄 详细报告: /Users/daxiang/Desktop/WorldWallet/BUG_REPORT_20260406.md"
