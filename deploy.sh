#!/bin/bash
# WorldWallet 一键部署脚本（真源 dist/）
# 用法: ./deploy.sh "commit message"

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
DIST_DIR="$ROOT_DIR/dist"
MSG="${1:-update}"

echo "=== WorldWallet Deploy ==="

# 1. 语法检查
echo "[1/5] 语法检查..."
node -c "$DIST_DIR/wallet.runtime.js"
node -c "$DIST_DIR/wordlists.js" 2>/dev/null || true

# 2. 构建：统一入口 + dist → assets
echo "[2/5] 构建（sync-assets）..."
(cd "$ROOT_DIR" && npm run build)

# 3. 更新 SW 版本
echo "[3/5] 更新 Service Worker..."
NEW_VER="worldtoken-v$(date +%Y%m%d%H%M)"
sed -i '' "s/worldtoken-v[0-9]*/worldtoken-v$(date +%Y%m%d%H%M)/" "$DIST_DIR/sw.js" 2>/dev/null || \
python3 -c "
import re
f='$DIST_DIR/sw.js'
c=open(f).read()
c=re.sub(r'worldtoken-v\d+','$NEW_VER',c)
open(f,'w').write(c)
"
echo "  SW版本: $NEW_VER"

# 4. Git commit + push
echo "[4/5] Git push..."
cd "$DIST_DIR"
git add -A
git commit -m "$MSG" || echo "  无变更"
git push origin main

# 5. 完成
echo "[5/5] ✅ 部署完成！"
echo "  2分钟后生效: https://www.worldtoken.cc/wallet.html"
