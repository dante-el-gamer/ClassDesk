pub mod schema;

use rusqlite::Connection;
use std::path::Path;
use std::sync::Mutex;

/// Shared application state holding the SQLite connection.
///
/// Wrapped in a Mutex for thread-safe access from Tauri command handlers.
pub struct DbState {
    pub db: Mutex<Connection>,
}

impl DbState {
    /// Open a connection, run schema migrations, and wrap it in DbState.
    pub fn new(conn: Connection) -> Result<Self, rusqlite::Error> {
        schema::migrate(&conn)?;
        Ok(Self {
            db: Mutex::new(conn),
        })
    }
}

/// Open (or create) the SQLite database file at the app data directory.
///
/// Enables WAL mode for better concurrent read performance and
/// foreign key enforcement for cascade deletes.
pub fn open_database(app_data_dir: &Path) -> Result<Connection, rusqlite::Error> {
    let db_path = app_data_dir.join("classroom_seating.db");
    let conn = Connection::open(&db_path)?;

    conn.execute_batch(
        "PRAGMA journal_mode=WAL;
         PRAGMA foreign_keys=ON;",
    )?;

    Ok(conn)
}

/// Open an in-memory SQLite database (for testing).
pub fn open_in_memory_database() -> Result<Connection, rusqlite::Error> {
    let conn = Connection::open_in_memory()?;
    conn.execute_batch("PRAGMA foreign_keys=ON;")?;
    Ok(conn)
}

/// Run all pending schema migrations on the given connection.
///
/// Convenience alias for test and init code.
pub fn run_migrations(conn: &Connection) -> Result<(), rusqlite::Error> {
    schema::migrate(conn)
}
