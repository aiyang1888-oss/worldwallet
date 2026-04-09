#!/usr/bin/env bash
# 一键：刷新 SW 版本戳 → npm run build（dist→assets）→ 根目录 git commit & push → 触发 GitHub Pages
# 用法：
#   bash scripts/deploy-auto.sh
#   bash scripts/deploy-auto.sh "feat: 万语地址修复"
# 环境变量：
#   DRY_RUN=1     只构建不提交不推送
#   SKIP_PUSH=1   提交但不推送（本地验证）

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

MSG="${1:-chore: auto deploy $(date -u +%Y-%m-%dT%H%MZ)}"

echo "=== deploy-auto: $ROOT_DIR ==="

if [[ ! -f "$ROOT_DIR/dist/wallet.runtime.js" ]]; then
  echo "❌ dist/wallet.runtime.js 不存在。请先保证 dist/ 为完整静态包（可从 assets/ 同步：见 README）。"
  exit 1
fi

echo "[1/4] 语法检查…"
node --check "$ROOT_DIR/dist/wallet.runtime.js"
node --check "$ROOT_DIR/dist/wallet.addr.js"
node --check "$ROOT_DIR/dist/wallet.ui.js"

echo "[2/4] 更新 Service Worker 缓存版本（dist/sw.js）…"
# DRY_RUN：只校验构建，不修改 dist（避免 CI / 本地 dry 出现无关 diff）
if [[ "${DRY_RUN:-}" == "1" ]]; then
  echo "    （跳过：DRY_RUN — 不改 dist/sw.js）"
elif [[ -f "$ROOT_DIR/dist/sw.js" ]] && grep -q 'worldtoken-v' "$ROOT_DIR/dist/sw.js" 2>/dev/null; then
  NEW_VER="worldtoken-v$(date -u +%Y%m%d%H%M)"
  if [[ "$(uname)" == "Darwin" ]]; then
    sed -i '' "s/worldtoken-v[0-9]*/${NEW_VER}/g" "$ROOT_DIR/dist/sw.js"
  else
    sed -i "s/worldtoken-v[0-9]*/${NEW_VER}/g" "$ROOT_DIR/dist/sw.js"
  fi
  echo "    → $NEW_VER"
else
  echo "    （跳过：dist/sw.js 无 worldtoken-v 戳）"
fi

echo "[3/4] npm run build（dist → assets）…"
npm run build

if [[ "${DRY_RUN:-}" == "1" ]]; then
  echo "[4/4] DRY_RUN=1，跳过 git。"
  exit 0
fi

echo "[4/4] Git commit & push（仓库根目录）…"
git add -A
if git diff --cached --quiet; then
  echo "无变更，跳过提交。"
  exit 0
fi

git commit -m "$MSG" --no-verify

if [[ "${SKIP_PUSH:-}" == "1" ]]; then
  echo "SKIP_PUSH=1，已本地提交，未推送。"
  exit 0
fi

git push origin HEAD
echo "✅ 已推送。若已配置 GitHub Actions + Pages，站点将在 1～2 分钟内更新。"
echo "   https://www.worldtoken.cc/wallet.html"
