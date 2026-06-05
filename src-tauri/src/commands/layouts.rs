use crate::commands::common;
use crate::models::{SeatPosition, SeatingLayout};
use chrono::Utc;
use rusqlite::{params, Connection};
use std::collections::HashMap;
use uuid::Uuid;

// ── Core logic (framework-agnostic) ──────────────────────────────────────

pub fn save_layout_impl(
    db: &Connection,
    id: Option<&str>,
    course_id: &str,
    name: &str,
    rows: i32,
    cols: i32,
    placements: HashMap<String, SeatPosition>,
) -> Result<SeatingLayout, String> {
    let name = name.trim();
    if name.is_empty() {
        return Err("Layout name cannot be empty.".to_string());
    }
    if rows < 1 || rows > 20 {
        return Err("Rows must be between 1 and 20.".to_string());
    }
    if cols < 1 || cols > 20 {
        return Err("Columns must be between 1 and 20.".to_string());
    }

    let course_exists: bool = db
        .query_row(
            "SELECT COUNT(*) FROM courses WHERE id = ?1",
            params![course_id],
            |row| row.get::<_, i32>(0),
        )
        .map_err(|e| e.to_string())?
        > 0;

    if !course_exists {
        return Err("Course not found.".to_string());
    }

    let placements_json =
        serde_json::to_string(&placements).map_err(|e| format!("Failed to serialize placements: {e}"))?;
    let now = Utc::now().to_rfc3339();

    match id {
        Some(layout_id) => {
            let rows = db
                .execute(
                    "UPDATE seating_layouts
                     SET name = ?1, rows = ?2, cols = ?3, placements = ?4, updated_at = ?5
                     WHERE id = ?6 AND course_id = ?7",
                    params![name, rows, cols, placements_json, now, layout_id, course_id],
                )
                .map_err(|e| e.to_string())?;

            if rows == 0 {
                return Err("Layout not found.".to_string());
            }

            // Mark as dirty for sync
            common::mark_dirty_impl(db, layout_id, "layout")?;

            let layout = db
                .query_row(
                    "SELECT id, course_id, name, rows, cols, placements, created_at, updated_at
                     FROM seating_layouts WHERE id = ?1",
                    params![layout_id],
                    |row| {
                        let placements_str: String = row.get(5)?;
                        let p: HashMap<String, SeatPosition> =
                            serde_json::from_str(&placements_str).unwrap_or_default();
                        Ok(SeatingLayout {
                            id: row.get(0)?,
                            course_id: row.get(1)?,
                            name: row.get(2)?,
                            rows: row.get(3)?,
                            cols: row.get(4)?,
                            placements: p,
                            created_at: row.get(6)?,
                            updated_at: row.get(7)?,
                        })
                    },
                )
                .map_err(|e| e.to_string())?;

            Ok(layout)
        }
        None => {
            let layout_id = Uuid::new_v4().to_string();
            db.execute(
                "INSERT INTO seating_layouts (id, course_id, name, rows, cols, placements, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                params![layout_id, course_id, name, rows, cols, placements_json, now, now],
            )
            .map_err(|e| e.to_string())?;

            // Mark as dirty for sync
            common::mark_dirty_impl(db, &layout_id, "layout")?;

            Ok(SeatingLayout {
                id: layout_id,
                course_id: course_id.to_string(),
                name: name.to_string(),
                rows,
                cols,
                placements,
                created_at: now.clone(),
                updated_at: now,
            })
        }
    }
}

