#!/usr/bin/env bash
# 安装 macOS LaunchAgent：用户登录后自动运行 npm run telegram:cursor
# 用法：bash scripts/install-telegram-launchagent.sh
# 卸载：bash scripts/uninstall-telegram-launchagent.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LABEL="com.worldwallet.telegram-cursor"
PLIST_DST="${HOME}/Library/LaunchAgents/${LABEL}.plist"
LOG_DIR="${HOME}/Library/Logs/WorldWallet"
NODE_BIN="$(command -v node)"

if [[ "$(uname)" != "Darwin" ]]; then
  echo "仅支持 macOS。" >&2
  exit 1
fi

if [[ -z "$NODE_BIN" ]]; then
  echo "未找到 node，请先安装 Node.js。" >&2
  exit 1
fi

mkdir -p "$LOG_DIR"

# PATH 需包含 cursor（通常在 ~/.local/bin）
export PATH="${HOME}/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${PATH:-}"

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
    <string>${NODE_BIN}</string>
    <string>${ROOT_DIR}/scripts/telegram-cursor-control.mjs</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>${HOME}/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
    <key>HOME</key>
    <string>${HOME}</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>ThrottleInterval</key>
  <integer>10</integer>
  <key>StandardOutPath</key>
  <string>${LOG_DIR}/telegram-cursor.stdout.log</string>
  <key>StandardErrorPath</key>
  <string>${LOG_DIR}/telegram-cursor.stderr.log</string>
</dict>
</plist>
EOF

chmod 644 "$PLIST_DST"
UID_NUM="$(id -u)"

# 已加载则先卸载
launchctl bootout "gui/${UID_NUM}/${LABEL}" 2>/dev/null || true

launchctl bootstrap "gui/${UID_NUM}" "$PLIST_DST"
launchctl enable "gui/${UID_NUM}/${LABEL}"
launchctl kickstart -k "gui/${UID_NUM}/${LABEL}"

echo "✅ 已安装并启动: ${PLIST_DST}"
echo "   日志: ${LOG_DIR}/telegram-cursor.{stdout,stderr}.log"
echo "   卸载: bash scripts/uninstall-telegram-launchagent.sh"
