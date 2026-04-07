#!/usr/bin/env bash
# Every 60 seconds: run node --check on main wallet-shell JS files and send the result to Telegram.
# Configure TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID (see scripts/telegram-notify.sh).
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

FILES=(
  wallet-shell/wallet.ui.js
  wallet-shell/wallet.core.js
  wallet-shell/wallet.addr.js
  wallet-shell/wallet.tx.js
)

while true; do
  stamp="$(date '+%Y-%m-%d %H:%M:%S %z')"
  lines=""
  ok=1
  for f in "${FILES[@]}"; do
    if [ ! -f "$f" ]; then
      lines+="missing: $f"$'\n'
      ok=0
      continue
    fi
    if ! err="$(node --check "$f" 2>&1)"; then
      lines+="FAIL $f: ${err}"$'\n'
      ok=0
    fi
  done
  body="[WorldWallet bugwatch] ${stamp}"$'\n'
  if [ "$ok" -eq 1 ]; then
    body+="语法检查: OK (wallet-shell 核心 JS)"$'\n'
  else
    body+="语法检查: 有错误"$'\n'"${lines}"
  fi
  body+="git: "$(git status -sb 2>/dev/null | head -8 | paste -sd ' ' -)$'\n'
  if [ -x "$ROOT_DIR/scripts/telegram-notify.sh" ]; then
    "$ROOT_DIR/scripts/telegram-notify.sh" "$body" || echo "Telegram 发送失败（检查 TELEGRAM_*）" >&2
  fi
  sleep 60
done