pub fn get_layout_impl(
    db: &Connection,
    id: &str,
) -> Result<Option<SeatingLayout>, String> {
    let result = db.query_row(
        "SELECT id, course_id, name, rows, cols, placements, created_at, updated_at
         FROM seating_layouts WHERE id = ?1",
        params![id],
        |row| {
            let placements_str: String = row.get(5)?;
            let placements: HashMap<String, SeatPosition> =
                serde_json::from_str(&placements_str).unwrap_or_default();
            Ok(SeatingLayout {
                id: row.get(0)?,
                course_id: row.get(1)?,
                name: row.get(2)?,
                rows: row.get(3)?,
                cols: row.get(4)?,
                placements,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        },
    );

    match result {
        Ok(layout) => Ok(Some(layout)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

pub fn list_layouts_impl(
    db: &Connection,
    course_id: &str,
) -> Result<Vec<SeatingLayout>, String> {
    let mut stmt = db
        .prepare(
            "SELECT id, course_id, name, rows, cols, placements, created_at, updated_at
             FROM seating_layouts
             WHERE course_id = ?1
             ORDER BY created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let layouts = stmt
        .query_map(params![course_id], |row| {
            let placements_str: String = row.get(5)?;
            let placements: HashMap<String, SeatPosition> =
                serde_json::from_str(&placements_str).unwrap_or_default();
            Ok(SeatingLayout {
                id: row.get(0)?,
                course_id: row.get(1)?,
                name: row.get(2)?,
                rows: row.get(3)?,
                cols: row.get(4)?,
                placements,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(layouts)
}

pub fn delete_layout_impl(db: &Connection, id: &str) -> Result<(), String> {
    let rows = db
        .execute("DELETE FROM seating_layouts WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    if rows == 0 {
        return Err("Layout not found.".to_string());
    }

    // Remove sync state
    common::remove_sync_state_impl(db, id, "layout")?;

    Ok(())
}

// ── Tauri command wrappers ───────────────────────────────────────────────

#[tauri::command]
pub fn save_layout(
    state: tauri::State<'_, crate::db::DbState>,
    id: Option<String>,
    course_id: String,
    name: String,
    rows: i32,
    cols: i32,
    placements: HashMap<String, SeatPosition>,
) -> Result<SeatingLayout, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    save_layout_impl(&db, id.as_deref(), &course_id, &name, rows, cols, placements)
}

#[tauri::command]
pub fn get_layout(
    state: tauri::State<'_, crate::db::DbState>,
    id: String,
) -> Result<Option<SeatingLayout>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    get_layout_impl(&db, &id)
}

#[tauri::command]
pub fn list_layouts(
    state: tauri::State<'_, crate::db::DbState>,
    course_id: String,
) -> Result<Vec<SeatingLayout>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    list_layouts_impl(&db, &course_id)
}

#[tauri::command]
pub fn delete_layout(
    state: tauri::State<'_, crate::db::DbState>,
    id: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    delete_layout_impl(&db, &id)
}

// ── Tests ────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::commands::courses;
    use crate::db::open_in_memory_database;

    fn setup_db() -> Connection {
        let conn = open_in_memory_database().unwrap();
        crate::db::run_migrations(&conn).unwrap();
        conn
    }

    fn create_test_course(db: &Connection) -> String {
        let course = courses::create_course_impl(db, "Biology 101", None).unwrap();
        course.id
    }

    fn sample_placements() -> HashMap<String, SeatPosition> {
        let mut placements = HashMap::new();
        placements.insert("student-1".to_string(), SeatPosition { row: 1, col: 1 });
        placements.insert("student-2".to_string(), SeatPosition { row: 1, col: 2 });
        placements
    }

    #[test]
    fn test_save_and_get_layout() {
        let db = setup_db();
        let course_id = create_test_course(&db);
        let placements = sample_placements();

        let saved = save_layout_impl(
            &db,
            None,
            &course_id,
            "Default Layout",
            5,
            6,
            placements.clone(),
        )
        .unwrap();

        assert!(!saved.id.is_empty());
        assert_eq!(saved.name, "Default Layout");
        assert_eq!(saved.rows, 5);
        assert_eq!(saved.cols, 6);
        assert_eq!(saved.placements.len(), 2);

        let loaded = get_layout_impl(&db, &saved.id)
            .unwrap()
            .expect("layout should exist");
        assert_eq!(loaded.name, "Default Layout");
        assert_eq!(loaded.placements.len(), 2);
    }

    #[test]
    fn test_get_nonexistent_layout_returns_none() {
        let db = setup_db();
        let result = get_layout_impl(&db, "nonexistent-layout").unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn test_list_layouts_for_course() {
        let db = setup_db();
        let course_id = create_test_course(&db);

        save_layout_impl(&db, None, &course_id, "Layout A", 4, 4, HashMap::new()).unwrap();
        save_layout_impl(&db, None, &course_id, "Layout B", 6, 8, HashMap::new()).unwrap();

        let layouts = list_layouts_impl(&db, &course_id).unwrap();
        assert_eq!(layouts.len(), 2);
    }

    #[test]
    fn test_update_existing_layout() {
        let db = setup_db();
        let course_id = create_test_course(&db);

        let saved = save_layout_impl(&db, None, &course_id, "Original", 4, 4, HashMap::new()).unwrap();

        let updated = save_layout_impl(
            &db,
            Some(&saved.id),
            &course_id,
            "Updated Layout",
            6,
            6,
            HashMap::new(),
        )
        .unwrap();

        assert_eq!(updated.name, "Updated Layout");
        assert_eq!(updated.rows, 6);
        assert_eq!(updated.cols, 6);
    }

    #[test]
    fn test_delete_layout() {
        let db = setup_db();
        let course_id = create_test_course(&db);

        let saved = save_layout_impl(&db, None, &course_id, "To Delete", 3, 3, HashMap::new()).unwrap();
        delete_layout_impl(&db, &saved.id).unwrap();

        let layouts = list_layouts_impl(&db, &course_id).unwrap();
        assert!(layouts.is_empty());
    }

    #[test]
    fn test_save_layout_validates_dimensions() {
        let db = setup_db();
        let course_id = create_test_course(&db);

        let result = save_layout_impl(&db, None, &course_id, "Bad", 0, 5, HashMap::new());
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Rows must be between"));
    }

    #[test]
    fn test_layout_must_belong_to_existing_course() {
        let db = setup_db();
        let result = save_layout_impl(&db, None, "fake-course", "Test", 4, 4, HashMap::new());
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Course not found"));
    }

    #[test]
    fn test_cascade_delete_removes_layouts() {
        let db = setup_db();
        let course_id = create_test_course(&db);

        save_layout_impl(&db, None, &course_id, "Layout", 4, 4, HashMap::new()).unwrap();

        courses::delete_course_impl(&db, &course_id).unwrap();

        let layouts = list_layouts_impl(&db, &course_id).unwrap();
        assert!(layouts.is_empty());
    }
}
