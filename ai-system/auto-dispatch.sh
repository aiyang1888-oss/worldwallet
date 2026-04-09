#!/bin/bash
# 自动派发：检查 HIGH 问题 → 调用 cursor-agent 修复 → Telegram 通知
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

TASKS_JSON="ai-system/tasks/fix-tasks.json"
PROMPT_FILE="ai-system/tasks/cursor-prompt.txt"
LOG="${ROOT}/cursor.log"
AGENT="${CURSOR_AGENT:-$HOME/.local/bin/cursor-agent}"
TOKEN="${TG_BOT_TOKEN:-$TELEGRAM_BOT_TOKEN}"
CHAT="${TG_CHAT_ID:-$TELEGRAM_CHAT_ID}"

tg_send() {
  [ -z "$TOKEN" ] || [ -z "$CHAT" ] && return
  curl -s -X POST "https://api.telegram.org/bot${TOKEN}/sendMessage" \
    -H "Content-Type: application/json" \
    -d "{\"chat_id\":\"${CHAT}\",\"text\":\"$1\"}" > /dev/null 2>&1
}

# 检查是否有 HIGH 问题
if [ ! -f "$TASKS_JSON" ]; then
  echo "[auto-dispatch] no fix-tasks.json, skip" >> "$LOG"
  exit 0
fi

HIGH_COUNT=$(python3 -c "
import json
tasks = json.load(open('$TASKS_JSON'))
print(sum(1 for t in tasks if t.get('severity','').upper() == 'HIGH'))
" 2>/dev/null)

if [ "${HIGH_COUNT:-0}" -eq 0 ]; then
  echo "[auto-dispatch] $(date): no HIGH issues, skip" >> "$LOG"
  exit 0
fi

echo "[auto-dispatch] $(date): found $HIGH_COUNT HIGH issue(s), dispatching to cursor-agent..." >> "$LOG"
tg_send "🤖 发现 ${HIGH_COUNT} 个 HIGH 问题，正在派给 Cursor 修复..."

# 读取 prompt 内容
if [ ! -f "$PROMPT_FILE" ]; then
  echo "[auto-dispatch] cursor-prompt.txt missing" >> "$LOG"
  exit 1
fi

PROMPT=$(cat "$PROMPT_FILE")

# 调用 cursor-agent
RESULT=$("$AGENT" --print --yolo "$PROMPT" 2>&1)
echo "$RESULT" >> "$LOG"

# 提取摘要
SUMMARY=$(echo "$RESULT" | grep -o "FIXED:.*\|FEAT:.*\|fix:.*\|已.*完成.*\|验证.*通过\|本次.*改动.*" | head -1 | cut -c1-120)
[ -z "$SUMMARY" ] && SUMMARY=$(echo "$RESULT" | tail -3 | grep -v "^$" | head -1 | cut -c1-100)
[ -z "$SUMMARY" ] && SUMMARY="执行完成"

echo "[auto-dispatch] $(date): done" >> "$LOG"
tg_send "✅ Cursor 修复完成！
${SUMMARY}"
