#!/bin/bash
# Telegram 工作通知脚本
# 读取 .env 配置后发送通知

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

if [ -f "$ENV_FILE" ]; then
  export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

TOKEN="${TELEGRAM_BOT_TOKEN:-}"
CHAT="${TELEGRAM_CHAT_ID:-}"

if [ -z "$TOKEN" ] || [ -z "$CHAT" ]; then
  echo "[telegram-notify] ERROR: TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not configured in $ENV_FILE" >&2
  exit 1
fi

MSG="${1:-✅ WorldWallet 任务已完成}"

curl -s -X POST "https://api.telegram.org/bot${TOKEN}/sendMessage" \
  -H "Content-Type: application/json" \
  -d "{\"chat_id\":\"${CHAT}\",\"text\":\"${MSG}\"}" > /dev/null 2>&1

echo "[telegram-notify] sent: ${MSG:0:80}"
