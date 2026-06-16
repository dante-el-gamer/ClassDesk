#!/usr/bin/env bash
# Patch AppRun inside the AppDir to inject WebKit EGL workaround env vars.
# Called after linuxdeploy generates the AppDir, before appimagetool packs it.
#
# Usage: patch-appimage-apprun.sh <appdir>
#
# This injects:
#   WEBKIT_DISABLE_DMABUF_RENDERER=1
#   WEBKIT_DISABLE_COMPOSITING_MODE=1
# into the AppRun so they're set BEFORE the Rust binary starts, catching
# any C/C++ static constructors in libwebkit2gtk / libgtk-3 / Mesa EGL.

set -euo pipefail

APPDIR="${1:?Usage: $0 <appdir>}"
APPRUN="$APPDIR/AppRun"

if [ ! -f "$APPRUN" ]; then
    echo "ERROR: AppRun not found at $APPRUN"
    exit 1
fi

# Check if already patched
if grep -q "WEBKIT_DISABLE_DMABUF_RENDERER" "$APPRUN" 2>/dev/null; then
    echo "AppRun already patched, skipping."
    exit 0
fi

# Insert env vars before the exec line
sed -i '/^exec /i\
# WebKit EGL workaround: set before binary exec (defense in depth)\\
export WEBKIT_DISABLE_DMABUF_RENDERER="${WEBKIT_DISABLE_DMABUF_RENDERER:-1}"\\
export WEBKIT_DISABLE_COMPOSITING_MODE="${WEBKIT_DISABLE_COMPOSITING_MODE:-1}"' "$APPRUN"

echo "Patched $APPRUN with WebKit EGL workaround env vars."
