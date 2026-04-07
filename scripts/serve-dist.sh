#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
PORT=8766
PID_FILE="$ROOT_DIR/.serve-dist.pid"
LOG_FILE="$ROOT_DIR/.serve-dist.log"

if [ ! -d "$DIST_DIR" ]; then
  echo "dist directory not found: $DIST_DIR" >&2
  exit 1
fi

if [ -f "$PID_FILE" ]; then
  old_pid="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [ -n "${old_pid:-}" ] && kill -0 "$old_pid" 2>/dev/null; then
    echo "already running: PID=$old_pid"
    exit 0
  fi
  rm -f "$PID_FILE"
fi

cd "$DIST_DIR"
nohup python3 -m http.server "$PORT" >"$LOG_FILE" 2>&1 &
new_pid=$!
echo "$new_pid" > "$PID_FILE"

sleep 0.5
if kill -0 "$new_pid" 2>/dev/null; then
  echo "started: http://localhost:$PORT/wallet.html (PID=$new_pid)"
else
  echo "failed to start, check $LOG_FILE" >&2
  exit 1
fi
