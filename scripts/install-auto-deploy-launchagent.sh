#!/usr/bin/env bash
# 安装 macOS LaunchAgent：每 5 分钟检测未提交改动 → npm run build → commit → push
# 用法：bash scripts/install-auto-deploy-launchagent.sh
# 卸载：launchctl unload ~/Library/LaunchAgents/com.worldwallet.auto-deploy.plist && rm -f ~/Library/LaunchAgents/com.worldwallet.auto-deploy.plist

set -euo pipefail

if [[ "$(uname)" != "Darwin" ]]; then
  echo "仅支持 macOS。" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LABEL="com.worldwallet.auto-deploy"
PLIST_DST="${HOME}/Library/LaunchAgents/${LABEL}.plist"
LOG_DIR="${HOME}/Library/Logs/WorldWallet"
SCRIPT="${ROOT_DIR}/scripts/auto-commit-push.sh"

mkdir -p "$LOG_DIR"

cat > "$PLIST_DST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>WorkingDirectory</key>
  <string>${ROOT_DIR}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/sh</string>
    <string>${SCRIPT}</string>
  </array>
  <key>StartInterval</key>
  <integer>300</integer>
  <key>RunAtLoad</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${LOG_DIR}/auto-deploy.out.log</string>
  <key>StandardErrorPath</key>
  <string>${LOG_DIR}/auto-deploy.err.log</string>
</dict>
</plist>
EOF

launchctl unload "$PLIST_DST" 2>/dev/null || true
launchctl load "$PLIST_DST"

echo "✅ 已安装 LaunchAgent: $LABEL（每 300 秒执行一次）"
echo "   日志: $LOG_DIR/auto-deploy.*.log"
echo "   卸载: launchctl unload \"$PLIST_DST\" && rm \"$PLIST_DST\""
