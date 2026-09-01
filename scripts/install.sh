#!/bin/bash
# Sonderr global installer
# Links the `sonderr` command to this source checkout.
# The launcher self-bootstraps on every run (git pull -> Bun install if missing
# -> bun install -> TUI), so the global command always runs fresh Sonderr code.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BIN_SRC="$REPO_DIR/packages/cli/bin/sonderr.cjs"
BIN_DIR="${SONDERR_INSTALL_DIR:-$HOME/.local/bin}"
BIN_DST="$BIN_DIR/sonderr"

if [ ! -f "$BIN_SRC" ]; then
  echo "Error: launcher not found at $BIN_SRC" >&2
  echo "Run this script from the Sonderr repository root:" >&2
  echo "  git clone https://github.com/dxn1-UBUNTU/sonderr.git" >&2
  echo "  cd sonderr" >&2
  echo "  ./scripts/install.sh" >&2
  exit 1
fi

mkdir -p "$BIN_DIR"

# Remove any existing sonderr link/binary
if [ -L "$BIN_DST" ] || [ -f "$BIN_DST" ]; then
  echo "Removing existing sonderr at $BIN_DST"
  rm -f "$BIN_DST"
fi

chmod +x "$BIN_SRC"
ln -sf "$BIN_SRC" "$BIN_DST"

echo ""
echo "Installed: $BIN_DST -> $BIN_SRC"
echo ""

# Check PATH
case ":$PATH:" in
  *":$BIN_DIR:"*)
    echo "'$BIN_DIR' is in your PATH."
    ;;
  *)
    echo "Add this to your shell profile (~/.bashrc, ~/.zshrc, etc.):"
    echo ""
    echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
    echo ""
    echo "Then restart your shell or run: source ~/.bashrc"
    ;;
esac

echo ""
echo "Run 'sonderr' from any directory."
echo "It will auto-update, install Bun if needed, and open the TUI."