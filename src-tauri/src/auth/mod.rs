//! OAuth 2.0 PKCE authentication module for Google Drive.
//!
//! # Flow
//!
//! 1. Generate a random `code_verifier` and its SHA-256 `code_challenge`.
//! 2. Start a local TCP server on a random port to catch the redirect.
//! 3. Open the system browser to Google's authorization URL.
//! 4. Google redirects to `http://127.0.0.1:{port}?code=...`.
//! 5. The local server receives the code; the exchange step completes the flow.
//! 6. Tokens (access + refresh) are stored in SQLite.
//!
//! # Safety
//!
//! PKCE does away with a client_secret — the code_verifier proves the
//! authorization request came from this app.  Suitable for desktop apps.

use rand::Rng;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/// Length of the raw random bytes used for the code_verifier (32 bytes = 256 bits).
const CODE_VERIFIER_BYTES: usize = 32;

/// Default OAuth 2.0 scope — limited to files the app creates.
const DEFAULT_SCOPE: &str = "https://www.googleapis.com/auth/drive.file";

/// Google's OAuth 2.0 endpoints.
const AUTH_URL: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL: &str = "https://oauth2.googleapis.com/token";
const USERINFO_URL: &str = "https://www.googleapis.com/oauth2/v2/userinfo";

/// Timeout for the OAuth callback (seconds).
pub const OAUTH_TIMEOUT_SECS: u64 = 300;

// ---------------------------------------------------------------------------
// Token-related types
// ---------------------------------------------------------------------------

/// The response from Google's token endpoint.
#[derive(Debug, Clone, Deserialize)]
pub struct TokenResponse {
    pub access_token: String,
    pub expires_in: u64,
    #[serde(default)]
    pub refresh_token: Option<String>,
    pub scope: Option<String>,
    pub token_type: Option<String>,
}

/// The response from Google's userinfo endpoint (we only need email).
#[derive(Debug, Deserialize)]
struct UserInfoResponse {
    email: Option<String>,
    #[allow(dead_code)]
    #[serde(default)]
    name: Option<String>,
}

/// Auth status returned to the frontend.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthStatus {
    pub authenticated: bool,
    pub email: Option<String>,
}

// ---------------------------------------------------------------------------
// Auth configuration (managed Tauri state)
// ---------------------------------------------------------------------------

/// Configuration for the OAuth flow, set at app startup.
pub struct AuthConfig {
    pub client_id: String,
    pub redirect_uri: String,
    pub scope: String,
}

impl Default for AuthConfig {
    fn default() -> Self {
        Self {
            client_id: String::new(),
            redirect_uri: "http://127.0.0.1".to_string(),
            scope: DEFAULT_SCOPE.to_string(),
        }
    }
}

// ---------------------------------------------------------------------------
// Pending OAuth flow state
// ---------------------------------------------------------------------------

/// Holds the state of an in-progress OAuth flow between `start_oauth`
/// and `exchange_code` invocations.
pub struct PendingOAuth {
    pub code_verifier: String,
    /// Channel receiver that will get the authorization code from the local server.
    pub auth_code_rx: std::sync::mpsc::Receiver<String>,
    /// The port the local server is listening on.
    pub port: u16,
}

/// Managed Tauri state for the pending OAuth flow.
pub struct OAuthFlowState {
    pub pending: std::sync::Mutex<Option<PendingOAuth>>,
}

impl OAuthFlowState {
    pub fn new() -> Self {
        Self {
            pending: std::sync::Mutex::new(None),
        }
    }
}

impl Default for OAuthFlowState {
    fn default() -> Self {
        Self::new()
    }
}

// ---------------------------------------------------------------------------
// PKCE helpers
// ---------------------------------------------------------------------------

/// Generate a cryptographically random code_verifier (base64url encoded, no padding).
pub fn generate_code_verifier() -> String {
    let bytes: Vec<u8> = (0..CODE_VERIFIER_BYTES)
        .map(|_| rand::thread_rng().gen())
        .collect();
    use base64::Engine;
    base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(&bytes)
}

/// Generate the code_challenge from a code_verifier using SHA-256.
pub fn generate_code_challenge(verifier: &str) -> String {
    let hash = Sha256::digest(verifier.as_bytes());
    use base64::Engine;
    base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(&hash)
}

