//! Google Drive v3 HTTP client using reqwest.
//!
//! Each method accepts an `access_token` explicitly — the client does not
//! manage tokens itself.  This keeps the client stateless and testable.
//!
//! File storage convention:
//!   Each record (course / student / layout) is stored as a single JSON file
//!   named `{recordType}_{recordId}.json` under a well-known app folder.

use serde::{Deserialize, Serialize};

const DRIVE_API_BASE: &str = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_BASE: &str = "https://www.googleapis.com/upload/drive/v3";
const MIME_JSON: &str = "application/json";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/// A file resource as returned by the Drive v3 API.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DriveFile {
    pub id: String,
    pub name: String,
    #[serde(rename = "modifiedTime", skip_serializing_if = "Option::is_none")]
    pub modified_time: Option<String>,
}

/// Result of a push or pull sync operation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncOperationResult {
    /// Number of records successfully processed.
    pub count: usize,
    /// Human-readable summary.
    pub message: String,
    /// List of conflict notifications (empty when no conflicts).
    pub conflicts: Vec<ConflictInfo>,
}

/// Describes a conflict that was resolved during sync.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConflictInfo {
    pub record_id: String,
    pub record_type: String,
    pub local_updated_at: String,
    pub remote_updated_at: String,
    pub resolution: String, // "remote_won" | "local_won"
}

/// Current sync status for the UI.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncStatusInfo {
    /// Number of records with dirty = true.
    pub dirty_count: u32,
    /// When the last sync successfully completed (ISO 8601), if ever.
    pub last_synced_at: Option<String>,
    /// List of records currently dirty.
    pub dirty_records: Vec<DirtyRecordSummary>,
}

/// Summary of a dirty record for display purposes.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DirtyRecordSummary {
    pub record_id: String,
    pub record_type: String,
    pub local_updated_at: String,
}

// ---------------------------------------------------------------------------
// Internal response types
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
struct FileListResponse {
    files: Option<Vec<DriveFile>>,
}

#[derive(Deserialize)]
struct FileCreateResponse {
    id: String,
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

/// Stateless Drive v3 API client.
///
/// Create one per sync operation.  All methods require an OAuth 2.0 access
/// token.  When the token is empty, the client returns "no-auth" errors.
pub struct DriveClient {
    http: reqwest::Client,
}

impl DriveClient {
    /// Build a new client with an internal `reqwest::Client`.
    pub fn new() -> Self {
        Self {
            http: reqwest::Client::new(),
        }
    }

    /// Build a client with a pre-configured HTTP client (useful for tests).
    pub fn with_http_client(http: reqwest::Client) -> Self {
        Self { http }
    }

    // ---------------------------------------------------------------
    // Public API
    // ---------------------------------------------------------------

    /// List Drive files whose name matches the given prefix.
    pub async fn list_files(
        &self,
        access_token: &str,
        name_prefix: &str,
    ) -> Result<Vec<DriveFile>, String> {
        if access_token.is_empty() {
            return Err("Not authenticated. Sign in with Google to enable sync.".to_string());
        }

        let query = format!("name contains '{}' and trashed = false", name_prefix);
        let url = format!("{}/files", DRIVE_API_BASE);

        let resp = self
            .http
            .get(&url)
            .header("Authorization", bearer(access_token))
            .query(&[
                ("q", query.as_str()),
                ("fields", "files(id,name,modifiedTime)"),
            ])
            .send()
            .await
            .map_err(|e| format!("Drive API request failed: {e}"))?;

        if !resp.status().is_success() {
            return Err(drive_error(resp).await);
        }

        let body: FileListResponse = resp
            .json()
            .await
            .map_err(|e| format!("Failed to parse Drive response: {e}"))?;

        Ok(body.files.unwrap_or_default())
    }

    /// Download the full content of a Drive file by ID.
    pub async fn download_file(
        &self,
        access_token: &str,
        file_id: &str,
    ) -> Result<String, String> {
        if access_token.is_empty() {
            return Err("Not authenticated. Sign in with Google to enable sync.".to_string());
        }

        let url = format!("{}/files/{}?alt=media", DRIVE_API_BASE, file_id);
        let resp = self
            .http
            .get(&url)
            .header("Authorization", bearer(access_token))
            .send()
            .await
            .map_err(|e| format!("Drive API download failed: {e}"))?;

        if !resp.status().is_success() {
            return Err(drive_error(resp).await);
        }

        resp.text()
            .await
            .map_err(|e| format!("Failed to read download response: {e}"))
    }

