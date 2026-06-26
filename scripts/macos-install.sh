#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SERVER_DIR="$ROOT_DIR/server"
ARCH="current"
SKIP_BUILD=0
INSTALL_APP=0

usage() {
  cat <<'USAGE'
Xenesis Desk macOS install/package helper

Usage:
  bash scripts/macos-install.sh [options]

Options:
  --arch current|arm64|x64|universal
      Build target architecture. Default: current.
  --skip-build
      Install dependencies and rebuild native modules only.
  --install-app
      Copy the packaged .app into /Applications after a successful build.
  -h, --help
      Show this help.

Examples:
  bash scripts/macos-install.sh
  bash scripts/macos-install.sh --arch arm64
  bash scripts/macos-install.sh --arch universal --install-app
USAGE
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --arch)
      ARCH="${2:-}"
      shift 2
      ;;
    --skip-build)
      SKIP_BUILD=1
      shift
      ;;
    --install-app)
      INSTALL_APP=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

case "$ARCH" in
  current|arm64|x64|universal) ;;
  *)
    echo "--arch must be one of: current, arm64, x64, universal" >&2
    exit 2
    ;;
esac

if [ "$(uname -s)" != "Darwin" ]; then
  echo "This script must run on macOS (darwin)." >&2
  exit 1
fi

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Required command not found: $1" >&2
    exit 1
  fi
}

require_path() {
  if [ ! -e "$1" ]; then
    echo "Required workspace path not found: $1" >&2
    exit 1
  fi
}

require_cmd node
require_cmd npm
require_cmd xcode-select
require_cmd xattr

if ! xcode-select -p >/dev/null 2>&1; then
  echo "Xcode Command Line Tools are required. Run: xcode-select --install" >&2
  exit 1
fi

node_version="$(node -p "process.versions.node")"
node_major="${node_version%%.*}"
node_minor="$(node -p "process.versions.node.split('.')[1]")"
if [ "$node_major" -lt 22 ] || { [ "$node_major" -eq 22 ] && [ "$node_minor" -lt 12 ]; }; then
  echo "Node.js 22.12 or newer is required. Current: $node_version" >&2
  exit 1
fi

npm_major="$(npm -v | cut -d. -f1)"
if [ "$npm_major" -lt 10 ]; then
  echo "npm 10 or newer is required. Current: $(npm -v)" >&2
  exit 1
fi

require_path "$ROOT_DIR/package.json"
require_path "$ROOT_DIR/../../packages/core/package.json"
require_path "$ROOT_DIR/../../packages/viewer/package.json"
require_path "$ROOT_DIR/../../../xcon-chain/packages/core/package.json"
require_path "$ROOT_DIR/../../../xcon-workflow/packages/core/package.json"

if [ -z "${CSC_LINK:-}" ] && [ -z "${CSC_NAME:-}" ]; then
  export CSC_IDENTITY_AUTO_DISCOVERY=false
  echo "No macOS signing identity configured; building an unsigned local package."
fi

echo "== Xenesis Desk: environment =="
echo "macOS: $(sw_vers -productVersion)"
echo "CPU: $(uname -m)"
echo "Node: $node_version"
echo "npm: $(npm -v)"
echo "Root: $ROOT_DIR"

echo "== Xenesis Desk: main dependencies install =="
npm install --prefix "$ROOT_DIR"

echo "== Xenesis Desk: server dependencies install =="
npm run server:install --prefix "$ROOT_DIR"

echo "== Xenesis Desk: rebuild server native modules =="
(cd "$SERVER_DIR" && npm rebuild)

echo "== Xenesis Desk: rebuild Electron native modules =="
(cd "$ROOT_DIR" && npx electron-rebuild -f -w @lydell/node-pty)

if [ "$SKIP_BUILD" -eq 1 ]; then
  echo "Skipped macOS package build."
  exit 0
fi

case "$ARCH" in
  current) BUILD_SCRIPT="dist:mac" ;;
  arm64) BUILD_SCRIPT="dist:mac:arm64" ;;
  x64) BUILD_SCRIPT="dist:mac:x64" ;;
  universal) BUILD_SCRIPT="dist:mac:universal" ;;
esac

# Default current-architecture packaging maps to: npm run dist:mac
echo "== Xenesis Desk: build macOS package ($ARCH) =="
npm run "$BUILD_SCRIPT" --prefix "$ROOT_DIR"

APP_PATH="$(find "$ROOT_DIR/release" -maxdepth 3 -type d -name 'Xenesis Desk.app' -print -quit 2>/dev/null || true)"
if [ -n "$APP_PATH" ]; then
  xattr -dr com.apple.quarantine "$APP_PATH" 2>/dev/null || true
fi

if [ "$INSTALL_APP" -eq 1 ]; then
  if [ -z "$APP_PATH" ]; then
    echo "Packaged .app was not found under release/." >&2
    exit 1
  fi
  TARGET_APP="/Applications/Xenesis Desk.app"
  echo "== Xenesis Desk: install app =="
  if [ -w "/Applications" ]; then
    ditto "$APP_PATH" "$TARGET_APP"
  else
    sudo ditto "$APP_PATH" "$TARGET_APP"
  fi
  xattr -dr com.apple.quarantine "$TARGET_APP" 2>/dev/null || true
  echo "Installed: $TARGET_APP"
fi

echo ""
echo "Done. Check release/ for dmg, zip, and packaged app output."
find "$ROOT_DIR/release" -maxdepth 2 -type f \( -name '*.dmg' -o -name '*.zip' -o -name '*.yml' \) -print 2>/dev/null || true
