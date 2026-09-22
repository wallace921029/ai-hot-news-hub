#!/usr/bin/env bash
# 一键启动开发环境：后端 (tsx watch :8762) + 前端 (vite :8763)
# 用法：./scripts/dev.sh [--force]
#   --force  若端口被占用，先杀掉占用进程再启动

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_PORT="${PORT:-8762}"
FRONTEND_PORT=8763
BACKEND_LOG="/tmp/ai-hot-news-backend.log"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info() { echo -e "${GREEN}[dev]${NC} $*"; }
warn() { echo -e "${YELLOW}[dev]${NC} $*"; }
fail() { echo -e "${RED}[dev]${NC} $*" >&2; exit 1; }

port_pids() { ss -tlnp 2>/dev/null | awk -v p=":$1\$" '$4 ~ p {print $NF}' | grep -oE 'pid=[0-9]+' | cut -d= -f2 | sort -u; }

kill_port() {
  local port=$1 pids
  pids="$(port_pids "$port" || true)"
  if [[ -n "$pids" ]]; then
    if [[ "$FORCE" == "1" ]]; then
      warn "端口 $port 被占用（PID: $pids），--force 已开启，正在终止..."
      # shellcheck disable=SC2086
      kill $pids 2>/dev/null || true
      sleep 1
    else
      fail "端口 $port 已被占用（PID: $pids）。先处理：kill $pids  或使用 ./scripts/dev.sh --force"
    fi
  fi
}

FORCE=0
[[ "${1:-}" == "--force" ]] && FORCE=1

cd "$ROOT"

# 依赖检查
[[ -d node_modules ]] || { info "安装前端依赖..."; npm install; }
[[ -d backend/node_modules ]] || { info "安装后端依赖..."; (cd backend && npm install); }

# 端口检查
kill_port "$BACKEND_PORT"
kill_port "$FRONTEND_PORT"

# 启动后端（后台）
info "启动后端 (tsx watch, :$BACKEND_PORT)..."
(cd backend && npm run dev > "$BACKEND_LOG" 2>&1) &
BACKEND_PID=$!

cleanup() {
  info "停止后端 (PID $BACKEND_PID)..."
  kill "$BACKEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" 2>/dev/null || true
}
trap cleanup EXIT

# 等待后端健康检查
info "等待后端就绪..."
for _ in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:$BACKEND_PORT/api/health" > /dev/null 2>&1; then
    info "后端已就绪 ✓  (日志: $BACKEND_LOG)"
    break
  fi
  sleep 0.5
  kill -0 "$BACKEND_PID" 2>/dev/null || { tail -20 "$BACKEND_LOG"; fail "后端启动失败，见上方日志"; }
done
curl -sf "http://127.0.0.1:$BACKEND_PORT/api/health" > /dev/null 2>&1 || fail "后端健康检查超时"

# 启动前端（前台）
info "启动前端 (vite, :$FRONTEND_PORT)..."
echo -e "${GREEN}[dev]${NC} 访问 http://localhost:$FRONTEND_PORT  (Ctrl+C 退出，前后端一并停止)"
npm run dev
