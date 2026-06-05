//! Tauri commands for Google OAuth 2.0 authentication.
//!
//! # Commands
//!
//! | Command | Purpose |
//! |---------|---------|
//! | `start_login` | Begin OAuth flow — generate PKCE, start server, open browser |
//! | `exchange_code` | Wait for callback, exchange code for tokens, persist them |
//! | `refresh_token` | Refresh the access token using the stored refresh token |
//! | `logout` | Clear all stored tokens |
//! | `get_auth_status` | Return whether the user is authenticated |
//!
//! # Security
//!
//! Tokens are stored in SQLite (same database as course data).  The access
//! token is kept in the backend only — it is never sent to the frontend
//! for storage.  The frontend requests it when needed for sync operations.

use crate::auth::{
    self, AuthConfig, AuthStatus, OAuthFlowState, PendingOAuth,
};
use crate::db::DbState;
use serde::Serialize;

/// Information returned to the frontend after starting the OAuth flow.
#[derive(Debug, Serialize)]
pub struct OAuthStartInfo {
    /// The port the local server is listening on (for display / matching).
    pub port: u16,
    /// The full Google OAuth authorization URL.
    pub auth_url: String,
}

// ---------------------------------------------------------------------------
// start_login
// ---------------------------------------------------------------------------

/// Begin the OAuth 2.0 PKCE login flow.
///
/// 1. Generates a code_verifier and code_challenge
/// 2. Starts a local TCP server on a random port
/// 3. Opens the system browser to Google's consent screen
///
/// The pending flow state is stored in `OAuthFlowState` so that
/// `exchange_code` (called separately) can complete the flow.
#[tauri::command]
pub fn start_login(
    config: tauri::State<'_, AuthConfig>,
    flow_state: tauri::State<'_, OAuthFlowState>,
) -> Result<OAuthStartInfo, String> {
    // Guard: we need a client_id configured
    if config.client_id.is_empty() {
        return Err(
            "Google OAuth is not configured. Set GOOGLE_CLIENT_ID in your environment."
                .to_string(),
        );
    }

    // 1. Generate PKCE params
    let code_verifier = auth::generate_code_verifier();
    let code_challenge = auth::generate_code_challenge(&code_verifier);

    // 2. Start local server
    let (port, rx) = auth::start_local_server()?;

    // 3. Build auth URL
    let auth_url = auth::build_authorization_url(&config, &code_challenge, port);

    // 4. Store the pending flow state
    let pending = PendingOAuth {
        code_verifier,
        auth_code_rx: rx,
        port,
    };

    let mut pending_guard = flow_state
        .pending
        .lock()
        .map_err(|e| format!("Failed to acquire lock: {e}"))?;
    *pending_guard = Some(pending);

    // 5. Open browser
    opener::open(&auth_url).map_err(|e| format!("Failed to open browser: {e}"))?;

    Ok(OAuthStartInfo { port, auth_url })
}

// ---------------------------------------------------------------------------
// exchange_code
// ---------------------------------------------------------------------------

/// Complete the OAuth flow by exchanging the authorization code for tokens.
///
/// This command BLOCKS until the local server receives the redirect callback
/// (or a timeout occurs).  It then exchanges the authorization code for
/// tokens, fetches the user's email, and persists everything to SQLite.
#[tauri::command]
pub async fn exchange_code(
    state: tauri::State<'_, DbState>,
    config: tauri::State<'_, AuthConfig>,
    flow_state: tauri::State<'_, OAuthFlowState>,
) -> Result<AuthStatus, String> {
    // 1. Take the pending flow state (consumes it)
    let pending: PendingOAuth = {
        let mut guard = flow_state
            .pending
            .lock()
            .map_err(|e| format!("Failed to acquire lock: {e}"))?;
        guard
            .take()
            .ok_or_else(|| "No pending OAuth flow. Call start_login first.".to_string())?
    };

    // 2. Wait for the callback (blocking — run in spawn_blocking)
    let auth_code = tokio::task::spawn_blocking(move || {
        pending
            .auth_code_rx
            .recv_timeout(std::time::Duration::from_secs(
                crate::auth::OAUTH_TIMEOUT_SECS,
            ))
            .map_err(|_| {
                "Login timed out or was cancelled. Please try again.".to_string()
            })
    })
    .await
    .map_err(|e| format!("Task join error: {e}"))?
    .map_err(|e| e.to_string())?; // flatten

    // Combine auth_code with the extracted pending fields
    let code_verifier = pending.code_verifier;
    let port = pending.port;

    // 3. Build the full redirect URI
    let redirect_uri = auth::build_redirect_uri(&config, port);

    // 4. Exchange code for tokens (async HTTP call)
    let token_resp =
        auth::exchange_code_for_tokens(&config.client_id, &code_verifier, &auth_code, &redirect_uri)
            .await?;

    // 5. Fetch user email
    let email = auth::fetch_user_email(&token_resp.access_token).await?;

    // 6. Persist tokens to SQLite
    {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        auth::store_tokens(
            &db,
            &token_resp.access_token,
            token_resp.refresh_token.as_deref(),
            token_resp.expires_in,
            email.as_deref(),
        )?;
    }

    Ok(AuthStatus {
        authenticated: true,
        email,
    })
}

// ---------------------------------------------------------------------------
// refresh_token
// ---------------------------------------------------------------------------

