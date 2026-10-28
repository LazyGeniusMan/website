#!/bin/sh
BIN=$(find "$TURUTAN_PROJECT_DIR/.tmp" -mindepth 4 -maxdepth 4 -type f -path "$TURUTAN_PROJECT_DIR/.tmp/chrome*/*/*/chrome-*" -name 'chrome*' 2>/dev/null | sort -V | tail -n 1)
exec "$BIN" --no-sandbox "$@"
