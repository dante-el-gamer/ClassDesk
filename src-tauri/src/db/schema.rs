/// Current schema version of the database.
/// Increment this when adding migrations in later phases.
pub const SCHEMA_VERSION: i32 = 2;

// ---------------------------------------------------------------------------
// Table DDL statements
// ---------------------------------------------------------------------------

/// Tracks which schema version the database is at.
const CREATE_SCHEMA_VERSION: &str = "
    CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER NOT NULL
    );
";

/// Core course table.
const CREATE_COURSES: &str = "
    CREATE TABLE IF NOT EXISTS courses (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        active_layout_id TEXT
    );
";

/// Students belong to a course. Deleting a course cascades to its students.
const CREATE_STUDENTS: &str = "
    CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        course_id TEXT NOT NULL,
        name TEXT NOT NULL,
        student_id TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    );
";

/// Seating layouts belong to a course.
/// `placements` is a JSON string storing studentId -> SeatPosition mappings.
const CREATE_SEATING_LAYOUTS: &str = "
    CREATE TABLE IF NOT EXISTS seating_layouts (
        id TEXT PRIMARY KEY,
        course_id TEXT NOT NULL,
        name TEXT NOT NULL,
        rows INTEGER NOT NULL,
        cols INTEGER NOT NULL,
        placements TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    );
";

/// Tracks which records need to be synced to Drive.
const CREATE_SYNC_STATE: &str = "
    CREATE TABLE IF NOT EXISTS sync_state (
        record_id TEXT NOT NULL,
        record_type TEXT NOT NULL,
        dirty INTEGER NOT NULL DEFAULT 1,
        last_synced_at TEXT,
        local_updated_at TEXT NOT NULL,
        PRIMARY KEY (record_id, record_type)
    );
";

/// Stores OAuth 2.0 tokens (key-value pairs).
const CREATE_TOKENS: &str = "
    CREATE TABLE IF NOT EXISTS tokens (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    );
";

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

const CREATE_STUDENTS_COURSE_ID_IDX: &str = "
    CREATE INDEX IF NOT EXISTS idx_students_course_id ON students(course_id);
";

const CREATE_LAYOUTS_COURSE_ID_IDX: &str = "
    CREATE INDEX IF NOT EXISTS idx_seating_layouts_course_id ON seating_layouts(course_id);
";

const CREATE_SYNC_STATE_DIRTY_IDX: &str = "
    CREATE INDEX IF NOT EXISTS idx_sync_state_dirty ON sync_state(dirty);
";

// ---------------------------------------------------------------------------
// Migration runner
// ---------------------------------------------------------------------------

/// Run all pending migrations against the given connection.
///
/// Safe to call multiple times — each migration is applied at most once.
pub fn migrate(conn: &rusqlite::Connection) -> Result<(), rusqlite::Error> {
    // Ensure the version tracking table exists first
    conn.execute_batch(CREATE_SCHEMA_VERSION)?;

    let current_version: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(version), 0) FROM schema_version",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    if current_version < 1 {
        conn.execute_batch(CREATE_COURSES)?;
        conn.execute_batch(CREATE_STUDENTS)?;
        conn.execute_batch(CREATE_SEATING_LAYOUTS)?;
        conn.execute_batch(CREATE_SYNC_STATE)?;
        conn.execute_batch(CREATE_STUDENTS_COURSE_ID_IDX)?;
        conn.execute_batch(CREATE_LAYOUTS_COURSE_ID_IDX)?;
        conn.execute_batch(CREATE_SYNC_STATE_DIRTY_IDX)?;

        conn.execute(
            "INSERT INTO schema_version (version) VALUES (?1)",
            [1],
        )?;
    }

    if current_version < 2 {
        conn.execute_batch(CREATE_TOKENS)?;

        conn.execute(
            "INSERT INTO schema_version (version) VALUES (?1)",
            [2],
        )?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn setup_conn() -> rusqlite::Connection {
        let conn = rusqlite::Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        conn
    }

    #[test]
    fn test_schema_creates_all_tables() {
        let conn = setup_conn();
        migrate(&conn).unwrap();

        // Verify all expected tables exist
        let tables: Vec<String> = conn
            .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
            .unwrap()
            .query_map([], |row| row.get(0))
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();

        assert!(tables.contains(&"schema_version".to_string()));
        assert!(tables.contains(&"courses".to_string()));
        assert!(tables.contains(&"students".to_string()));
        assert!(tables.contains(&"seating_layouts".to_string()));
        assert!(tables.contains(&"sync_state".to_string()));
        assert!(tables.contains(&"tokens".to_string()));
    }

    #[test]
    fn test_schema_is_idempotent() {
        let conn = setup_conn();
        migrate(&conn).unwrap();
        // Running a second time should not error
        migrate(&conn).unwrap();

        let version: i32 = conn
            .query_row("SELECT MAX(version) FROM schema_version", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(version, 2);
    }

    #[test]
    fn test_schema_version_recorded() {
        let conn = setup_conn();
        migrate(&conn).unwrap();

        // Use MAX to get the latest version (there may be multiple rows)
        let version: i32 = conn
            .query_row("SELECT COALESCE(MAX(version), 0) FROM schema_version", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(version, SCHEMA_VERSION);
    }

    #[test]
    fn test_indexes_created() {
        let conn = setup_conn();
        migrate(&conn).unwrap();

        let indexes: Vec<String> = conn
            .prepare("SELECT name FROM sqlite_master WHERE type='index' ORDER BY name")
            .unwrap()
            .query_map([], |row| row.get(0))
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();

        assert!(indexes.contains(&"idx_students_course_id".to_string()));
        assert!(indexes.contains(&"idx_seating_layouts_course_id".to_string()));
        assert!(indexes.contains(&"idx_sync_state_dirty".to_string()));
    }
}