/// Refresh the access token using the stored refresh token.
///
/// If the refresh token has been revoked, clears all tokens and returns
/// `AuthStatus { authenticated: false }` so the frontend can prompt
/// the user to re-authenticate.
#[tauri::command]
pub async fn refresh_token(
    state: tauri::State<'_, DbState>,
    config: tauri::State<'_, AuthConfig>,
) -> Result<AuthStatus, String> {
    // 1. Read stored refresh token
    let refresh_token = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        auth::get_refresh_token(&db)?
    };

    let refresh_token = match refresh_token {
        Some(t) => t,
        None => {
            return Ok(AuthStatus {
                authenticated: false,
                email: None,
            })
        }
    };

    // 2. Call Google's token endpoint
    let token_resp = auth::refresh_access_token(&config.client_id, &refresh_token).await;

    match token_resp {
        Ok(resp) => {
            // Fetch latest email
            let email = auth::fetch_user_email(&resp.access_token).await.ok().flatten();

            // Store new access token (keep existing refresh_token)
            {
                let db = state.db.lock().map_err(|e| e.to_string())?;
                auth::store_tokens(&db, &resp.access_token, None, resp.expires_in, email.as_deref())?;
            }

            let stored_email = {
                let db = state.db.lock().map_err(|e| e.to_string())?;
                auth::get_stored_email(&db)?
            };

            Ok(AuthStatus {
                authenticated: true,
                email: stored_email,
            })
        }
        Err(e) if e == "TOKEN_REVOKED" => {
            // Token was revoked — clear everything and return unauthenticated
            let db = state.db.lock().map_err(|e| e.to_string())?;
            auth::clear_tokens(&db)?;

            Ok(AuthStatus {
                authenticated: false,
                email: None,
            })
        }
        Err(e) => Err(e),
    }
}

// ---------------------------------------------------------------------------
// logout
// ---------------------------------------------------------------------------

/// Log out by clearing all stored tokens.
///
/// Local data (courses, students, layouts) remains intact.
#[tauri::command]
pub async fn logout(state: tauri::State<'_, DbState>) -> Result<AuthStatus, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    auth::clear_tokens(&db)?;

    Ok(AuthStatus {
        authenticated: false,
        email: None,
    })
}

// ---------------------------------------------------------------------------
// get_auth_status
// ---------------------------------------------------------------------------

/// Return the current authentication status without performing any I/O
/// (except reading the local token store).
#[tauri::command]
pub fn get_auth_status(
    state: tauri::State<'_, DbState>,
) -> Result<AuthStatus, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let has_token = auth::has_refresh_token(&db)?;
    let email = auth::get_stored_email(&db)?;

    Ok(AuthStatus {
        authenticated: has_token,
        email,
    })
}

// ---------------------------------------------------------------------------
// get_access_token
// ---------------------------------------------------------------------------

/// Return the currently stored valid access token, or an empty string if
/// no valid token exists.  The frontend should call `refresh_token` first
/// if it suspects the token may be expired.
///
/// NOTE: the token is returned to the frontend only at the moment it is
/// needed (for a Drive API call).  The frontend MUST NOT store it.
#[tauri::command]
pub fn get_access_token(state: tauri::State<'_, DbState>) -> Result<String, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // First try a valid (non-expired) access token
    if let Some(token) = auth::get_valid_access_token(&db)? {
        return Ok(token);
    }

    // If no valid access token, return empty — the caller should refresh
    Ok(String::new())
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::open_in_memory_database;

    fn setup_db() -> rusqlite::Connection {
        let conn = open_in_memory_database().unwrap();
        crate::db::run_migrations(&conn).unwrap();
        conn
    }

    #[test]
    fn test_get_auth_status_no_tokens() {
        let conn = setup_db();

        let has_token = auth::has_refresh_token(&conn).unwrap();
        assert!(!has_token);
        let email = auth::get_stored_email(&conn).unwrap();
        assert!(email.is_none());
    }

    #[test]
    fn test_get_auth_status_with_tokens() {
        let conn = setup_db();

        auth::store_tokens(&conn, "access", Some("refresh"), 3600, Some("user@test.com"))
            .unwrap();

        assert!(auth::has_refresh_token(&conn).unwrap());
        assert_eq!(
            auth::get_stored_email(&conn).unwrap(),
            Some("user@test.com".to_string())
        );
    }

    #[test]
    fn test_logout_clears_tokens() {
        let conn = setup_db();

        auth::store_tokens(&conn, "access", Some("refresh"), 3600, Some("user@test.com"))
            .unwrap();
        assert!(auth::has_refresh_token(&conn).unwrap());

        auth::clear_tokens(&conn).unwrap();

        assert!(!auth::has_refresh_token(&conn).unwrap());
    }

    #[test]
    fn test_revoked_token_scenario() {
        let conn = setup_db();

        // Simulate having tokens stored
        auth::store_tokens(&conn, "access", Some("refresh"), 3600, Some("user@test.com"))
            .unwrap();
        assert!(auth::has_refresh_token(&conn).unwrap());

        // Simulate revoked-token handling: clear tokens
        auth::clear_tokens(&conn).unwrap();

        assert!(!auth::has_refresh_token(&conn).unwrap());
        assert!(auth::get_stored_email(&conn).unwrap().is_none());
    }
}