// ---------------------------------------------------------------------------
// Local HTTP server
// ---------------------------------------------------------------------------

/// Start a local TCP server on a random port.
///
/// Spawns a thread that accepts ONE connection, reads the HTTP request,
/// extracts the `code` query parameter, and sends it over the returned channel.
///
/// Returns the port number and a channel receiver for the authorization code.
pub fn start_local_server() -> Result<(u16, std::sync::mpsc::Receiver<String>), String> {
    let listener = std::net::TcpListener::bind("127.0.0.1:0")
        .map_err(|e| format!("Failed to start local server: {e}"))?;
    let port = listener
        .local_addr()
        .map_err(|e| format!("Failed to get local address: {e}"))?
        .port();

    let (tx, rx) = std::sync::mpsc::channel();

    std::thread::spawn(move || {
        // Accept the redirect connection from Google
        if let Ok((mut stream, _addr)) = listener.accept() {
            use std::io::Read;
            let mut buf = [0u8; 8192];
            if let Ok(n) = stream.read(&mut buf) {
                let request = String::from_utf8_lossy(&buf[..n]);
                if let Some(code) = extract_code_from_request(&request) {
                    let _ = tx.send(code);
                }
            }

            // Send a response back to the browser so the user sees a confirmation
            let body = "<html><body><h1>Authorization complete!</h1><p>You can close this tab and return to the app.</p></body></html>";
            let response = format!(
                "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\n\r\n{}",
                body.len(),
                body
            );
            use std::io::Write;
            let _ = stream.write_all(response.as_bytes());
        }
    });

    Ok((port, rx))
}

/// Extract the `code` query parameter from an HTTP GET request.
fn extract_code_from_request(request: &str) -> Option<String> {
    let line = request.lines().next()?;
    let path = line.split_whitespace().nth(1)?;
    let query = path.split('?').nth(1)?;
    for param in query.split('&') {
        let mut parts = param.splitn(2, '=');
        let key = parts.next()?;
        if key == "code" {
            let value = parts.next()?;
            // URL-decode the value
            return Some(urlencoding::decode(value).unwrap_or_else(|_| value.into()).into_owned());
        }
    }
    None
}

// ---------------------------------------------------------------------------
// Auth URL builder
// ---------------------------------------------------------------------------

/// Build the Google OAuth authorization URL with PKCE parameters.
pub fn build_authorization_url(
    config: &AuthConfig,
    code_challenge: &str,
    port: u16,
) -> String {
    let redirect_uri = format!("{}:{}", config.redirect_uri.trim_end_matches('/'), port);

    let params = [
        ("response_type", "code"),
        ("client_id", &config.client_id),
        ("redirect_uri", &redirect_uri),
        ("code_challenge", code_challenge),
        ("code_challenge_method", "S256"),
        ("scope", &config.scope),
        ("access_type", "offline"),
        ("prompt", "consent"),
    ];

    let mut url = url::Url::parse(AUTH_URL).expect("Invalid auth URL");
    url.query_pairs_mut().extend_pairs(params.iter());
    url.to_string()
}

// ---------------------------------------------------------------------------
// Token exchange & refresh (async, use reqwest)
// ---------------------------------------------------------------------------

/// Exchange the authorization code for access and refresh tokens.
pub async fn exchange_code_for_tokens(
    client_id: &str,
    code_verifier: &str,
    auth_code: &str,
    redirect_uri: &str,
) -> Result<TokenResponse, String> {
    let client = reqwest::Client::new();

    let params = [
        ("grant_type", "authorization_code"),
        ("code", auth_code),
        ("redirect_uri", redirect_uri),
        ("client_id", client_id),
        ("code_verifier", code_verifier),
    ];

    let resp = client
        .post(TOKEN_URL)
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Token exchange request failed: {e}"))?;

    let status = resp.status();
    let text = resp.text().await.unwrap_or_default();

    if !status.is_success() {
        return Err(format!("Token exchange failed (HTTP {}): {}", status, text));
    }

    serde_json::from_str(&text)
        .map_err(|e| format!("Failed to parse token response: {e}"))
}

