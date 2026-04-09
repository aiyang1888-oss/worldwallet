#!/bin/bash
# dist/ 为唯一 Web 应用源码目录（唯一真源，Source of Truth）。
# assets/ 为 dist/ 的完整镜像，仅由本脚本 rsync 生成；请勿手改 assets/ 后当作主源。
set -e
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
ASSETS_DIR="$ROOT_DIR/assets"

echo "📦 校验 dist/（唯一真源）…"
for f in wallet.html wallet.css wallet.core.js wallet.ui.js wallet.addr.js wallet.tx.js wallet.token.js wallet.runtime.js wallet.dom-bind.js wordlists.js; do
  if [ ! -f "$DIST_DIR/$f" ]; then
    echo "❌ 缺少 dist/$f"
    exit 1
  fi
done
for f in js/api-config.js js/storage.js core/security.js; do
  if [ ! -f "$DIST_DIR/$f" ]; then
    echo "❌ 缺少 dist/$f"
    exit 1
  fi
done
if [ ! -d "$DIST_DIR/wordlists" ]; then
  echo "❌ 缺少 dist/wordlists/"
  exit 1
fi
echo "✅ dist/ 完整"

# 统一 HTML 入口：仅 wallet.html 为编辑真源；以下由同内容覆盖，避免多入口分叉
# （不覆盖 _sitemap.html、+not-found.html 等 Expo 产物）
echo "📄 统一入口：dist/index.html、dist/app.html ← dist/wallet.html"
cp -f "$DIST_DIR/wallet.html" "$DIST_DIR/index.html"
cp -f "$DIST_DIR/wallet.html" "$DIST_DIR/app.html"

echo "🔗 rsync：dist/ → assets/（全量镜像，--delete 删除 assets 中多余文件）…"
mkdir -p "$ASSETS_DIR"
# 尾斜杠：同步目录「内容」到目标，使 assets/ 与 dist/ 结构一致
# 排除：dist 内误放的 .git（勿进静态资源镜像）；.env（敏感，不应出现在公开目录）
rsync -a --delete \
  --exclude '.git/' \
  --exclude '.env' \
  "${DIST_DIR}/" "${ASSETS_DIR}/"
echo "✅ assets/ 已与 dist/ 对齐（已排除 .git、.env）"

# 为 HTML 内相对路径的 JS/CSS 等追加 ?v=短 SHA，减轻 CDN/浏览器缓存旧资源（与提交绑定，同 commit 下 idempotent）
WW_ASSET_VER="${GITHUB_SHA:-}"
if [ -z "$WW_ASSET_VER" ] && command -v git >/dev/null 2>&1; then
  WW_ASSET_VER="$(git -C "$ROOT_DIR" rev-parse HEAD 2>/dev/null || true)"
fi
WW_ASSET_VER="$(echo "$WW_ASSET_VER" | cut -c1-7)"
[ -z "$WW_ASSET_VER" ] && WW_ASSET_VER="dev"
export WW_ASSET_VER
for html in "$ASSETS_DIR/wallet.html" "$ASSETS_DIR/index.html" "$ASSETS_DIR/app.html"; do
  if [ -f "$html" ]; then
    node "$ROOT_DIR/scripts/inject-html-asset-query.mjs" "$html"
  fi
done
echo "✅ HTML 资源 URL 已追加 ?v=${WW_ASSET_VER}"
