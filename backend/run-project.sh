#!/bin/zsh

set -euo pipefail

PROJECT_ROOT="/Users/adityasingh/Desktop/New folder 2/MiniProjecte/personal-blog-backend"
CLIENT_ROOT="$PROJECT_ROOT/client"
PID_DIR="$PROJECT_ROOT/.run"
MONGO_LOG="/tmp/personal-blog-mongodb.log"
MONGO_OUT="/tmp/personal-blog-mongodb.stdout.log"
MONGO_PID_FILE="$PID_DIR/mongo.pid"
BACKEND_PID_FILE="$PID_DIR/backend.pid"
FRONTEND_PID_FILE="$PID_DIR/frontend.pid"

mkdir -p "$PID_DIR"

cleanup_port() {
  local port="$1"
  local pids
  pids=$(lsof -ti tcp:"$port" 2>/dev/null || true)
  if [[ -n "$pids" ]]; then
    echo "Stopping existing process on port $port..."
    kill -9 $pids 2>/dev/null || true
  fi
}

cleanup_port 27017
cleanup_port 5001
cleanup_port 3001

echo "Starting MongoDB..."
mongod \
  --dbpath /tmp/personal-blog-mongodb \
  --bind_ip 127.0.0.1 \
  --port 27017 \
  --nounixsocket \
  --auth \
  --logpath "$MONGO_LOG" \
  > "$MONGO_OUT" 2>&1 &
echo $! > "$MONGO_PID_FILE"

sleep 3

echo "Starting backend..."
cd "$PROJECT_ROOT"
node server.js > "$PID_DIR/backend.log" 2>&1 &
echo $! > "$BACKEND_PID_FILE"

sleep 3

echo "Starting frontend..."
cd "$CLIENT_ROOT"
HOST=127.0.0.1 BROWSER=none PORT=3001 npm start > "$PID_DIR/frontend.log" 2>&1 &
echo $! > "$FRONTEND_PID_FILE"

sleep 5

echo ""
echo "Project is starting."
echo "Frontend: http://127.0.0.1:3001"
echo "Backend:  http://127.0.0.1:5001"
echo ""
echo "Use this to stop everything:"
echo "zsh \"$PROJECT_ROOT/stop-project.sh\""
