# User Authentication Specification

## Purpose

Google OAuth 2.0 login with secure token storage and session persistence. Authentication gates the drive-sync capability. It SHOULD NOT block local-only features.

## Requirements

### Requirement: Google OAuth Login

The system MUST initiate Google OAuth 2.0 flow using the system browser. On successful authorization, the system MUST receive an authorization code and exchange it for access and refresh tokens.

#### Scenario: Successful login

- GIVEN the user has not authenticated
- WHEN the user clicks "Sign in with Google"
- THEN the system MUST open the system browser to Google's consent screen
- AND after the user grants permission, the system MUST receive and store tokens

#### Scenario: Login cancelled by user

- GIVEN the OAuth flow is initiated
- WHEN the user closes the browser without completing authorization
- THEN the system MUST return to the unauthenticated state
- AND MUST NOT store any partial tokens

### Requirement: Token Persistence

The system MUST persist the refresh token securely via the Tauri backend. The access token MAY be cached in memory for the session duration.

#### Scenario: Token survives restart

- GIVEN an authenticated user with stored refresh token
- WHEN the app is closed and reopened
- THEN the system MUST restore the authenticated session
- AND MUST obtain a fresh access token without user interaction

#### Scenario: Revoked token handled gracefully

- GIVEN a stored refresh token that has been revoked
- WHEN the system attempts to obtain a new access token
- THEN it MUST clear the invalid tokens
- AND MUST return to the unauthenticated state
- AND MUST prompt the user to re-authenticate

### Requirement: Access Token Refresh

The system MUST refresh the access token before it expires using the stored refresh token. If refresh fails due to network error, the system SHOULD retry on the next API call.

#### Scenario: Automatic token refresh

- GIVEN an authenticated session with an expired access token
- WHEN the system makes an API call requiring authentication
- THEN the system MUST transparently refresh the access token
- AND MUST proceed with the original API call
- AND the user MUST NOT be notified of the refresh

### Requirement: Logout

The system MUST provide a logout action that clears all stored tokens and returns the app to the unauthenticated state. Local cached data SHOULD remain accessible.

#### Scenario: Full logout

- GIVEN an authenticated user
- WHEN the user selects "Sign out"
- THEN all tokens MUST be cleared from secure storage
- AND the UI MUST return to the login screen
- AND local data MUST remain accessible in read-only mode

### Requirement: Local-Only Mode

The system MUST allow full local functionality (course management, seating grid) without authentication. Authentication MUST only be required for drive-sync operations.

#### Scenario: Use app without login

- GIVEN an unauthenticated user
- WHEN the user creates a course, adds students, and arranges a seating grid
- THEN all operations MUST succeed
- AND a "Sign in to enable cloud sync" prompt SHOULD be displayed
