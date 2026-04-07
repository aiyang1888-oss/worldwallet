#!/usr/bin/env bash
# Install .git/hooks/post-commit to notify Telegram after each commit (when .env + TELEGRAM_NOTIFY_ON_COMMIT=1).
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
HOOK="$ROOT_DIR/.git/hooks/post-commit"
mkdir -p "$(dirname "$HOOK")"
cat >"$HOOK" <<'EOF'
#!/bin/sh
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT" || exit 0
if [ -f "$ROOT/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$ROOT/.env"
  set +a
fi
case "${TELEGRAM_NOTIFY_ON_COMMIT:-}" in
  1|true|yes) ;;
  *) exit 0 ;;
esac
if [ -z "${TELEGRAM_BOT_TOKEN:-}" ] || [ -z "${TELEGRAM_CHAT_ID:-}" ]; then
  exit 0
fi
if [ -x "$ROOT/scripts/telegram-notify-commit.sh" ]; then
  "$ROOT/scripts/telegram-notify-commit.sh" || true
fi
EOF
chmod +x "$HOOK"
echo "Installed: $HOOK"
echo "Ensure .env has TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, and TELEGRAM_NOTIFY_ON_COMMIT=1"
