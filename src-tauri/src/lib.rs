pub mod auth;
pub mod commands;
pub mod db;
pub mod drive;
pub mod models;

use auth::{AuthConfig, OAuthFlowState};
use db::DbState;
use std::fs;
use tauri::{LogicalSize, Manager};

/// Application entry point — configures Tauri and registers all commands.
///
/// Phase 1 sets up SQLite storage and CRUD commands without a frontend.
/// The frontend (Vite + React) will be added in Phase 2.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Linux env vars (WEBKIT_DISABLE_DMABUF_RENDERER, WEBKIT_DISABLE_COMPOSITING_MODE,
    // GDK_BACKEND) are set EARLIER in main.rs::setup_linux_env() — before shared
    // library constructors in GTK/WebKit/Mesa have a chance to initialize EGL.
    //
    // This block is a safety net for non-standard entry points (tests, benchmarks,
    // FFI callers) that skip main.rs. The check ensures system/user overrides win.
    #[cfg(target_os = "linux")]
    {
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

    tauri::Builder::default()
            .setup(|app| {
                // Resolve the app data directory for the SQLite database file
                let app_data_dir = app
                    .path()
                    .app_data_dir()
                    .expect("Failed to resolve app data directory");
                fs::create_dir_all(&app_data_dir)
                    .expect("Failed to create app data directory");

                let conn =
                    db::open_database(&app_data_dir).expect("Failed to open SQLite database");
                let db_state = DbState::new(conn).expect("Failed to initialize database schema");
                app.manage(db_state);

                // Manage auth configuration and flow state
                app.manage(AuthConfig {
                    client_id: std::env::var("GOOGLE_CLIENT_ID").unwrap_or_default(),
                    redirect_uri: "http://127.0.0.1".to_string(),
                    scope: "https://www.googleapis.com/auth/drive.file".to_string(),
                });
                app.manage(OAuthFlowState::new());

                // Dynamic window sizing: fit to ~80 % of the active monitor,
                // respecting OS-level DPI scaling (Wayland, X11, Windows).
                // Falls back gracefully if monitor info is unavailable.
                if let Some(window) = app.get_webview_window("main") {
                    if let Ok(Some(monitor)) = window.current_monitor() {
                        let physical = monitor.size();
                        let scale = monitor.scale_factor();
                        let logical_w = physical.width as f64 / scale;
                        let logical_h = physical.height as f64 / scale;

                        let target_w = (logical_w * 0.80).round().max(900.0);
                        let target_h = (logical_h * 0.80).round().max(600.0);

                        let _ = window.set_size(LogicalSize::new(target_w, target_h));
                        let _ = window.center();
                        let _ = window.set_min_size(Some(LogicalSize::new(900.0, 600.0)));
                    }
                }

                Ok(())
            })
            .invoke_handler(tauri::generate_handler![
                // Course commands
                commands::courses::create_course,
                commands::courses::list_courses,
                commands::courses::update_course,
                commands::courses::delete_course,
                // Student commands
                commands::students::create_student,
                commands::students::list_students,
                commands::students::update_student,
                commands::students::delete_student,
                // Layout commands
                commands::layouts::save_layout,
                commands::layouts::get_layout,
                commands::layouts::list_layouts,
                commands::layouts::delete_layout,
                // Sync commands
                commands::sync::push_sync,
                commands::sync::pull_sync,
                commands::sync::get_sync_status,
                commands::sync::resolve_conflict,
                // Auth commands
                commands::auth::start_login,
                commands::auth::exchange_code,
                commands::auth::refresh_token,
                commands::auth::logout,
                commands::auth::get_auth_status,
                commands::auth::get_access_token,
            ])
            .run(tauri::generate_context!())
            .expect("Error while running Tauri application");
    }
