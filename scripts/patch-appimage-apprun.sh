#!/usr/bin/env bash
# Patch an AppDir or already-packed AppImage to:
#   1. Inject Mesa/WebKit EGL workaround env vars into AppRun
#   2. Remove bundled Mesa/EGL libraries (use system ones at runtime)
#
# Usage:
#   patch-appimage-apprun.sh <appdir>          # patch AppDir in-place (no repack)
#   patch-appimage-apprun.sh <AppImage>        # extract → patch → repack (in-place)
#
# Env vars injected into AppRun:
#   WEBKIT_DISABLE_DMABUF_RENDERER=1
#   WEBKIT_DISABLE_COMPOSITING_MODE=1
#   GDK_BACKEND=x11
#
# Libraries removed from the AppDir (system fallback via ld.so):
#   libEGL*, libGLESv2*, libgbm*, libGLdispatch*, libwayland-*

set -euo pipefail

INPUT="${1:?Usage: $0 <appdir|AppImage>}"
WORKDIR=""

cleanup() {
    if [ -n "$WORKDIR" ] && [ -d "$WORKDIR" ]; then
        rm -rf "$WORKDIR"
    fi
}
trap cleanup EXIT

# ─── Determine input type ───────────────────────────────────────────────
REPACK=false
if [ -d "$INPUT" ]; then
    APPDIR="$INPUT"
    echo "Input is an AppDir at $APPDIR"
elif [ -f "$INPUT" ]; then
    INPUT_FILE="$(realpath "$INPUT")"
    WORKDIR="$(mktemp -d)"
    echo "Extracting AppImage $INPUT_FILE ..."

    # Try unsquashfs first
    if command -v unsquashfs &>/dev/null; then
        echo "  Method: unsquashfs ..."
        if ! unsquashfs -d "$WORKDIR/squashfs-root" "$INPUT_FILE"; then
            echo "  unsquashfs failed, trying --appimage-extract ..."
            cd "$WORKDIR"
            if ! APPIMAGE_EXTRACT_AND_RUN=1 "$INPUT_FILE" --appimage-extract; then
                echo "ERROR: all extraction methods failed"
                echo "  unsquashfs: available but failed"
                echo "  --appimage-extract: available but failed"
                cd "$OLDPWD"
                exit 1
            fi
            cd "$OLDPWD"
        fi
    elif [ -x "$INPUT_FILE" ]; then
        echo "  Method: --appimage-extract ..."
        cd "$WORKDIR"
        if ! APPIMAGE_EXTRACT_AND_RUN=1 "$INPUT_FILE" --appimage-extract; then
            echo "ERROR: --appimage-extract failed"
            cd "$OLDPWD"
            exit 1
        fi
        cd "$OLDPWD"
    else
        echo "ERROR: cannot extract — need unsquashfs or executable AppImage"
        exit 1
    fi

    APPDIR="$WORKDIR/squashfs-root"
    if [ ! -d "$APPDIR" ]; then
        echo "ERROR: extraction produced no squashfs-root directory"
        ls -la "$WORKDIR/" 2>/dev/null || true
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
    ls -la "$APPDIR/" 2>/dev/null || true
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

# ─── 2. Remove bundled Mesa/EGL + Wayland libraries ──────────────────────
# These are incompatible across distros when bundled in the AppImage.
# Removing them forces ld.so to fall back to system libraries.
# - Mesa/EGL: conflicts between Ubuntu 24.04 Mesa and Fedora 43 Intel driver
# - libwayland-*: Ubuntu 24.04 Wayland libs crash on Fedora 43 even with
#   GDK_BACKEND=x11, because they get loaded via LD_LIBRARY_PATH and
#   trigger EGL initialization through libepoxy/runtime loading.
REMOVE_PATTERNS=(
    # Mesa/EGL
    "$APPDIR"/lib/x86_64-linux-gnu/libEGL*
    "$APPDIR"/usr/lib/x86_64-linux-gnu/libEGL*
    "$APPDIR"/lib/x86_64-linux-gnu/libGLESv2*
    "$APPDIR"/usr/lib/x86_64-linux-gnu/libGLESv2*
    "$APPDIR"/lib/x86_64-linux-gnu/libgbm*
    "$APPDIR"/usr/lib/x86_64-linux-gnu/libgbm*
    "$APPDIR"/lib/x86_64-linux-gnu/libGLdispatch*
    "$APPDIR"/usr/lib/x86_64-linux-gnu/libGLdispatch*
    # Wayland (causes EGL_BAD_PARAMETER when bundled from Ubuntu on Fedora)
    "$APPDIR"/usr/lib/libwayland-client*
    "$APPDIR"/usr/lib/libwayland-server*
    "$APPDIR"/usr/lib/libwayland-cursor*
    "$APPDIR"/usr/lib/libwayland-egl*
    "$APPDIR"/lib/x86_64-linux-gnu/libwayland-client*
    "$APPDIR"/usr/lib/x86_64-linux-gnu/libwayland-client*
    "$APPDIR"/lib/x86_64-linux-gnu/libwayland-server*
    "$APPDIR"/usr/lib/x86_64-linux-gnu/libwayland-server*
    "$APPDIR"/lib/x86_64-linux-gnu/libwayland-cursor*
    "$APPDIR"/usr/lib/x86_64-linux-gnu/libwayland-cursor*
    "$APPDIR"/lib/x86_64-linux-gnu/libwayland-egl*
    "$APPDIR"/usr/lib/x86_64-linux-gnu/libwayland-egl*
)

REMOVED=0
for pattern in "${REMOVE_PATTERNS[@]}"; do
    for f in $pattern; do
        if [ -f "$f" ]; then
            rm -f "$f"
            echo "  Removed bundled: $(basename "$f")"
            REMOVED=$((REMOVED + 1))
        fi
    done
done

if [ "$REMOVED" -eq 0 ]; then
    echo "No bundled Mesa/EGL/Wayland libraries found to remove."
else
    echo "Removed $REMOVED bundled graphics libraries — system libraries will be used."
fi

# ─── 3. Re-pack if input was an AppImage ────────────────────────────────
if [ "$REPACK" = true ]; then
    APPIMAGETOOL=""
    for candidate in appimagetool /usr/local/bin/appimagetool; do
        if command -v "$candidate" &>/dev/null; then
            APPIMAGETOOL="$candidate"
            break
        fi
    done

    if [ -z "$APPIMAGETOOL" ]; then
        echo "ERROR: appimagetool not found on PATH or /usr/local/bin"
        echo "  PATH=$PATH"
        exit 1
    fi

    echo "Repacking patched AppImage to $INPUT_FILE ..."
    NO_STRIP=1 "$APPIMAGETOOL" "$APPDIR" "$INPUT_FILE"
    chmod +x "$INPUT_FILE"
    echo "Done! Patched AppImage: $INPUT_FILE ($(du -h "$INPUT_FILE" | cut -f1))"
fi
