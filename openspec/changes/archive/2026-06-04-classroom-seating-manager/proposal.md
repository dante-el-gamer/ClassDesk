# Proposal: Classroom Seating Manager

## Intent

Desktop app for teachers to visually manage classroom seating — drag-and-drop students on a configurable grid, organize by courses/groups, sync to Google Drive, cache locally in SQLite. Greenfield project, first and only change.

## Scope

### In Scope
- Desktop app: Tauri 2 + React 18 + TypeScript + Vite
- Google OAuth login with session persistence
- Visual drag-and-drop seating grid (@dnd-kit/react, sortable grid)
- Course/group CRUD with per-course student rosters and seating layouts
- Google Drive API v3 sync (drive.file scope), push/pull with conflict resolution
- Local SQLite cache via Tauri bridge for offline read access
- Packaging: Windows (NSIS) + Linux (.deb/AppImage)
- Auto-update via tauri-plugin-updater

### Out of Scope
- Mobile/web versions, real-time collaboration, student self-service portal
- Printing seating charts, SIS integration, attendance tracking

## Capabilities

### New Capabilities
- `user-auth`: Google OAuth login, token refresh, secure session persistence
- `seating-grid`: Drag-and-drop classroom grid, configurable rows/cols, student card interaction
- `course-management`: Course/group CRUD, student roster editing, per-course layout association
- `drive-sync`: Google Drive API v3 push/pull, offline queue, conflict notification
- `local-storage`: SQLite schema, cache reads, sync state tracking, offline resilience

### Modified Capabilities
None — greenfield project.

## Approach

Tauri 2 (Rust) for desktop shell, SQLite bridge, and Drive sync engine. React 18 + Vite + TypeScript for UI. Zustand for state management. @dnd-kit/react for drag-and-drop with sortable grid preset. TailwindCSS 4 + Radix UI for components. Google Drive API v3 with OAuth 2.0 (drive.file scope). tauri-plugin-updater for seamless delivery. Rust surface stays thin — business logic lives in TypeScript.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/` (frontend) | New | React app, components, stores, API layer |
| `src-tauri/` (backend) | New | Rust commands, SQLite, Drive sync, auth |
| `openspec/specs/` | New | Capability specs (5 new) |
| `openspec/changes/` | New | Change lifecycle artifacts |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Rust learning curve | Med | Keep Rust thin — thick client, thin bridge pattern |
| WebKitGTK quirks on Linux | Med | CI on Ubuntu, AppImage smoke-test before release |
| Offline sync conflicts | Low | Last-write-wins with local timestamps, notify user |
| Google Drive API rate limits | Low | Debounce sync, batch Drive calls |

## Rollback Plan

`git revert` the merge commit. No data migration needed — Drive is authoritative, SQLite is disposable cache.

## Dependencies

- Rust toolchain (rustup), Node.js 18+, pnpm
- Google Cloud project with Drive API enabled
- `cargo install tauri-cli`

## Success Criteria

- [ ] User logs in with Google account; token persists across restarts
- [ ] User creates a course, adds students, configures grid dimensions
- [ ] User drag-and-drops students on the grid; positions persist
- [ ] Data syncs to Google Drive; survives local SQLite wipe and re-sync
- [ ] App installs and runs on Windows (NSIS) and Linux (AppImage)
- [ ] App updates via built-in updater without data loss
