#!/bin/bash
set -e

echo "=== Sonderr Desktop Setup ==="

# Ensure config directory exists
mkdir -p ~/.config/sonderr-desktop
mkdir -p ~/.local/share/applications
mkdir -p ~/.local/bin

# Symlink launcher
ln -sf "$(pwd)/scripts/launch-wizard.sh" ~/.local/bin/sonderr-desktop
ln -sf "$(pwd)/scripts/attach-cli.cjs" ~/.local/bin/sonderr-attach

# Desktop entry
cat > ~/.local/share/applications/sonderr-desktop.desktop << 'EOF'
[Desktop Entry]
Type=Application
Name=Sonderr Desktop
Comment=AI coding agent for desktop
Exec=sonderr-desktop
Icon=utilities-terminal
Terminal=true
Categories=Development;IDE;
StartupWMClass=SonderrDesktop
EOF

echo "✓ Installed Sonderr Desktop"
echo "  - Launcher: ~/.local/bin/sonderr-desktop"
echo "  - Attach CLI: ~/.local/bin/sonderr-attach"
echo "  - Desktop entry: ~/.local/share/applications/sonderr-desktop.desktop"
echo ""
echo "Run 'sonderr-desktop' to launch the setup wizard"
echo "Run '/api_attach' in Kilo to attach a new API key"
