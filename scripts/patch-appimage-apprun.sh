#!/usr/bin/env bash
# Patch an AppDir or already-packed AppImage to:
#   1. Inject Mesa/WebKit EGL workaround env vars into AppRun
#   2. Remove bundled Mesa/EGL libraries (use system ones at runtime)
#
# Usage:
#   patch-appimage-apprun.sh <appdir>          # patch AppDir (no repack)
#   patch-appimage-apprun.sh <AppImage>        # extract → patch → repack (in-place)
#
# Env vars injected into AppRun:
#   WEBKIT_DISABLE_DMABUF_RENDERER=1
#   WEBKIT_DISABLE_COMPOSITING_MODE=1
#   GDK_BACKEND=x11
#
# Libraries removed from the AppDir (system fallback via ld.so):
#   libEGL*, libGLESv2*, libgbm*, libGLdispatch*

set -euo pipefail

INPUT="${1:?Usage: $0 <appdir|AppImage>}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKDIR=""

cleanup() {
    if [ -n "$WORKDIR" ] && [ -d "$WORKDIR" ]; then
        rm -rf "$WORKDIR"
    fi
}
trap cleanup EXIT

# ─── Determine input type ───────────────────────────────────────────────
if [ -d "$INPUT" ]; then
    APPDIR="$INPUT"
    REPACK=false
elif [ -f "$INPUT" ]; then
    INPUT_FILE="$(realpath "$INPUT")"
    WORKDIR="$(mktemp -d)"
    echo "Extracting AppImage to $WORKDIR ..."

    if command -v unsquashfs &>/dev/null; then
        unsquashfs -d "$WORKDIR/squashfs-root" "$INPUT_FILE" >/dev/null 2>&1
    elif [ -x "$INPUT_FILE" ]; then
        APPIMAGE_EXTRACT_AND_RUN=1 "$INPUT_FILE" --appimage-extract >/dev/null 2>&1
        # --appimage-extract extracts to ./squashfs-root in CWD
        mv squashfs-root "$WORKDIR/" 2>/dev/null || true
    else
        echo "ERROR: cannot extract AppImage — need unsquashfs or --appimage-extract support"
        exit 1
    fi

    APPDIR="$WORKDIR/squashfs-root"
    if [ ! -d "$APPDIR" ]; then
        echo "ERROR: extraction failed"
        exit 1
    fi
    REPACK=true
    echo "Extracted to $APPDIR"
else
    echo "ERROR: $INPUT is neither a directory (AppDir) nor a file (AppImage)"
    exit 1
fi

APPRUN="$APPDIR/AppRun"
if [ ! -f "$APPRUN" ]; then
    echo "ERROR: AppRun not found at $APPRUN"
    exit 1
fi

# ─── 1. Patch AppRun with env vars ──────────────────────────────────────
if grep -q "WEBKIT_DISABLE_DMABUF_RENDERER" "$APPRUN" 2>/dev/null; then
    echo "AppRun already patched, skipping env var injection."
else
    sed -i '/^exec /i\
# Mesa/EGL workaround: force software renderer before any C constructor runs\
export WEBKIT_DISABLE_DMABUF_RENDERER="${WEBKIT_DISABLE_DMABUF_RENDERER:-1}"\
export WEBKIT_DISABLE_COMPOSITING_MODE="${WEBKIT_DISABLE_COMPOSITING_MODE:-1}"\
export GDK_BACKEND="${GDK_BACKEND:-x11}"' "$APPRUN"
    echo "Patched AppRun with Mesa/EGL workaround env vars."
fi

# ─── 2. Remove bundled Mesa/EGL libraries ───────────────────────────────
# These are incompatible across distros when bundled in the AppImage.
# Removing them forces ld.so to fall back to the system Mesa libraries.
MESA_LIBS=(
    "$APPDIR"/lib/x86_64-linux-gnu/libEGL*
    "$APPDIR"/usr/lib/x86_64-linux-gnu/libEGL*
    "$APPDIR"/lib/x86_64-linux-gnu/libGLESv2*
    "$APPDIR"/usr/lib/x86_64-linux-gnu/libGLESv2*
    "$APPDIR"/lib/x86_64-linux-gnu/libgbm*
    "$APPDIR"/usr/lib/x86_64-linux-gnu/libgbm*
    "$APPDIR"/lib/x86_64-linux-gnu/libGLdispatch*
    "$APPDIR"/usr/lib/x86_64-linux-gnu/libGLdispatch*
)

REMOVED=0
for pattern in "${MESA_LIBS[@]}"; do
    for f in $pattern; do
        if [ -f "$f" ]; then
            rm -f "$f"
            echo "  Removed bundled: $(basename "$f")"
            REMOVED=$((REMOVED + 1))
        fi
    done
done

if [ "$REMOVED" -eq 0 ]; then
    echo "No bundled Mesa/EGL libraries found to remove."
else
    echo "Removed $REMOVED bundled Mesa/EGL libraries — system libraries will be used."
fi

# ─── 3. Re-pack if input was an AppImage ────────────────────────────────
if [ "$REPACK" = true ]; then
    if ! command -v appimagetool &>/dev/null; then
        echo "ERROR: appimagetool not found, cannot repack."
        echo "Install from: https://github.com/AppImage/AppImageKit/releases"
        exit 1
    fi

    # Overwrite the original AppImage with the patched version
    echo "Repacking patched AppImage to $INPUT_FILE ..."
    NO_STRIP=1 appimagetool "$APPDIR" "$INPUT_FILE"
    chmod +x "$INPUT_FILE"
    echo "Done! Patched AppImage: $INPUT_FILE ($(du -h "$INPUT_FILE" | cut -f1))"
fi
