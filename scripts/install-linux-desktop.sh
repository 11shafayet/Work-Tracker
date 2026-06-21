#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$HOME/.local/share/applications"
AUTOSTART_DIR="$HOME/.config/autostart"
DESKTOP_FILE="$APP_DIR/worktracker.desktop"
AUTOSTART_FILE="$AUTOSTART_DIR/worktracker.desktop"
RUN_SCRIPT="$PROJECT_DIR/scripts/run-worktracker.sh"
NODE_BIN="$(command -v node || true)"
NPM_BIN="$(command -v npm || true)"

if [[ -z "$NODE_BIN" || -z "$NPM_BIN" ]]; then
  echo "Node.js and npm must be available before installing WorkTracker."
  exit 1
fi

cd "$PROJECT_DIR"
npm run build
chmod +x "$RUN_SCRIPT"

mkdir -p "$APP_DIR" "$AUTOSTART_DIR"

cat > "$DESKTOP_FILE" <<EOF
[Desktop Entry]
Type=Application
Name=WorkTracker
Comment=Local desktop work tracker
Path=$PROJECT_DIR
Exec=$RUN_SCRIPT
Terminal=false
Categories=Office;Utility;
StartupNotify=false
EOF

cp "$DESKTOP_FILE" "$AUTOSTART_FILE"
chmod +x "$DESKTOP_FILE" "$AUTOSTART_FILE"

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$APP_DIR" >/dev/null 2>&1 || true
fi

echo "WorkTracker was added to your app launcher."
echo "WorkTracker was also added to startup apps for login."
