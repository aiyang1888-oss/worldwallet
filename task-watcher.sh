#!/bin/bash
# task-watcher.sh — 监听 TASK.md 变化，自动通知 Cursor 处理任务

TASK_FILE="/Users/daxiang/Desktop/WorldWallet/TASK.md"
LAST_HASH=""

echo "[task-watcher] 启动，监听 $TASK_FILE"

while true; do
  if [ -f "$TASK_FILE" ]; then
    CURRENT_HASH=$(md5 -q "$TASK_FILE")

    if [ "$CURRENT_HASH" != "$LAST_HASH" ] && [ -n "$LAST_HASH" ]; then
      # 检查是否有待处理任务
      if grep -q "状态：待处理" "$TASK_FILE"; then
        echo "[task-watcher] TASK.md 有新任务，触发 Cursor..."

        # 写入触发文件供 Cursor 检测
        echo "$(date): TASK.md updated - pending tasks found" >> /Users/daxiang/Desktop/WorldWallet/.cursor-trigger

        # 用 osascript 激活 Cursor 并粘贴任务指令
        osascript <<'APPLESCRIPT'
set taskMsg to "请读取 /Users/daxiang/Desktop/WorldWallet/TASK.md，修复所有状态为待处理的问题，完成后 git add . && git commit && git push，并将 TASK.md 中对应问题状态更新为已完成"

-- 尝试激活 Cursor
try
  tell application "Cursor" to activate
  delay 1
  tell application "System Events"
    tell process "Cursor"
      set frontmost to true
      delay 0.5
      keystroke taskMsg
      key code 36
    end tell
  end tell
end try
APPLESCRIPT

        echo "[task-watcher] 已触发 Cursor（$(date)）"
      fi
    fi

    LAST_HASH="$CURRENT_HASH"
  fi

  sleep 5
done
