#!/bin/sh
# auto-commit-push.sh — 检测未提交改动，npm run build（dist→assets）后 commit + push
# 由 LaunchAgent 定时调用；环境变量 AUTO_BUILD=0 可跳过构建（仅提交已有改动）

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO" || exit 1

# 有未暂存改动才处理
STATUS=$(git status --porcelain 2>/dev/null)
if [ -z "$STATUS" ]; then
  exit 0
fi

# 全量同步 dist/ → assets/（与 package.json build 一致，避免手工 cp 列表分叉）
if [ "${AUTO_BUILD:-1}" != "0" ] && command -v npm >/dev/null 2>&1 && [ -f "$REPO/dist/wallet.runtime.js" ]; then
  npm run build --silent 2>/dev/null || npm run build
fi

git add -A

# 再次检查是否真的有改动（避免空 commit）
STAGED=$(git diff --cached --name-only 2>/dev/null)
if [ -z "$STAGED" ]; then
  exit 0
fi

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
FILELIST=$(echo "$STAGED" | tr '\n' ' ' | cut -c1-80)
git commit -m "auto: [$TIMESTAMP] $FILELIST" --no-verify 2>&1
git push origin HEAD 2>&1
