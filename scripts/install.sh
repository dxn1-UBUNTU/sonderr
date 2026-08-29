#!/bin/bash
# Sonderr global installer: links the `sonderr` command to this source checkout.
# The launcher self-bootstraps on every run (git pull -> Bun install if missing
# -> bun install -> TUI), so the global command always runs fresh SONDERR code.
set -e

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BIN_SRC="$REPO_DIR/packages/cli/bin/sonderr.cjs"
BIN_DIR="${SONDERR_INSTALL_DIR:-$HOME/.local/bin}"
BIN_DST="$BIN_DIR/sonderr"

if [ ! -f "$BIN_SRC" ]; then
  echo "error: $BIN_SRC not found - run this from a SONDERR checkout (scripts/ dir)" >&2
  exit 1
fi

mkdir -p "$BIN_DIR"
chmod +x "$BIN_SRC"
ln -sf "$BIN_SRC" "$BIN_DST"

echo "Installed: $BIN_DST -> $BIN_SRC"
case ":$PATH:" in
  *":$BIN_DIR:"*) ;;
  *) echo "NOTE: $BIN_DIR is not in your PATH - add 'export PATH=\"$BIN_DIR:\$PATH\"' to your shell rc." ;;
esac

echo ""
echo "Done. Run 'sonderr' from any directory - it updates the checkout, installs"
echo "Bun automatically if missing, and opens the TUI in that directory."
