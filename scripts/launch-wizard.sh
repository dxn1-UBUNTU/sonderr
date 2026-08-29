#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WIZARD_SERVER="$SCRIPT_DIR/../scripts/wizard-server.cjs"
PORT=${SONDERR_WIZARD_PORT:-17381}

if ! lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
  node "$WIZARD_SERVER" &
  WIZARD_PID=$!
  sleep 1
else
  WIZARD_PID=""
fi

xdg-open "http://localhost:$PORT/setup" >/dev/null 2>&1 || x-www-browser "http://localhost:$PORT/setup" >/dev/null 2>&1 || echo "Open http://localhost:$PORT/setup in your browser"

if [ -n "$WIZARD_PID" ]; then
  wait $WIZARD_PID
fi
