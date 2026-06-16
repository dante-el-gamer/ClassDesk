// Hide the console window on Windows in release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/// Linux (WebKitGTK) workaround: disable hardware-accelerated compositing to
/// avoid "Could not create default EGL display: EGL_BAD_PARAMETER" crashes.
///
/// These env vars MUST be set before ANY Tauri/GTK/WebKit code runs — even
/// before the `run()` function in lib.rs, because shared library constructors
/// in `libwebkit2gtk` or `libgtk-3` may initialize EGL before `main()`.
///
/// Setting them here (a static initializer) ensures they take effect at the
/// earliest possible point in the Rust process.
///
/// - WEBKIT_DISABLE_DMABUF_RENDERER=1 : disables DMA-BUF hw acceleration
///   (WebKitGTK >= 2.42; replaces the removed WEBKIT_DISABLE_COMPOSITING_MODE)
/// - WEBKIT_DISABLE_COMPOSITING_MODE=1 : legacy fallback, harmless on newer
///   WebKitGTK versions but kept for maximum compatibility
/// - GDK_BACKEND=x11 : force X11 backend (Wayland + bundled libwayland-egl can
///   trigger EGL_BAD_PARAMETER even when running under X11)
///
/// All three are set only if the user hasn't already defined them, respecting
/// system or user overrides.
#[cfg(target_os = "linux")]
fn setup_linux_env() {
    // Safety: std::env::set_var is called once at startup from the main thread,
    // before any other threads are spawned. This is the safe and intended use.
    if std::env::var("WEBKIT_DISABLE_DMABUF_RENDERER").is_err() {
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }
    if std::env::var("WEBKIT_DISABLE_COMPOSITING_MODE").is_err() {
        std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
    }
    if std::env::var("GDK_BACKEND").is_err() {
        std::env::set_var("GDK_BACKEND", "x11");
    }
}

fn main() {
    // Linux env vars MUST be set before any Tauri/WebKit code.
    // This runs before lib.rs::run() to catch early static initializers
    // in system libraries (GTK, WebKit, Mesa EGL).
    #[cfg(target_os = "linux")]
    setup_linux_env();

    classdeck_lib::run();
}
