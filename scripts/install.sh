#!/bin/bash
set -e

echo "=== Sonderr Setup ==="

mkdir -p ~/.config/sonderr
mkdir -p ~/.local/share/applications
mkdir -p ~/.local/bin

BIN_SRC="$(pwd)/dist/sonderr-linux-x64"
if [ ! -f "$BIN_SRC" ]; then
  echo "Error: Binary not found at $BIN_SRC"
  exit 1
fi

cp "$BIN_SRC" ~/.local/bin/sonderr
chmod +x ~/.local/bin/sonderr

ln -sf "$(pwd)/scripts/launch-wizard.sh" ~/.local/bin/sonderr-desktop
ln -sf "$(pwd)/scripts/attach-cli.cjs" ~/.local/bin/sonderr-attach

cat > ~/.local/share/applications/sonderr-desktop.desktop << 'DESKTOP'
[Desktop Entry]
Type=Application
Name=Sonderr
Comment=AI coding agent for desktop
Exec=sonderr-desktop
Icon=utilities-terminal
Terminal=true
Categories=Development;IDE;
StartupWMClass=Sonderr
DESKTOP

echo "✓ Installed Sonderr"
echo "  - Binary: ~/.local/bin/sonderr"
echo "  - Launcher: ~/.local/bin/sonderr-desktop"
echo "  - Attach CLI: ~/.local/bin/sonderr-attach"
echo "  - Desktop entry: ~/.local/share/applications/sonderr-desktop.desktop"
echo ""
echo "Run 'sonderr-desktop' to launch the setup wizard"
echo "Run '/api_attach' in Sonderr to attach a new API key"
