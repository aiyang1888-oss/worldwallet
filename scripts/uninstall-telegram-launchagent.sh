#!/usr/bin/env bash
# 移除 LaunchAgent：停止开机自启 telegram:cursor
set -euo pipefail

LABEL="com.worldwallet.telegram-cursor"
PLIST_DST="${HOME}/Library/LaunchAgents/${LABEL}.plist"
UID_NUM="$(id -u)"

if [[ "$(uname)" != "Darwin" ]]; then
  echo "仅支持 macOS。" >&2
  exit 1
fi

launchctl bootout "gui/${UID_NUM}/${LABEL}" 2>/dev/null || true

if [[ -f "$PLIST_DST" ]]; then
  rm -f "$PLIST_DST"
  echo "✅ 已删除 ${PLIST_DST}"
else
  echo "未找到 ${PLIST_DST}（可能未安装）。"
fi
