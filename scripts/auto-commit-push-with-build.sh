#!/bin/sh
# 在 auto-commit-push 之前先 npm run build，保证 dist→assets 与线上发布目录一致
# 环境变量 AUTO_BUILD=0 可跳过构建（仅同步/提交）

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO" || exit 1

if [ "${AUTO_BUILD:-1}" != "0" ] && command -v npm >/dev/null 2>&1; then
  # 有 dist 真源时再构建，避免空目录报错
  if [ -f "$REPO/dist/wallet.runtime.js" ]; then
    npm run build --silent 2>/dev/null || npm run build
  fi
fi

exec /bin/sh "$REPO/scripts/auto-commit-push.sh"
