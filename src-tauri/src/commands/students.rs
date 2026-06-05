use crate::commands::common;
use crate::models::Student;
use chrono::Utc;
use rusqlite::{params, Connection};
use uuid::Uuid;

// ── Core logic (framework-agnostic) ──────────────────────────────────────

pub fn create_student_impl(
    db: &Connection,
    course_id: &str,
    name: &str,
    student_id: Option<&str>,
) -> Result<Student, String> {
    let name = name.trim();
    if name.is_empty() {
        return Err("Student name cannot be empty.".to_string());
    }
    if name.len() > 100 {
        return Err("Student name must be 100 characters or fewer.".to_string());
    }

    // Verify the course exists
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

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    db.execute(
        "INSERT INTO students (id, course_id, name, student_id, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id, course_id, name, student_id, now],
    )
    .map_err(|e| e.to_string())?;

    // Mark the course as dirty (so the whole course's student roster is synced)
    common::mark_dirty_impl(db, &id, "student")?;

    Ok(Student {
        id,
        course_id: course_id.to_string(),
        name: name.to_string(),
        student_id: student_id.map(|s| s.to_string()),
        created_at: now,
    })
}

pub fn get_student_impl(db: &Connection, id: &str) -> Result<Student, String> {
    db.query_row(
        "SELECT id, course_id, name, student_id, created_at
         FROM students WHERE id = ?1",
        params![id],
        |row| {
            Ok(Student {
                id: row.get(0)?,
                course_id: row.get(1)?,
                name: row.get(2)?,
                student_id: row.get(3)?,
                created_at: row.get(4)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

pub fn list_students_impl(
    db: &Connection,
    course_id: &str,
) -> Result<Vec<Student>, String> {
    let mut stmt = db
        .prepare(
            "SELECT id, course_id, name, student_id, created_at
             FROM students
             WHERE course_id = ?1
             ORDER BY created_at ASC",
        )
        .map_err(|e| e.to_string())?;

    let students = stmt
        .query_map(params![course_id], |row| {
            Ok(Student {
                id: row.get(0)?,
                course_id: row.get(1)?,
                name: row.get(2)?,
                student_id: row.get(3)?,
                created_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(students)
}

pub fn update_student_impl(
    db: &Connection,
    id: &str,
    name: &str,
    student_id: Option<&str>,
) -> Result<Student, String> {
    let name = name.trim();
    if name.is_empty() {
        return Err("Student name cannot be empty.".to_string());
    }
    if name.len() > 100 {
        return Err("Student name must be 100 characters or fewer.".to_string());
    }

    let rows = db
        .execute(
            "UPDATE students SET name = ?1, student_id = ?2 WHERE id = ?3",
            params![name, student_id, id],
        )
        .map_err(|e| e.to_string())?;

    if rows == 0 {
        return Err("Student not found.".to_string());
    }

    // Mark as dirty for sync
    common::mark_dirty_impl(db, id, "student")?;

    let student = db
        .query_row(
            "SELECT id, course_id, name, student_id, created_at
             FROM students WHERE id = ?1",
            params![id],
            |row| {
                Ok(Student {
                    id: row.get(0)?,
                    course_id: row.get(1)?,
                    name: row.get(2)?,
                    student_id: row.get(3)?,
                    created_at: row.get(4)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    Ok(student)
}

pub fn delete_student_impl(db: &Connection, id: &str) -> Result<(), String> {
    let rows = db
        .execute("DELETE FROM students WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    if rows == 0 {
        return Err("Student not found.".to_string());
    }

    // Remove sync state
    common::remove_sync_state_impl(db, id, "student")?;

    Ok(())
}

// ── Tauri command wrappers ───────────────────────────────────────────────

#[tauri::command]
pub fn create_student(
    state: tauri::State<'_, crate::db::DbState>,
    course_id: String,
    name: String,
    student_id: Option<String>,
) -> Result<Student, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    create_student_impl(&db, &course_id, &name, student_id.as_deref())
}

#[tauri::command]
pub fn list_students(
    state: tauri::State<'_, crate::db::DbState>,
    course_id: String,
) -> Result<Vec<Student>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    list_students_impl(&db, &course_id)
}

#[tauri::command]
pub fn update_student(
    state: tauri::State<'_, crate::db::DbState>,
    id: String,
    name: String,
    student_id: Option<String>,
) -> Result<Student, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    update_student_impl(&db, &id, &name, student_id.as_deref())
}

#[tauri::command]
pub fn delete_student(
    state: tauri::State<'_, crate::db::DbState>,
    id: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    delete_student_impl(&db, &id)
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
        let course = courses::create_course_impl(db, "History 202", None).unwrap();
        course.id
    }

    #[test]
    fn test_create_and_list_students() {
        let db = setup_db();
        let course_id = create_test_course(&db);

        let alice = create_student_impl(&db, &course_id, "Alice", None).unwrap();
        let bob = create_student_impl(&db, &course_id, "Bob", Some("S1001")).unwrap();

        let students = list_students_impl(&db, &course_id).unwrap();
        assert_eq!(students.len(), 2);
        assert_eq!(students[0].name, "Alice");
        assert_eq!(students[1].name, "Bob");
        assert_eq!(students[1].student_id, Some("S1001".to_string()));
        assert_ne!(alice.id, bob.id);
    }

    #[test]
    fn test_create_student_validates_empty_name() {
        let db = setup_db();
        let course_id = create_test_course(&db);
        let result = create_student_impl(&db, &course_id, "  ", None);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("cannot be empty"));
    }

    #[test]
    fn test_create_student_requires_existing_course() {
        let db = setup_db();
        let result = create_student_impl(&db, "nonexistent-course", "Alice", None);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Course not found"));
    }

    #[test]
    fn test_update_student() {
        let db = setup_db();
        let course_id = create_test_course(&db);

        let student = create_student_impl(&db, &course_id, "Charlie", None).unwrap();

        let updated = update_student_impl(&db, &student.id, "Charles", student.student_id.as_deref()).unwrap();
        assert_eq!(updated.name, "Charles");
    }

    #[test]
    fn test_delete_student() {
        let db = setup_db();
        let course_id = create_test_course(&db);

        let student = create_student_impl(&db, &course_id, "Alice", None).unwrap();
        delete_student_impl(&db, &student.id).unwrap();

        let students = list_students_impl(&db, &course_id).unwrap();
        assert!(students.is_empty());
    }

    #[test]
    fn test_delete_nonexistent_student_returns_error() {
        let db = setup_db();
        let result = delete_student_impl(&db, "nonexistent-id");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("not found"));
    }
}
