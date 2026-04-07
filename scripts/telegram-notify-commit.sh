#!/usr/bin/env bash
# Build a short summary of HEAD commit and send via scripts/telegram-notify.sh
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"
HASH="$(git rev-parse --short HEAD 2>/dev/null || echo '?')"
SUBJECT="$(git log -1 --pretty=%s 2>/dev/null || echo '(no commit)')"
BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"
STAT="$(git show -1 --pretty=format: --stat 2>/dev/null || true)"
BODY="WorldWallet · commit ${HASH} (${BRANCH})
${SUBJECT}

${STAT}"
exec "$ROOT_DIR/scripts/telegram-notify.sh" "$BODY"