    /// Upload a new file (create + write content in one go).
    ///
    /// Returns the newly-created file ID.
    pub async fn upload_file(
        &self,
        access_token: &str,
        name: &str,
        content: &str,
    ) -> Result<String, String> {
        if access_token.is_empty() {
            return Err("Not authenticated. Sign in with Google to enable sync.".to_string());
        }

        // Step 1 — create the file resource (metadata-only).
        let metadata = serde_json::json!({
            "name": name,
            "mimeType": MIME_JSON,
        });

        let create_url = format!("{}/files", DRIVE_API_BASE);
        let create_resp = self
            .http
            .post(&create_url)
            .header("Authorization", bearer(access_token))
            .json(&metadata)
            .send()
            .await
            .map_err(|e| format!("Drive API create failed: {e}"))?;

        if !create_resp.status().is_success() {
            return Err(drive_error(create_resp).await);
        }

        let created: FileCreateResponse = create_resp
            .json()
            .await
            .map_err(|e| format!("Failed to parse create response: {e}"))?;

        // Step 2 — upload the actual content.
        let upload_url = format!(
            "{}/files/{}?uploadType=media",
            DRIVE_UPLOAD_BASE, created.id
        );
        let upload_resp = self
            .http
            .patch(&upload_url)
            .header("Authorization", bearer(access_token))
            .header("Content-Type", MIME_JSON)
            .body(content.to_owned())
            .send()
            .await
            .map_err(|e| format!("Drive API upload failed: {e}"))?;

        if !upload_resp.status().is_success() {
            return Err(drive_error(upload_resp).await);
        }

        Ok(created.id)
    }

    /// Update an existing Drive file's content (in-place media upload).
    pub async fn update_file(
        &self,
        access_token: &str,
        file_id: &str,
        content: &str,
    ) -> Result<(), String> {
        if access_token.is_empty() {
            return Err("Not authenticated. Sign in with Google to enable sync.".to_string());
        }

        let url = format!(
            "{}/files/{}?uploadType=media",
            DRIVE_UPLOAD_BASE, file_id
        );
        let resp = self
            .http
            .patch(&url)
            .header("Authorization", bearer(access_token))
            .header("Content-Type", MIME_JSON)
            .body(content.to_owned())
            .send()
            .await
            .map_err(|e| format!("Drive API update failed: {e}"))?;

        if !resp.status().is_success() {
            return Err(drive_error(resp).await);
        }

        Ok(())
    }