/// Refresh an expired access token using the stored refresh token.
///
/// Returns `Err("TOKEN_REVOKED")` when the refresh token is no longer valid,
/// which the caller should handle by clearing tokens and returning to
/// the unauthenticated state.
pub async fn refresh_access_token(
    client_id: &str,
    refresh_token: &str,
) -> Result<TokenResponse, String> {
    let client = reqwest::Client::new();

    let params = [
        ("grant_type", "refresh_token"),
        ("refresh_token", refresh_token),
        ("client_id", client_id),
    ];

    let resp = client
        .post(TOKEN_URL)
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Token refresh request failed: {e}"))?;

    let status = resp.status();
    let text = resp.text().await.unwrap_or_default();

    if status.is_success() {
        serde_json::from_str(&text)
            .map_err(|e| format!("Failed to parse refresh response: {e}"))
    } else if text.contains("invalid_grant") || text.contains("token has been revoked") {
        Err("TOKEN_REVOKED".to_string())
    } else {
        Err(format!("Token refresh failed (HTTP {}): {}", status, text))
    }
}

/// Fetch the user's email address from Google's userinfo endpoint.
pub async fn fetch_user_email(access_token: &str) -> Result<Option<String>, String> {
    let client = reqwest::Client::new();

    let resp = client
        .get(USERINFO_URL)
        .header("Authorization", format!("Bearer {}", access_token))
        .send()
        .await
        .map_err(|e| format!("Userinfo request failed: {e}"))?;

    if !resp.status().is_success() {
        return Ok(None); // Non-critical — email is optional
    }

    let info: UserInfoResponse = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse userinfo response: {e}"))?;

    Ok(info.email)
}

// ---------------------------------------------------------------------------
// Token persistence (SQLite)
// ---------------------------------------------------------------------------

/// Keys used in the `tokens` table.
const KEY_REFRESH_TOKEN: &str = "refresh_token";
const KEY_ACCESS_TOKEN: &str = "access_token";
const KEY_ACCESS_EXPIRY: &str = "access_token_expiry";
const KEY_USER_EMAIL: &str = "user_email";

/// Store tokens in SQLite after a successful exchange or refresh.
pub fn store_tokens(
    db: &Connection,
    access_token: &str,
    refresh_token: Option<&str>,
    expires_in: u64,
    email: Option<&str>,
) -> Result<(), String> {
    let expiry = chrono::Utc::now() + chrono::Duration::seconds(expires_in as i64);

    upsert_token(db, KEY_ACCESS_TOKEN, access_token)?;
    upsert_token(db, KEY_ACCESS_EXPIRY, &expiry.to_rfc3339())?;

    if let Some(rt) = refresh_token {
        upsert_token(db, KEY_REFRESH_TOKEN, rt)?;
    }

    if let Some(em) = email {
        upsert_token(db, KEY_USER_EMAIL, em)?;
    }

    Ok(())
}

/// Retrieve the stored refresh token.
pub fn get_refresh_token(db: &Connection) -> Result<Option<String>, String> {
    read_token(db, KEY_REFRESH_TOKEN)
}

/// Retrieve a valid access token from the store.
///
/// Returns `None` if no token exists, or if it has expired.
/// The caller should attempt a refresh when this returns `None`
/// but a refresh_token exists.
pub fn get_valid_access_token(db: &Connection) -> Result<Option<String>, String> {
    // Check expiry
    let expiry_str = match read_token(db, KEY_ACCESS_EXPIRY)? {
        Some(s) => s,
        None => return Ok(None),
    };

    let expiry = match chrono::DateTime::parse_from_rfc3339(&expiry_str) {
        Ok(dt) => dt,
        Err(_) => return Ok(None),
    };

    if chrono::Utc::now() >= expiry {
        return Ok(None); // Expired
    }

    read_token(db, KEY_ACCESS_TOKEN)
}

/// Retrieve the stored user email.
pub fn get_stored_email(db: &Connection) -> Result<Option<String>, String> {
    read_token(db, KEY_USER_EMAIL)
}

/// Clear all stored tokens (used on logout or when tokens are revoked).
pub fn clear_tokens(db: &Connection) -> Result<(), String> {
    db.execute("DELETE FROM tokens", [])
        .map_err(|e| format!("Failed to clear tokens: {e}"))?;
    Ok(())
}

