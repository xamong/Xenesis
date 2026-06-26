#!/usr/bin/env bash
# Xenesis Desk — 개발 환경 시작 스크립트 (Linux / macOS)
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/.."
SERVER_DIR="$ROOT_DIR/server"
export XENIS_HOME="${XENIS_HOME:-$HOME/.xenis-dev}"

# ── 의존성 설치 ──────────────────────────────────────────────────────────────
echo "📦 npm install..."
npm install --prefix "$ROOT_DIR"

# ── 서버 의존성 설치 (처음 한 번) ─────────────────────────────────────────────
if [ -f "$SERVER_DIR/package.json" ] && [ ! -d "$SERVER_DIR/node_modules" ]; then
    echo "📦 서버 의존성 설치 중..."
    npm install --prefix "$SERVER_DIR"
fi

# ── SQLite 서버 백그라운드 시작 ───────────────────────────────────────────────
SERVER_PID=""
if [ -f "$SERVER_DIR/index.js" ]; then
    echo "🚀 SQLite 서버 시작 중 (port 3001)..."
    node "$SERVER_DIR/index.js" &
    SERVER_PID=$!
    sleep 2
    echo "✅ SQLite 서버 가동됨 (PID: $SERVER_PID)"
else
    echo "⚠ server/index.js 를 찾을 수 없어 서버를 시작하지 않습니다."
fi

# ── Electron 개발 서버 시작 ───────────────────────────────────────────────────
cleanup() {
    if [ -n "$SERVER_PID" ]; then
        echo ""
        echo "🛑 SQLite 서버 종료 중 (PID: $SERVER_PID)..."
        kill "$SERVER_PID" 2>/dev/null || true
    fi
}
trap cleanup EXIT INT TERM

npm run dev:electron --prefix "$ROOT_DIR"
