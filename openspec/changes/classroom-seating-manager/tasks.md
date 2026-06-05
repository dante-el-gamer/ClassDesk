# Tasks: Classroom Seating Manager

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1500–2000 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (local-storage) → PR 2 (course-management) → PR 3 (seating-grid) → PR 4 (drive-sync) → PR 5 (user-auth) |
| Delivery strategy | ask-always |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | SQLite schema, Rust CRUD commands, models, app entry | PR 1 | Base layer. `cargo test` with in-memory SQLite |
| 2 | Zustand course store + React CRUD UI + typed API layer | PR 2 | Depends on PR 1. Vitest store + component tests |
| 3 | dnd-kit grid components + grid store + layout commands | PR 3 | Depends on PR 2. Vitest dnd handlers + snapshots |
| 4 | Rust Drive v3 client + sync commands + sync store/UI | PR 4 | Depends on PR 3. Mock HTTP server tests |
| 5 | OAuth PKCE flow + token store + auth UI (login last) | PR 5 | Depends on PR 1 only. Local features need no auth |

## Phase 1: Local Storage Foundation

- [x] 1.1 Create `src-tauri/Cargo.toml` with Tauri 2, serde, rusqlite, reqwest deps
- [x] 1.2 Create `src-tauri/tauri.conf.json` and `src-tauri/capabilities/default.json`
- [x] 1.3 Create `src-tauri/src/models.rs` with serde structs (Course, Student, SeatingLayout, SyncState)
- [x] 1.4 Create `src-tauri/src/db/schema.rs` with table DDL, version constants, migration steps
- [x] 1.5 Create `src-tauri/src/db/mod.rs` with connection pool and schema init
- [x] 1.6 Create `src-tauri/src/commands/courses.rs`, `students.rs`, `layouts.rs` with CRUD
- [x] 1.7 Create `src-tauri/src/commands/mod.rs` re-exporting command modules
- [x] 1.8 Create `src-tauri/src/lib.rs` with plugin registration and command routing
- [x] 1.9 Create `src-tauri/src/main.rs` with Tauri app builder entry point
- [x] 1.10 26 Rust unit tests: CRUD round-trips, schema migration, cascade delete, validation — all passing

## Phase 2: Course Management UI

- [x] 2.1 Scaffold: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`
- [x] 2.2 Create `src/types/index.ts` with shared TS interfaces
- [x] 2.3 Create `src/lib/api.ts` with typed `invoke()` wrapper per command group
- [x] 2.4 Create `src/stores/course-store.ts` (Zustand): course + student CRUD state, validation
- [x] 2.5 Create `src/App.tsx` (layout shell), `Sidebar.tsx`, `TopBar.tsx`
- [x] 2.6 Create `CourseList.tsx`, `CourseForm.tsx`, `StudentRoster.tsx`, `StudentForm.tsx`
- [x] 2.7 Vitest: course store reducers, component render, validation (empty/long name rejection)

## Phase 3: Seating Grid

- [x] 3.1 Update `src-tauri/src/commands/layouts.rs` if needed for grid-specific queries
- [x] 3.2 Create `src/stores/grid-store.ts` (Zustand): layout CRUD, placements, dnd event handlers
- [x] 3.3 Create `SeatingGrid.tsx` with dnd-kit sortable context and grid layout
- [x] 3.4 Create `GridCell.tsx` (drop zone) and `StudentCard.tsx` (draggable)
- [x] 3.5 Create `GridConfig.tsx` with rows/cols editor (Radix Slider)
- [x] 3.6 Vitest: grid store reducers, drag handlers, empty-grid default; snapshot tests

## Phase 4: Drive Sync Engine

- [x] 4.1 Create `src-tauri/src/drive/mod.rs` and `src-tauri/src/drive/client.rs` (reqwest Drive v3)
- [x] 4.2 Create `src-tauri/src/commands/sync.rs`: push/pull/status/resolve commands
- [x] 4.3 Create `src/stores/sync-store.ts` (Zustand): dirty set, conflict log, sync status
- [x] 4.4 Create `SyncButton.tsx` and `SyncStatus.tsx` components
- [x] 4.5 Rust tests: mock HTTP Drive serialization; Vitest: sync store + no-auth rejection

## Phase 5: User Authentication

- [x] 5.1 Create `src-tauri/src/auth/mod.rs`: OAuth PKCE flow, token persist, refresh logic
- [x] 5.2 Create `src-tauri/src/commands/auth.rs`: start_oauth, exchange_code, refresh, logout, get_access_token
- [x] 5.3 Create `src/stores/auth-store.ts` (Zustand): auth state, token lifecycle
- [x] 5.4 Create `LoginButton.tsx` and `AuthStatus.tsx` components
- [x] 5.5 Rust tests: OAuth flow, token refresh, revoked-token handling; Vitest: auth store + UI