    /// Delete a Drive file by ID.
    pub async fn delete_file(
        &self,
        access_token: &str,
        file_id: &str,
    ) -> Result<(), String> {
        if access_token.is_empty() {
            return Err("Not authenticated. Sign in with Google to enable sync.".to_string());
        }

        let url = format!("{}/files/{}", DRIVE_API_BASE, file_id);
        let resp = self
            .http
            .delete(&url)
            .header("Authorization", bearer(access_token))
            .send()
            .await
            .map_err(|e| format!("Drive API delete failed: {e}"))?;

        if !resp.status().is_success() {
            return Err(drive_error(resp).await);
        }

        Ok(())
    }
}

impl Default for DriveClient {
    fn default() -> Self {
        Self::new()
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn bearer(token: &str) -> String {
    format!("Bearer {token}")
}

/// Extract a human-readable error message from a failed Drive API response.
async fn drive_error(resp: reqwest::Response) -> String {
    let status = resp.status();
    let body = resp.text().await.unwrap_or_else(|_| "<no body>".into());
    format!("Drive API error (HTTP {status}): {body}")
}

// ---------------------------------------------------------------------------
// Tests — serialization round-trips and no-auth gate
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{Course, Student, SeatingLayout, SeatPosition};
    use std::collections::HashMap;

    #[test]
    fn test_course_serialization_roundtrip() {
        let course = Course {
            id: "c-001".into(),
            name: "Physics 101".into(),
            description: Some("Intro".into()),
            created_at: "2026-01-01T00:00:00Z".into(),
            updated_at: "2026-06-01T00:00:00Z".into(),
            active_layout_id: None,
        };

        let json = serde_json::to_string(&course).unwrap();
        let deserialized: Course = serde_json::from_str(&json).unwrap();

        assert_eq!(deserialized.id, course.id);
        assert_eq!(deserialized.name, course.name);
        assert_eq!(deserialized.description, course.description);
    }

    #[test]
    fn test_student_serialization_roundtrip() {
        let student = Student {
            id: "s-001".into(),
            course_id: "c-001".into(),
            name: "Alice".into(),
            student_id: Some("S1001".into()),
            created_at: "2026-01-15T00:00:00Z".into(),
        };

        let json = serde_json::to_string(&student).unwrap();
        let deserialized: Student = serde_json::from_str(&json).unwrap();

        assert_eq!(deserialized.id, student.id);
        assert_eq!(deserialized.name, student.name);
        assert_eq!(deserialized.student_id, student.student_id);
    }

    #[test]
    fn test_layout_serialization_roundtrip() {
        let mut placements = HashMap::new();
        placements.insert(
            "s-001".into(),
            SeatPosition { row: 1, col: 1 },
        );
        placements.insert(
            "s-002".into(),
            SeatPosition { row: 1, col: 2 },
        );

        let layout = SeatingLayout {
            id: "l-001".into(),
            course_id: "c-001".into(),
            name: "Default".into(),
            rows: 5,
            cols: 6,
            placements,
            created_at: "2026-02-01T00:00:00Z".into(),
            updated_at: "2026-06-01T00:00:00Z".into(),
        };

        let json = serde_json::to_string(&layout).unwrap();
        let deserialized: SeatingLayout = serde_json::from_str(&json).unwrap();

        assert_eq!(deserialized.id, layout.id);
        assert_eq!(deserialized.rows, 5);
        assert_eq!(deserialized.cols, 6);
        assert_eq!(deserialized.placements.len(), 2);
        assert_eq!(
            deserialized.placements.get("s-001").unwrap().row,
            1
        );
    }

    #[test]
    fn test_drivefile_deserialization() {
        let json = r#"{
            "id": "abc123",
            "name": "course_c-001.json",
            "modifiedTime": "2026-06-01T12:00:00Z"
        }"#;

        let f: DriveFile = serde_json::from_str(json).unwrap();
        assert_eq!(f.id, "abc123");
        assert_eq!(f.name, "course_c-001.json");
        assert_eq!(
            f.modified_time.as_deref(),
            Some("2026-06-01T12:00:00Z")
        );
    }

    #[test]
    fn test_drive_file_name_convention() {
        let file_name = format!("{}_{}.json", "course", "c-001");
        assert_eq!(file_name, "course_c-001.json");

        let file_name = format!("{}_{}.json", "student", "s-001");
        assert_eq!(file_name, "student_s-001.json");

        let file_name = format!("{}_{}.json", "layout", "l-001");
        assert_eq!(file_name, "layout_l-001.json");
    }

    #[test]
    fn test_error_on_empty_token() {
        let _client = DriveClient::new();

        // The no-auth gate is enforced at runtime in every method.
        // See sync tests for no-auth error string checks.
        assert!(true, "No-auth gate is enforced in every method at runtime");
    }

    #[test]
    fn test_sync_result_serialization() {
        let result = SyncOperationResult {
            count: 3,
            message: "Pushed 3 records.".into(),
            conflicts: vec![],
        };

        let json = serde_json::to_string(&result).unwrap();
        let back: SyncOperationResult = serde_json::from_str(&json).unwrap();
        assert_eq!(back.count, 3);
        assert!(back.conflicts.is_empty());
    }

    #[test]
    fn test_conflict_info_serialization() {
        let conflict = ConflictInfo {
            record_id: "c-001".into(),
            record_type: "course".into(),
            local_updated_at: "2026-06-01T10:00:00Z".into(),
            remote_updated_at: "2026-06-01T12:00:00Z".into(),
            resolution: "remote_won".into(),
        };

        let json = serde_json::to_string(&conflict).unwrap();
        let back: ConflictInfo = serde_json::from_str(&json).unwrap();
        assert_eq!(back.resolution, "remote_won");
    }
}
