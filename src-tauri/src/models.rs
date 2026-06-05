use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// A course that groups students and seating layouts.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Course {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub active_layout_id: Option<String>,
}

/// A student enrolled in a course.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Student {
    pub id: String,
    pub course_id: String,
    pub name: String,
    pub student_id: Option<String>,
    pub created_at: String,
}

/// A single seat position within a grid (1-indexed row and column).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SeatPosition {
    pub row: i32,
    pub col: i32,
}

/// A seating layout with configurable grid dimensions and student placements.
///
/// `placements` maps a student ID to their position on the grid.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SeatingLayout {
    pub id: String,
    pub course_id: String,
    pub name: String,
    pub rows: i32,
    pub cols: i32,
    pub placements: HashMap<String, SeatPosition>,
    pub created_at: String,
    pub updated_at: String,
}

/// Tracks the sync state of a record for Drive integration.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncState {
    pub record_id: String,
    pub record_type: String,
    pub dirty: bool,
    pub last_synced_at: Option<String>,
    pub local_updated_at: String,
}
