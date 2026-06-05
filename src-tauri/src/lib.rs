pub mod auth;
pub mod commands;
pub mod db;
pub mod drive;
pub mod models;

use auth::{AuthConfig, OAuthFlowState};
use db::DbState;
use std::fs;
use tauri::Manager;

/// Application entry point — configures Tauri and registers all commands.
///
/// Phase 1 sets up SQLite storage and CRUD commands without a frontend.
/// The frontend (Vite + React) will be added in Phase 2.
    #[cfg_attr(mobile, tauri::mobile_entry_point)]
    pub fn run() {
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
