//! Sync commands — push, pull, status, and conflict resolution.
//!
//! These commands coordinate between the local SQLite database and Google
//! Drive via the [`DriveClient`].  They are gated by an `access_token`
//! parameter — an empty token produces an actionable error.
//!
//! # Send safety
//!
//! All `MutexGuard` acquisitions are scoped with explicit blocks so that the
//! guard is dropped before any `.await` point.  This is required because
//! `std::sync::MutexGuard` is not `Send`.

use crate::commands::common;
use crate::drive::client::{
    ConflictInfo, DirtyRecordSummary, DriveClient, SyncOperationResult, SyncStatusInfo,
};
use crate::models::SyncState;
use chrono::Utc;
use rusqlite::Connection;

/// Drive file name prefix used to identify our app's files.
const FILE_PREFIX: &str = "csm_";

// ---------------------------------------------------------------------------
// Push — upload dirty local records to Drive
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn push_sync(
    state: tauri::State<'_, crate::db::DbState>,
    access_token: String,
) -> Result<SyncOperationResult, String> {
    if access_token.is_empty() {
        return Err("Not authenticated. Sign in with Google to enable sync.".to_string());
    }

    // ── scope 1: read dirty records ──────────────────────────────────────
    let dirty = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        common::get_dirty_records_impl(&db)?
    };

    if dirty.is_empty() {
        return Ok(SyncOperationResult {
            count: 0,
            message: "Nothing to sync — all records are clean.".to_string(),
            conflicts: vec![],
        });
    }

    // ── scope 2: fetch JSON content for every dirty record ───────────────
    // We collect `(file_name, content)` pairs so the lock is released before
    // any async Drive call.
    let uploads: Vec<(String, String)> = {
        let db = state.db.lock().map_err(|e| e.to_string())?;

        let mut items = Vec::with_capacity(dirty.len());
        for record in &dirty {
            let content = fetch_record_content_impl(&db, record)?;
            let file_name = file_name_for(record);
            items.push((file_name, content));
        }
        items
    };

    // ── scope 3: upload to Drive (no lock held) ──────────────────────────
    let client = DriveClient::new();
    let mut pushed = 0u32;

    for (file_name, content) in &uploads {
        // List existing files to find a match
        let existing = client.list_files(&access_token, FILE_PREFIX).await?;
        let existing_id = existing.iter().find(|f| f.name == *file_name).map(|f| f.id.clone());

        match existing_id {
            Some(id) => client.update_file(&access_token, &id, content).await?,
            None => {
                client.upload_file(&access_token, file_name, content).await?;
            }
        }
        pushed += 1;
    }

    // ── scope 4: mark records clean ──────────────────────────────────────
    {
        let now = Utc::now().to_rfc3339();
        let db = state.db.lock().map_err(|e| e.to_string())?;
        for record in &dirty {
            common::mark_clean_impl(&db, &record.record_id, &record.record_type, &now)?;
        }
    }

    Ok(SyncOperationResult {
        count: pushed as usize,
        message: format!("Successfully pushed {pushed} record(s) to Drive."),
        conflicts: vec![],
    })
}

