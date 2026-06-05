# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | ✅ Yes             |

## Reporting a Vulnerability

This is a desktop application with local-first architecture. Security concerns fall into two categories:

### 1. OAuth & Credential Handling

Sensitive data (OAuth tokens) is stored encrypted in local SQLite. If you find a flaw in:

- Token encryption or storage
- PKCE flow implementation
- Google Drive API credential handling
- Environment variable leakage (`GOOGLE_CLIENT_ID`)

Please report it.

### 2. Application Security

- SQLite query construction in Rust (rusqlite)
- Tauri command exposure and validation
- Local file system access via Tauri APIs

### How to report

**Do NOT open public issues** for security vulnerabilities. Instead, email the maintainer directly or open a **draft security advisory** on GitHub:

1. Go to the repository's **Security** tab
2. Click **Report a vulnerability** (via GitHub Advisory)
3. Fill in the details — include:
   - Affected version(s)
   - Type of vulnerability
   - Steps to reproduce (conceptual is fine)
   - Potential impact

You can expect:

- **Acknowledgement** within 48 hours
- **Initial triage** within 5 business days
- A fixed version or mitigation timeline agreed with you

## Scope

This policy covers the `classroom-seating-manager` repository — both the Tauri/Rust backend (`src-tauri/`) and the React/TypeScript frontend (`src/`).

Out of scope:

- Google's own OAuth 2.0 infrastructure
- Tauri framework vulnerabilities (report to Tauri team)
- Rust crate vulnerabilities (report to RustSec / respective maintainers)
- npm package vulnerabilities (report to the package maintainer)
