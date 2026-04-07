#!/usr/bin/env bash
# Summarize current working tree (for use after edits before commit) and send via Telegram.
# Optional first arg: extra one-line note (e.g. what was fixed).
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"
NOTE="${1:-}"
BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"
STATUS="$(git status -sb 2>/dev/null | head -30)"
DIFFSTAT="$(git diff --stat HEAD 2>/dev/null | tail -n +1 || true)"
if [ -z "$DIFFSTAT" ]; then
  DIFFSTAT="(无相对 HEAD 的 diff，可能尚未保存或未跟踪新文件)"
fi
BODY="WorldWallet · 工作区变更 (${BRANCH})"
if [ -n "$NOTE" ]; then
  BODY+="
${NOTE}"
fi
BODY+="
${STATUS}

${DIFFSTAT}"
exec "$ROOT_DIR/scripts/telegram-notify.sh" "$BODY"