// ---------------------------------------------------------------------------
// Pull — download remote changes from Drive
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn pull_sync(
    state: tauri::State<'_, crate::db::DbState>,
    access_token: String,
) -> Result<SyncOperationResult, String> {
    if access_token.is_empty() {
        return Err("Not authenticated. Sign in with Google to enable sync.".to_string());
    }

    let client = DriveClient::new();
    let files = client.list_files(&access_token, FILE_PREFIX).await?;

    if files.is_empty() {
        return Ok(SyncOperationResult {
            count: 0,
            message: "No remote data found — nothing to pull.".to_string(),
            conflicts: vec![],
        });
    }

    let mut pulled = 0u32;
    let mut conflicts: Vec<ConflictInfo> = vec![];

    for file in &files {
        let Some((record_type, record_id)) = parse_file_name(&file.name) else {
            continue;
        };

        let remote_updated_at = file
            .modified_time
            .clone()
            .unwrap_or_else(|| Utc::now().to_rfc3339());

        // ── scope: check local state ────────────────────────────────────
        let should_overwrite = {
            let db = state.db.lock().map_err(|e| e.to_string())?;
            let local_sync = get_local_sync_state(&db, &record_id, &record_type);
            match local_sync {
                Some(local) if local.local_updated_at >= remote_updated_at => {
                    // Local is newer or equal — record tie if equal.
                    if local.local_updated_at == remote_updated_at {
                        conflicts.push(ConflictInfo {
                            record_id: record_id.clone(),
                            record_type: record_type.clone(),
                            local_updated_at: local.local_updated_at.clone(),
                            remote_updated_at: remote_updated_at.clone(),
                            resolution: "local_won".to_string(),
                        });
                    }
                    false // skip
                }
                _ => true, // remote is newer or record doesn't exist locally
            }
        };

        if !should_overwrite {
            continue;
        }

        // Download content (no lock held).
        let content = client.download_file(&access_token, &file.id).await?;

        // ── scope: overwrite local record ───────────────────────────────
        {
            let db = state.db.lock().map_err(|e| e.to_string())?;
            overwrite_local_record_impl(&db, &record_type, &record_id, &content)?;
        }

        // ── scope: mark clean ───────────────────────────────────────────
        {
            let now = Utc::now().to_rfc3339();
            let db = state.db.lock().map_err(|e| e.to_string())?;
            common::mark_clean_impl(&db, &record_id, &record_type, &now)?;
        }

        pulled += 1;
    }

    Ok(SyncOperationResult {
        count: pulled as usize,
        message: format!("Pulled {pulled} record(s) from Drive."),
        conflicts,
    })
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn get_sync_status(
    state: tauri::State<'_, crate::db::DbState>,
) -> Result<SyncStatusInfo, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let dirty_records = common::get_dirty_records_impl(&db)?;
    let last_synced_at = get_last_synced_at(&db)?;

    let summaries: Vec<DirtyRecordSummary> = dirty_records
        .iter()
        .map(|r| DirtyRecordSummary {
            record_id: r.record_id.clone(),
            record_type: r.record_type.clone(),
            local_updated_at: r.local_updated_at.clone(),
        })
        .collect();

    Ok(SyncStatusInfo {
        dirty_count: summaries.len() as u32,
        last_synced_at,
        dirty_records: summaries,
    })
}

// ---------------------------------------------------------------------------
// Resolve conflict
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn resolve_conflict(
    state: tauri::State<'_, crate::db::DbState>,
    access_token: String,
    record_id: String,
    record_type: String,
    keep: String,
) -> Result<String, String> {
    match keep.as_str() {
        "local" => {
            let now = Utc::now().to_rfc3339();
            let db = state.db.lock().map_err(|e| e.to_string())?;
            common::mark_clean_impl(&db, &record_id, &record_type, &now)?;
            Ok(format!("Kept local version of {record_type}/{record_id}."))
        }
        "remote" => {
            if access_token.is_empty() {
                return Err("Not authenticated. Sign in with Google to enable sync.".to_string());
            }
            let client = DriveClient::new();
            let file_name = format!("{FILE_PREFIX}{record_type}_{record_id}.json");
            let files = client.list_files(&access_token, FILE_PREFIX).await?;

            let file_id = files
                .iter()
                .find(|f| f.name == file_name)
                .map(|f| f.id.clone())
                .ok_or_else(|| {
                    format!("Remote file for {record_type}/{record_id} not found.")
                })?;

            let content = client.download_file(&access_token, &file_id).await?;

            // Overwrite local (scope the lock).
            {
                let db = state.db.lock().map_err(|e| e.to_string())?;
                overwrite_local_record_impl(&db, &record_type, &record_id, &content)?;
            }

            // Mark clean (scope the lock).
            {
                let now = Utc::now().to_rfc3339();
                let db = state.db.lock().map_err(|e| e.to_string())?;
                common::mark_clean_impl(&db, &record_id, &record_type, &now)?;
            }

            Ok(format!(
                "Replaced local {record_type}/{record_id} with remote version."
            ))
        }
        _ => Err("keep must be 'local' or 'remote'.".to_string()),
    }
}

// ---------------------------------------------------------------------------
// Internal helpers (sync, not async — hold DB lock)
// ---------------------------------------------------------------------------

/// Build the deterministic Drive file name for a record.
fn file_name_for(record: &SyncState) -> String {
    format!(
        "{}{}_{}.json",
        FILE_PREFIX, record.record_type, record.record_id
    )
}

/// Parse a file name back into `(record_type, record_id)`.
fn parse_file_name(name: &str) -> Option<(String, String)> {
    let stripped = name.strip_prefix(FILE_PREFIX)?;
    let without_ext = stripped.strip_suffix(".json")?;
    let parts: Vec<&str> = without_ext.splitn(2, '_').collect();
    if parts.len() != 2 {
        return None;
    }
    Some((parts[0].to_string(), parts[1].to_string()))
}

