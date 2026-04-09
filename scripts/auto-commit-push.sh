#!/bin/sh
# auto-commit-push.sh — 检测未提交改动，自动 commit + push
# 由 LaunchAgent 每 60 秒调用一次

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

REPO="/Users/daxiang/Desktop/Projects/WorldWallet"
cd "$REPO" || exit 1

# 有未暂存改动才处理
STATUS=$(git status --porcelain 2>/dev/null)
if [ -z "$STATUS" ]; then
  exit 0
fi

# 同步 dist/ → assets/（如有差异）
for f in wallet.ui.js wallet.runtime.js wallet.addr.js wallet.tx.js wallet.core.js wallet.css wallet.v2.css wallet.dom-bind.js wallet.html index.html app.html; do
  src="dist/$f"
  dst="assets/$f"
  if [ -f "$src" ] && [ -f "$dst" ]; then
    if ! cmp -s "$src" "$dst"; then
      cp "$src" "$dst"
    fi
  fi
done

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
