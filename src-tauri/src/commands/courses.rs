use crate::commands::common;
use crate::models::Course;
use chrono::Utc;
use rusqlite::{params, Connection};
use uuid::Uuid;

// ── Core logic (framework-agnostic) ──────────────────────────────────────

pub fn create_course_impl(
    db: &Connection,
    name: &str,
    description: Option<&str>,
) -> Result<Course, String> {
    let name = name.trim();
    if name.is_empty() {
        return Err("Course name cannot be empty.".to_string());
    }
    if name.len() > 100 {
        return Err("Course name must be 100 characters or fewer.".to_string());
    }

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    db.execute(
        "INSERT INTO courses (id, name, description, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id, name, description, now, now],
    )
    .map_err(|e| e.to_string())?;

    // Mark the new record as dirty for sync
    common::mark_dirty_impl(db, &id, "course")?;

    Ok(Course {
        id,
        name: name.to_string(),
        description: description.map(|s| s.to_string()),
        created_at: now.clone(),
        updated_at: now,
        active_layout_id: None,
    })
}

pub fn get_course_impl(db: &Connection, id: &str) -> Result<Course, String> {
    db.query_row(
        "SELECT id, name, description, created_at, updated_at, active_layout_id
         FROM courses WHERE id = ?1",
        params![id],
        |row| {
            Ok(Course {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
                active_layout_id: row.get(5)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

pub fn list_courses_impl(db: &Connection) -> Result<Vec<Course>, String> {
    let mut stmt = db
        .prepare(
            "SELECT id, name, description, created_at, updated_at, active_layout_id
             FROM courses
             ORDER BY created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let courses = stmt
        .query_map([], |row| {
            Ok(Course {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
                active_layout_id: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(courses)
}

pub fn update_course_impl(
    db: &Connection,
    id: &str,
    name: &str,
    description: Option<&str>,
) -> Result<Course, String> {
    let name = name.trim();
    if name.is_empty() {
        return Err("Course name cannot be empty.".to_string());
    }
    if name.len() > 100 {
        return Err("Course name must be 100 characters or fewer.".to_string());
    }

    let now = Utc::now().to_rfc3339();

    let rows = db
        .execute(
            "UPDATE courses SET name = ?1, description = ?2, updated_at = ?3 WHERE id = ?4",
            params![name, description, now, id],
        )
        .map_err(|e| e.to_string())?;

    if rows == 0 {
        return Err("Course not found.".to_string());
    }

    // Mark as dirty for sync
    common::mark_dirty_impl(db, id, "course")?;

    let course = db
        .query_row(
            "SELECT id, name, description, created_at, updated_at, active_layout_id
             FROM courses WHERE id = ?1",
            params![id],
            |row| {
                Ok(Course {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    description: row.get(2)?,
                    created_at: row.get(3)?,
                    updated_at: row.get(4)?,
                    active_layout_id: row.get(5)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    Ok(course)
}

pub fn delete_course_impl(db: &Connection, id: &str) -> Result<(), String> {
    let rows = db
        .execute("DELETE FROM courses WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    if rows == 0 {
        return Err("Course not found.".to_string());
    }

    // Remove sync state (cascade delete removes students + layouts + their sync states)
    common::remove_sync_state_impl(db, id, "course")?;

    Ok(())
}

// ── Tauri command wrappers ───────────────────────────────────────────────

#[tauri::command]
pub fn create_course(
    state: tauri::State<'_, crate::db::DbState>,
    name: String,
    description: Option<String>,
) -> Result<Course, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    create_course_impl(&db, &name, description.as_deref())
}

#[tauri::command]
pub fn list_courses(
    state: tauri::State<'_, crate::db::DbState>,
) -> Result<Vec<Course>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    list_courses_impl(&db)
}

#[tauri::command]
pub fn update_course(
    state: tauri::State<'_, crate::db::DbState>,
    id: String,
    name: String,
    description: Option<String>,
) -> Result<Course, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    update_course_impl(&db, &id, &name, description.as_deref())
}

#[tauri::command]
pub fn delete_course(
    state: tauri::State<'_, crate::db::DbState>,
    id: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    delete_course_impl(&db, &id)
}

// ── Tests ────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::commands::students;
    use crate::db::open_in_memory_database;

    fn setup_db() -> Connection {
        let conn = open_in_memory_database().unwrap();
        crate::db::run_migrations(&conn).unwrap();
        conn
    }

    #[test]
    fn test_create_and_list_course() {
        let db = setup_db();
        let course = create_course_impl(&db, "Physics 101", None).unwrap();

        assert!(!course.id.is_empty());
        assert_eq!(course.name, "Physics 101");
        assert_eq!(course.description, None);

        let courses = list_courses_impl(&db).unwrap();
        assert_eq!(courses.len(), 1);
        assert_eq!(courses[0].name, "Physics 101");
    }

    #[test]
    fn test_create_course_validates_empty_name() {
        let db = setup_db();
        let result = create_course_impl(&db, "  ", None);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("cannot be empty"));
    }

    #[test]
    fn test_create_course_validates_long_name() {
        let db = setup_db();
        let long_name = "a".repeat(101);
        let result = create_course_impl(&db, &long_name, None);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("100 characters"));
    }

    #[test]
    fn test_update_course() {
        let db = setup_db();
        let course = create_course_impl(&db, "Physics 101", None).unwrap();

        let updated = update_course_impl(
            &db,
            &course.id,
            "Physics I",
            Some("Introductory physics"),
        )
        .unwrap();

        assert_eq!(updated.name, "Physics I");
        assert_eq!(updated.description, Some("Introductory physics".to_string()));
        assert!(updated.updated_at > course.updated_at);
    }

    #[test]
    fn test_update_nonexistent_course_returns_error() {
        let db = setup_db();
        let result = update_course_impl(&db, "nonexistent-id", "Name", None);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("not found"));
    }

    #[test]
    fn test_delete_course() {
        let db = setup_db();
        let course = create_course_impl(&db, "Physics 101", None).unwrap();

        delete_course_impl(&db, &course.id).unwrap();

        let courses = list_courses_impl(&db).unwrap();
        assert!(courses.is_empty());
    }

    #[test]
    fn test_delete_nonexistent_course_returns_error() {
        let db = setup_db();
        let result = delete_course_impl(&db, "nonexistent-id");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("not found"));
    }

    #[test]
    fn test_cascade_delete_removes_students() {
        let db = setup_db();
        let course = create_course_impl(&db, "Physics 101", None).unwrap();

        let student = students::create_student_impl(
            &db,
            &course.id,
            "Alice",
            None,
        )
        .unwrap();

        // Verify student exists
        let students_list = students::list_students_impl(&db, &course.id).unwrap();
        assert_eq!(students_list.len(), 1);
        assert_eq!(students_list[0].id, student.id);

        // Delete course
        delete_course_impl(&db, &course.id).unwrap();

        // Verify student is gone
        let students_list = students::list_students_impl(&db, &course.id).unwrap();
        assert!(students_list.is_empty());
    }
}
