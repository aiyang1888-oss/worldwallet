#!/bin/sh
# watch-and-push.sh — 实时监控项目文件变动，2秒内自动 commit + push
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

REPO="/Users/daxiang/Desktop/Projects/WorldWallet"
COOLDOWN=4  # 防抖：文件变动后等待4秒再提交（等 Cursor 写完所有文件）
LAST_COMMIT=0

do_commit_push() {
  cd "$REPO" || return
  STATUS=$(git status --porcelain 2>/dev/null)
  [ -z "$STATUS" ] && return

  # 同步 dist/ → assets/
  for f in wallet.ui.js wallet.runtime.js wallet.addr.js wallet.tx.js wallet.core.js wallet.css wallet.v2.css wallet.dom-bind.js wallet.html index.html app.html; do
    src="dist/$f"; dst="assets/$f"
    [ -f "$src" ] && [ -f "$dst" ] && ! cmp -s "$src" "$dst" && cp "$src" "$dst"
  done

  git add -A
  STAGED=$(git diff --cached --name-only 2>/dev/null)
  [ -z "$STAGED" ] && return

  TIMESTAMP=$(date '+%H:%M:%S')
  FILES=$(echo "$STAGED" | tr '\n' ' ' | cut -c1-80)
  git commit -m "auto[$TIMESTAMP]: $FILES" --no-verify 2>&1
  git push origin HEAD 2>&1
}

echo "[watch-push] 开始监控 $REPO"

/opt/homebrew/bin/fswatch -r \
  --exclude="\.git" \
  --exclude="node_modules" \
  --exclude="reports/" \
  --exclude="\.log$" \
  --latency 2 \
  "$REPO/dist" \
  "$REPO/wallet.ui.js" \
  "$REPO/wallet.runtime.js" \
  "$REPO/wallet.addr.js" \
  "$REPO/wallet.tx.js" \
  "$REPO/wallet.html" | while read -r changed; do
    NOW=$(date +%s)
    DIFF=$((NOW - LAST_COMMIT))
    if [ "$DIFF" -ge "$COOLDOWN" ]; then
      LAST_COMMIT=$NOW
      echo "[watch-push] 变动: $changed → 触发推送"
      do_commit_push
    fi
  done
