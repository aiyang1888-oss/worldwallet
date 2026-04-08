#!/usr/bin/env bash
# Send a plain-text message via Telegram Bot API.
# Requires: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (export or in repo-root .env)
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
if [ -f "$ROOT_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
elif [ -f "$ROOT_DIR/assets/.env" ]; then
  # 兼容：部分环境只在 assets/.env 配过 TELEGRAM_*（优先仍应用仓库根目录 .env）
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/assets/.env"
  set +a
fi
TOKEN="${TELEGRAM_BOT_TOKEN:-}"
CHAT="${TELEGRAM_CHAT_ID:-}"
if [ -z "$TOKEN" ] || [ -z "$CHAT" ]; then
  echo "telegram-notify: set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID (e.g. in .env)" >&2
  exit 1
fi
MSG="${1:-}"
if [ -z "$MSG" ]; then
  MSG="$(cat)"
fi
if [ -z "$MSG" ]; then
  echo "telegram-notify: empty message" >&2
  exit 1
fi

# Telegram sendMessage text limit is 4096; send in chunks to avoid failures.
send_one() {
  local chunk="$1"
  curl -sS -X POST "https://api.telegram.org/bot${TOKEN}/sendMessage" \
    --data-urlencode "chat_id=${CHAT}" \
    --data-urlencode "text=${chunk}" \
    --data "disable_web_page_preview=true" | grep -q '"ok":true'
}

MAX=4000
rest="$MSG"
n=0
while [ -n "$rest" ]; do
  chunk="${rest:0:$MAX}"
  rest="${rest:$MAX}"
  n=$((n + 1))
  if ! send_one "$chunk"; then
    echo "telegram-notify: API error (part $n)" >&2
    exit 1
  fi
done
