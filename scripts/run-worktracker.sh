#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/worktracker"
LOG_FILE="$LOG_DIR/launcher.log"

mkdir -p "$LOG_DIR"
cd "$PROJECT_DIR"

{
  echo "[$(date --iso-8601=seconds)] Starting WorkTracker from $PROJECT_DIR"
  npm start
} >> "$LOG_FILE" 2>&1