/// Fetch the full JSON content of a record for upload to Drive.
/// Caller must hold the DB lock.
fn fetch_record_content_impl(
    db: &Connection,
    record: &SyncState,
) -> Result<String, String> {
    match record.record_type.as_str() {
        "course" => {
            let course = crate::commands::courses::get_course_impl(db, &record.record_id)?;
            serde_json::to_string(&course).map_err(|e| format!("Serialization error: {e}"))
        }
        "student" => {
            let student = crate::commands::students::get_student_impl(db, &record.record_id)?;
            serde_json::to_string(&student).map_err(|e| format!("Serialization error: {e}"))
        }
        "layout" => {
            let layout = crate::commands::layouts::get_layout_impl(db, &record.record_id)?
                .ok_or_else(|| format!("Layout {} not found", record.record_id))?;
            serde_json::to_string(&layout).map_err(|e| format!("Serialization error: {e}"))
        }
        other => Err(format!("Unknown record type: {other}")),
    }
}

/// Overwrite a local record with remote JSON content.
/// Caller must hold the DB lock.
fn overwrite_local_record_impl(
    db: &Connection,
    record_type: &str,
    record_id: &str,
    content: &str,
) -> Result<(), String> {
    match record_type {
        "course" => {
            let remote: crate::models::Course = serde_json::from_str(content)
                .map_err(|e| format!("Deserialization error: {e}"))?;
            db.execute(
                "UPDATE courses SET name = ?1, description = ?2, updated_at = ?3 WHERE id = ?4",
                rusqlite::params![remote.name, remote.description, remote.updated_at, record_id],
            )
            .map_err(|e| e.to_string())?;
        }
        "student" => {
            let remote: crate::models::Student = serde_json::from_str(content)
                .map_err(|e| format!("Deserialization error: {e}"))?;
            db.execute(
                "UPDATE students SET name = ?1, student_id = ?2 WHERE id = ?3",
                rusqlite::params![remote.name, remote.student_id, record_id],
            )
            .map_err(|e| e.to_string())?;
        }
        "layout" => {
            let remote: crate::models::SeatingLayout = serde_json::from_str(content)
                .map_err(|e| format!("Deserialization error: {e}"))?;
            let placements_json = serde_json::to_string(&remote.placements)
                .map_err(|e| format!("Serialization error: {e}"))?;
            db.execute(
                "UPDATE seating_layouts SET name = ?1, rows = ?2, cols = ?3, placements = ?4, updated_at = ?5 WHERE id = ?6",
                rusqlite::params![remote.name, remote.rows, remote.cols, placements_json, remote.updated_at, record_id],
            )
            .map_err(|e| e.to_string())?;
        }
        _ => return Err(format!("Unknown record type: {record_type}")),
    }
    Ok(())
}

/// Get the local sync state for a specific record (if it exists).
fn get_local_sync_state(db: &Connection, record_id: &str, record_type: &str) -> Option<SyncState> {
    db.query_row(
        "SELECT record_id, record_type, dirty, last_synced_at, local_updated_at
         FROM sync_state WHERE record_id = ?1 AND record_type = ?2",
        rusqlite::params![record_id, record_type],
        |row| {
            Ok(SyncState {
                record_id: row.get(0)?,
                record_type: row.get(1)?,
                dirty: row.get::<_, i32>(2)? != 0,
                last_synced_at: row.get(3)?,
                local_updated_at: row.get(4)?,
            })
        },
    )
    .ok()
}

