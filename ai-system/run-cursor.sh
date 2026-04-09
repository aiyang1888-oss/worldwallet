#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

# 把任务复制到剪贴板
pbcopy < ai-system/tasks/cursor-prompt.txt

# 打开 Cursor（确保前台）
open -a "Cursor"

# 给一点时间加载
sleep 3

# 模拟粘贴 + 发送（Enter）
osascript <<APPLESCRIPT
tell application "System Events"
    keystroke "v" using command down
    key code 36
end tell
APPLESCRIPT

echo "Cursor task sent at $(date)" >> "${ROOT}/cursor.log"
