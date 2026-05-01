#!/bin/zsh

set -euo pipefail

PROJECT_ROOT="/Users/adityasingh/Desktop/New folder 2/MiniProjecte/personal-blog-backend"
PID_DIR="$PROJECT_ROOT/.run"

stop_from_pid_file() {
  local file="$1"
  if [[ -f "$file" ]]; then
    local pid
    pid=$(cat "$file")
    if [[ -n "$pid" ]]; then
      kill -9 "$pid" 2>/dev/null || true
    fi
    rm -f "$file"
  fi
}

stop_from_pid_file "$PID_DIR/frontend.pid"
stop_from_pid_file "$PID_DIR/backend.pid"
stop_from_pid_file "$PID_DIR/mongo.pid"

for port in 3001 5001 27017; do
  pids=$(lsof -ti tcp:"$port" 2>/dev/null || true)
  if [[ -n "$pids" ]]; then
    kill -9 $pids 2>/dev/null || true
  fi
done

echo "Stopped frontend, backend, and MongoDB."