/// Return the most recent `last_synced_at` across all records.
fn get_last_synced_at(db: &Connection) -> Result<Option<String>, String> {
    match db.query_row(
        "SELECT MAX(last_synced_at) FROM sync_state WHERE last_synced_at IS NOT NULL",
        [],
        |row| row.get(0),
    ) {
        Ok(val) => Ok(Some(val)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(_) => Ok(None),
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::commands::common;
    use crate::db::open_in_memory_database;

    fn setup_db() -> Connection {
        let conn = open_in_memory_database().unwrap();
        crate::db::run_migrations(&conn).unwrap();
        conn
    }

    // ── file_name_for / parse_file_name ──────────────────────────────────

    #[test]
    fn test_file_name_roundtrip() {
        let state = SyncState {
            record_id: "c-001".into(),
            record_type: "course".into(),
            dirty: true,
            last_synced_at: None,
            local_updated_at: "2026-01-01T00:00:00Z".into(),
        };

        let name = file_name_for(&state);
        assert_eq!(name, "csm_course_c-001.json");

        let parsed = parse_file_name(&name);
        assert!(parsed.is_some());
        let (rtype, rid) = parsed.unwrap();
        assert_eq!(rtype, "course");
        assert_eq!(rid, "c-001");
    }

    #[test]
    fn test_parse_file_name_invalid() {
        assert!(parse_file_name("random.txt").is_none());
        assert!(parse_file_name("csm_.json").is_none());
        assert!(parse_file_name("").is_none());
    }

    // ── get_sync_status logic ────────────────────────────────────────────

    #[test]
    fn test_sync_status_empty_db() {
        let db = setup_db();

        let dirty = common::get_dirty_records_impl(&db).unwrap();
        assert!(dirty.is_empty());

        let last = get_last_synced_at(&db).unwrap();
        assert!(last.is_none());
    }

    #[test]
    fn test_sync_status_with_dirty_records() {
        let db = setup_db();
        common::mark_dirty_impl(&db, "c-001", "course").unwrap();
        common::mark_dirty_impl(&db, "s-001", "student").unwrap();

        let dirty = common::get_dirty_records_impl(&db).unwrap();
        assert_eq!(dirty.len(), 2);
    }

    #[test]
    fn test_sync_status_last_synced_at() {
        let db = setup_db();
        common::mark_dirty_impl(&db, "c-001", "course").unwrap();
        common::mark_clean_impl(&db, "c-001", "course", "2026-06-01T12:00:00Z").unwrap();

        let last = get_last_synced_at(&db).unwrap();
        assert_eq!(last.as_deref(), Some("2026-06-01T12:00:00Z"));
    }

    // ── Resolve local ────────────────────────────────────────────────────

    #[test]
    fn test_resolve_local_marks_clean() {
        let db = setup_db();
        common::mark_dirty_impl(&db, "c-001", "course").unwrap();

        let now = Utc::now().to_rfc3339();
        common::mark_clean_impl(&db, "c-001", "course", &now).unwrap();

        let dirty = common::get_dirty_records_impl(&db).unwrap();
        assert!(dirty.is_empty());
    }

    #[test]
    fn test_dirty_records_sorted_by_timestamp() {
        let db = setup_db();

        db.execute(
            "INSERT INTO sync_state (record_id, record_type, dirty, local_updated_at)
             VALUES ('a', 'course', 1, '2026-01-01T00:00:00Z')",
            [],
        )
        .unwrap();
        db.execute(
            "INSERT INTO sync_state (record_id, record_type, dirty, local_updated_at)
             VALUES ('b', 'course', 1, '2026-06-01T00:00:00Z')",
            [],
        )
        .unwrap();

        let dirty = common::get_dirty_records_impl(&db).unwrap();
        assert_eq!(dirty.len(), 2);
        assert_eq!(dirty[0].record_id, "a");
        assert_eq!(dirty[1].record_id, "b");
    }

    #[test]
    fn test_file_name_convention() {
        let name = format!("{}course_c-001.json", FILE_PREFIX);
        assert_eq!(
            parse_file_name(&name),
            Some(("course".into(), "c-001".into()))
        );
    }

    // ── fetch_record_content_impl (needs actual course data) ─────────────

    #[test]
    fn test_fetch_course_content() {
        let db = setup_db();
        let course =
            crate::commands::courses::create_course_impl(&db, "Physics 101", None).unwrap();

        let state = SyncState {
            record_id: course.id.clone(),
            record_type: "course".into(),
            dirty: true,
            last_synced_at: None,
            local_updated_at: "2026-01-01T00:00:00Z".into(),
        };

        let json = fetch_record_content_impl(&db, &state).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed["name"], "Physics 101");
    }

    #[test]
    fn test_fetch_student_content() {
        let db = setup_db();
        let course =
            crate::commands::courses::create_course_impl(&db, "History", None).unwrap();
        let student = crate::commands::students::create_student_impl(
            &db,
            &course.id,
            "Alice",
            None,
        )
        .unwrap();

        let state = SyncState {
            record_id: student.id.clone(),
            record_type: "student".into(),
            dirty: true,
            last_synced_at: None,
            local_updated_at: "2026-01-01T00:00:00Z".into(),
        };

        let json = fetch_record_content_impl(&db, &state).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed["name"], "Alice");
    }

    #[test]
    fn test_fetch_layout_content() {
        let db = setup_db();
        let course =
            crate::commands::courses::create_course_impl(&db, "Biology", None).unwrap();
        let layout = crate::commands::layouts::save_layout_impl(
            &db,
            None,
            &course.id,
            "Default",
            5,
            6,
            std::collections::HashMap::new(),
        )
        .unwrap();

        let state = SyncState {
            record_id: layout.id.clone(),
            record_type: "layout".into(),
            dirty: true,
            last_synced_at: None,
            local_updated_at: "2026-01-01T00:00:00Z".into(),
        };

        let json = fetch_record_content_impl(&db, &state).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed["name"], "Default");
        assert_eq!(parsed["rows"], 5);
    }
}
