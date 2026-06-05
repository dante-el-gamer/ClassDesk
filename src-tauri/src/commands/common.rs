//! Shared helpers used across command modules.
//!
//! # Sync state tracking
//!
//! Every mutation command (create / update / delete) calls `mark_dirty_impl`
//! to record the change in `sync_state`.  The sync engine then reads dirty
//! records to know what needs to be pushed to Drive.

use crate::models::SyncState;
use chrono::Utc;
use rusqlite::{params, Connection};

// ---------------------------------------------------------------------------
// Sync state helpers
// ---------------------------------------------------------------------------

/// Mark a record as dirty (new or updated locally).
///
/// Uses `INSERT OR REPLACE` so it works whether the row already exists or not.
pub fn mark_dirty_impl(
    db: &Connection,
    record_id: &str,
    record_type: &str,
) -> Result<(), String> {
    let now = Utc::now().to_rfc3339();
    db.execute(
        "INSERT INTO sync_state (record_id, record_type, dirty, local_updated_at)
         VALUES (?1, ?2, 1, ?3)
         ON CONFLICT(record_id, record_type)
         DO UPDATE SET dirty = 1, local_updated_at = ?3",
        params![record_id, record_type, now],
    )
    .map_err(|e| format!("Failed to mark dirty: {e}"))?;
    Ok(())
}

/// Mark a record as clean after a successful push.
pub fn mark_clean_impl(
    db: &Connection,
    record_id: &str,
    record_type: &str,
    synced_at: &str,
) -> Result<(), String> {
    db.execute(
        "UPDATE sync_state
         SET dirty = 0, last_synced_at = ?1
         WHERE record_id = ?2 AND record_type = ?3",
        params![synced_at, record_id, record_type],
    )
    .map_err(|e| format!("Failed to mark clean: {e}"))?;
    Ok(())
}

/// Return all records currently marked as dirty.
pub fn get_dirty_records_impl(db: &Connection) -> Result<Vec<SyncState>, String> {
    let mut stmt = db
        .prepare(
            "SELECT record_id, record_type, dirty, last_synced_at, local_updated_at
             FROM sync_state
             WHERE dirty = 1
             ORDER BY local_updated_at ASC",
        )
        .map_err(|e| e.to_string())?;

    let records = stmt
        .query_map([], |row| {
            Ok(SyncState {
                record_id: row.get(0)?,
                record_type: row.get(1)?,
                dirty: row.get::<_, i32>(2)? != 0,
                last_synced_at: row.get(3)?,
                local_updated_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(records)
}

/// Remove the sync_state entry for a record (used when the record is deleted).
pub fn remove_sync_state_impl(
    db: &Connection,
    record_id: &str,
    record_type: &str,
) -> Result<(), String> {
    db.execute(
        "DELETE FROM sync_state WHERE record_id = ?1 AND record_type = ?2",
        params![record_id, record_type],
    )
    .map_err(|e| format!("Failed to remove sync state: {e}"))?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::open_in_memory_database;

    fn setup_db() -> Connection {
        let conn = open_in_memory_database().unwrap();
        crate::db::run_migrations(&conn).unwrap();
        conn
    }

    #[test]
    fn test_mark_dirty_creates_row() {
        let db = setup_db();
        mark_dirty_impl(&db, "c-001", "course").unwrap();

        let dirty = get_dirty_records_impl(&db).unwrap();
        assert_eq!(dirty.len(), 1);
        assert_eq!(dirty[0].record_id, "c-001");
        assert_eq!(dirty[0].record_type, "course");
        assert!(dirty[0].dirty);
    }

    #[test]
    fn test_mark_dirty_updates_existing() {
        let db = setup_db();
        mark_dirty_impl(&db, "c-001", "course").unwrap();

        // Mark again — should not duplicate
        mark_dirty_impl(&db, "c-001", "course").unwrap();

        let dirty = get_dirty_records_impl(&db).unwrap();
        assert_eq!(dirty.len(), 1);
    }

    #[test]
    fn test_mark_clean_clears_dirty_flag() {
        let db = setup_db();
        mark_dirty_impl(&db, "c-001", "course").unwrap();

        let now = Utc::now().to_rfc3339();
        mark_clean_impl(&db, "c-001", "course", &now).unwrap();

        let dirty = get_dirty_records_impl(&db).unwrap();
        assert!(dirty.is_empty());
    }

    #[test]
    fn test_mark_dirty_works_for_multiple_records() {
        let db = setup_db();
        mark_dirty_impl(&db, "c-001", "course").unwrap();
        mark_dirty_impl(&db, "s-001", "student").unwrap();
        mark_dirty_impl(&db, "l-001", "layout").unwrap();

        let dirty = get_dirty_records_impl(&db).unwrap();
        assert_eq!(dirty.len(), 3);
    }

    #[test]
    fn test_remove_sync_state() {
        let db = setup_db();
        mark_dirty_impl(&db, "c-001", "course").unwrap();
        remove_sync_state_impl(&db, "c-001", "course").unwrap();

        let dirty = get_dirty_records_impl(&db).unwrap();
        assert!(dirty.is_empty());
    }

    #[test]
    fn test_clean_records_not_in_dirty_set() {
        let db = setup_db();
        mark_dirty_impl(&db, "c-001", "course").unwrap();

        let now = Utc::now().to_rfc3339();
        mark_clean_impl(&db, "c-001", "course", &now).unwrap();

        // Also mark a different record as dirty
        mark_dirty_impl(&db, "c-002", "course").unwrap();

        let dirty = get_dirty_records_impl(&db).unwrap();
        assert_eq!(dirty.len(), 1);
        assert_eq!(dirty[0].record_id, "c-002");
    }
}
