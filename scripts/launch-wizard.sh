#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WIZARD_PORT="${SONDERR_WIZARD_PORT:-17381}"

# Start wizard server if not running
if ! curl -s http://localhost:$WIZARD_PORT/ > /dev/null 2>&1; then
  node "$SCRIPT_DIR/wizard-server.cjs" &
  WIZARD_PID=$!
  sleep 2
fi

# Open wizard in browser
xdg-open "http://localhost:$WIZARD_PORT/setup" 2>/dev/null || \
  xdg-open "http://localhost:$WIZARD_PORT/" 2>/dev/null || \
  echo "Open http://localhost:$WIZARD_PORT/setup in your browser"

wait $WIZARD_PID 2>/dev/null || true