/// Check whether the user has a stored refresh token (i.e., is authenticated).
pub fn has_refresh_token(db: &Connection) -> Result<bool, String> {
    get_refresh_token(db).map(|t| t.is_some())
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

fn upsert_token(db: &Connection, key: &str, value: &str) -> Result<(), String> {
    db.execute(
        "INSERT INTO tokens (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        rusqlite::params![key, value],
    )
    .map_err(|e| format!("Failed to store token '{key}': {e}"))?;
    Ok(())
}

fn read_token(db: &Connection, key: &str) -> Result<Option<String>, String> {
    let result = db.query_row(
        "SELECT value FROM tokens WHERE key = ?1",
        rusqlite::params![key],
        |row| row.get(0),
    );
    match result {
        Ok(val) => Ok(Some(val)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(format!("Failed to read token '{key}': {e}")),
    }
}

// ---------------------------------------------------------------------------
// Redirect URI helper
// ---------------------------------------------------------------------------

/// Build the full redirect URI including the dynamic port.
pub fn build_redirect_uri(config: &AuthConfig, port: u16) -> String {
    format!("{}:{}", config.redirect_uri.trim_end_matches('/'), port)
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

    // ── PKCE helpers ─────────────────────────────────────────────────────

    #[test]
    fn test_generate_code_verifier_length() {
        let verifier = generate_code_verifier();
        // 32 bytes → 43 base64url chars (no padding)
        assert_eq!(verifier.len(), 43);
        // Should only contain URL-safe characters
        assert!(!verifier.contains('+'));
        assert!(!verifier.contains('/'));
        assert!(!verifier.contains('='));
    }

    #[test]
    fn test_generate_code_verifier_unique() {
        let a = generate_code_verifier();
        let b = generate_code_verifier();
        assert_ne!(a, b);
    }

    #[test]
    fn test_generate_code_challenge_is_valid() {
        let verifier = generate_code_verifier();
        let challenge = generate_code_challenge(&verifier);
        // SHA-256 hash → 32 bytes → 43 base64url chars
        assert_eq!(challenge.len(), 43);
        assert!(!challenge.contains('='));
    }

    #[test]
    fn test_generate_code_challenge_deterministic() {
        let verifier = "test-verifier-1234567890";
        let a = generate_code_challenge(verifier);
        let b = generate_code_challenge(verifier);
        assert_eq!(a, b);
    }

    #[test]
    fn test_generate_code_challenge_different_for_different_verifiers() {
        let a = generate_code_challenge("verifier-one");
        let b = generate_code_challenge("verifier-two");
        assert_ne!(a, b);
    }

    #[test]
    fn test_build_authorization_url_includes_params() {
        let config = AuthConfig {
            client_id: "test-client-id".into(),
            redirect_uri: "http://127.0.0.1".into(),
            scope: DEFAULT_SCOPE.into(),
        };
        let challenge = generate_code_challenge("test-verifier");
        let url = build_authorization_url(&config, &challenge, 54321);

        assert!(url.contains("client_id=test-client-id"));
        assert!(url.contains("redirect_uri=http%3A%2F%2F127.0.0.1%3A54321"));
        assert!(url.contains("code_challenge_method=S256"));
        assert!(url.contains("access_type=offline"));
        assert!(url.contains("prompt=consent"));
        assert!(url.contains(&challenge));
    }

    #[test]
    fn test_build_redirect_uri() {
        let config = AuthConfig::default();
        let uri = build_redirect_uri(&config, 9999);
        assert_eq!(uri, "http://127.0.0.1:9999");
    }

    // ── Token persistence ────────────────────────────────────────────────

    #[test]
    fn test_store_and_read_tokens() {
        let db = setup_db();

        store_tokens(&db, "access-123", Some("refresh-456"), 3600, Some("user@example.com"))
            .unwrap();

        assert_eq!(
            get_valid_access_token(&db).unwrap(),
            Some("access-123".to_string())
        );
        assert_eq!(
            get_refresh_token(&db).unwrap(),
            Some("refresh-456".to_string())
        );
        assert_eq!(
            get_stored_email(&db).unwrap(),
            Some("user@example.com".to_string())
        );
        assert!(has_refresh_token(&db).unwrap());
    }

    #[test]
    fn test_no_tokens_initially() {
        let db = setup_db();

        assert!(get_valid_access_token(&db).unwrap().is_none());
        assert!(get_refresh_token(&db).unwrap().is_none());
        assert!(get_stored_email(&db).unwrap().is_none());
        assert!(!has_refresh_token(&db).unwrap());
    }

    #[test]
    fn test_expired_token_returns_none() {
        let db = setup_db();

        // Store with a 0-second expiry (already expired)
        store_tokens(&db, "expired-token", None, 0, None).unwrap();

        // Should return None since token is expired
        assert!(get_valid_access_token(&db).unwrap().is_none());
    }

    #[test]
    fn test_store_overwrites_existing() {
        let db = setup_db();

        store_tokens(&db, "token-1", Some("rt-1"), 3600, Some("a@b.com")).unwrap();
        store_tokens(&db, "token-2", Some("rt-2"), 7200, Some("c@d.com")).unwrap();

        // Should have the latest values
        assert_eq!(
            get_valid_access_token(&db).unwrap(),
            Some("token-2".to_string())
        );
        assert_eq!(
            get_refresh_token(&db).unwrap(),
            Some("rt-2".to_string())
        );
        assert_eq!(
            get_stored_email(&db).unwrap(),
            Some("c@d.com".to_string())
        );
    }

    #[test]
    fn test_clear_tokens() {
        let db = setup_db();

        store_tokens(&db, "access", Some("refresh"), 3600, Some("user@test.com")).unwrap();
        assert!(has_refresh_token(&db).unwrap());

        clear_tokens(&db).unwrap();

        assert!(!has_refresh_token(&db).unwrap());
        assert!(get_valid_access_token(&db).unwrap().is_none());
        assert!(get_stored_email(&db).unwrap().is_none());
    }

    #[test]
    fn test_store_without_refresh_token() {
        let db = setup_db();

        // Token exchange on refresh doesn't include a new refresh_token
        store_tokens(&db, "new-access", None, 1800, None).unwrap();

        assert_eq!(
            get_valid_access_token(&db).unwrap(),
            Some("new-access".to_string())
        );
        // Refresh token should still be whatever was stored before
        assert!(get_refresh_token(&db).unwrap().is_none());
    }

    // ── AuthStatus ────────────────────────────────────────────────────────

    #[test]
    fn test_auth_status_serialization() {
        let status = AuthStatus {
            authenticated: true,
            email: Some("user@example.com".to_string()),
        };

        let json = serde_json::to_string(&status).unwrap();
        let back: AuthStatus = serde_json::from_str(&json).unwrap();

        assert!(back.authenticated);
        assert_eq!(back.email.unwrap(), "user@example.com");
    }

    #[test]
    fn test_auth_status_unauthenticated() {
        let status = AuthStatus {
            authenticated: false,
            email: None,
        };

        let json = serde_json::to_string(&status).unwrap();
        let back: AuthStatus = serde_json::from_str(&json).unwrap();

        assert!(!back.authenticated);
        assert!(back.email.is_none());
    }

    // ── extract_code_from_request ────────────────────────────────────────

    #[test]
    fn test_extract_code_from_valid_request() {
        let request = "GET /?code=abc123&scope=email HTTP/1.1\r\nHost: localhost\r\n\r\n";
        assert_eq!(extract_code_from_request(request), Some("abc123".into()));
    }

    #[test]
    fn test_extract_code_from_request_no_code() {
        let request = "GET /?error=access_denied HTTP/1.1\r\nHost: localhost\r\n\r\n";
        assert_eq!(extract_code_from_request(request), None);
    }

    #[test]
    fn test_extract_code_from_invalid_request() {
        assert_eq!(extract_code_from_request(""), None);
        assert_eq!(extract_code_from_request("GET / HTTP/1.1"), None);
    }

    #[test]
    fn test_extract_code_url_decoded() {
        let request = "GET /?code=abc%2Fdef%3Dghi HTTP/1.1\r\n\r\n";
        assert_eq!(
            extract_code_from_request(request),
            Some("abc/def=ghi".into())
        );
    }
}
