# Design: Classroom Seating Manager

## Technical Approach

Tauri 2 desktop app with React 18 frontend and Rust backend. UI communicates with Rust via `invoke` commands through a typed API layer. Business logic lives in Zustand stores on the frontend; Rust handles persistence (SQLite via `tauri-plugin-sql`) and platform APIs (Google Drive OAuth, HTTP client for Drive v3, auto-updater). Five capabilities map to five Rust command modules with corresponding React store/component pairs. The Rust surface stays intentionally thin — bridge pattern with thick client in TypeScript.

## Architecture Decisions

| Option | Tradeoffs | Decision |
|--------|-----------|----------|
| **Tauri 2 vs Electron** | Electron: 150MB+ bundle, full Chromium, JS-only backend. Tauri: ~5MB binary, OS webview, Rust for OS APIs | **Tauri 2** — smaller binary, lower memory, Rust native for SQLite/Drive |
| **dnd-kit vs react-beautiful-dnd** | rbd is unmaintained, no React 18 support. dnd-kit: active, sortable preset, React 18/19 compatible | **@dnd-kit/react** — maintained, grid sortable preset fits seating |
| **Zustand vs Redux Toolkit** | Redux: boilerplate, provider wrapper, heavier for desktop. Zustand: no providers, direct selector subscriptions, simpler Tauri invoke integration | **Zustand** — thinner, scales well for this scope, no context wrapping |
| **SQLite vs IndexedDB** | IndexedDB: async, browser-only, no Rust access. SQLite: synchronous from Rust, shared with JS via Tauri bridge | **SQLite via tauri-plugin-sql** — single source of truth accessible from both sides |
| **Drive client in Rust vs JS** | JS fetch: simpler but tokens exposed in webview. Rust reqwest: tokens stay in backend, native OAuth plugin integration | **Rust HTTP client (reqwest)** — token isolation, secure by default |
| **OAuth flow** | Embedded webview: convenience but risk of token scraping. System browser PKCE: more secure, no client secret needed | **System browser PKCE** — Google-recommended for desktop, most secure |
| **Sync conflict strategy** | CRDT: correct for multi-user but overengineered. Last-write-wins with timestamps: simple, sufficient for single-teacher usage | **LWW with timestamp** — matches spec exactly, no merge complexity |

## Data Flow

```
Component → Zustand store → invoke("cmd_name", args) → Rust command handler
                                                          │
                    ┌─────────────────────────────────────┤
                    ▼                                     ▼
              tauri-plugin-sql                      reqwest (Drive API)
              (SQLite read/write)                   (JSON serialize/deserialize)
                    │                                     │
                    └──────── sync_state ─────────────────┘
                              dirty/clean
```

Sync flow: User clicks sync → Zustand dispatches → Rust reads dirty records from SQLite → serializes each to JSON → PUT/PATCH to Drive API v3 (drive.file scope) → marks records `clean` with server timestamp.

## File Changes

All files are **Create** (greenfield project):

### Frontend (Vite + React + TypeScript)
| File | Description |
|------|-------------|
| `package.json` | Dependencies: react 18, zustand, @dnd-kit/react, tailwindcss, radix-ui |
| `tsconfig.json` | TypeScript config (strict) |
| `vite.config.ts` | Vite config, tauri dev/proxy integration |
| `index.html` | Vite entry |
| `src/main.tsx` | React root + rendering |
| `src/App.tsx` | Root layout (sidebar + main + top bar) |
| `src/lib/api.ts` | Typed `invoke()` wrapper per command group |
| `src/stores/course-store.ts` | Zustand: course CRUD, student roster |
| `src/stores/grid-store.ts` | Zustand: layout CRUD, dnd state, placements |
| `src/stores/auth-store.ts` | Zustand: auth state, token lifecycle |
| `src/stores/sync-store.ts` | Zustand: sync queue, dirty set, conflict log |
| `src/types/index.ts` | Shared TS interfaces |
| `src/components/layout/Sidebar.tsx` | Course list + navigation |
| `src/components/layout/TopBar.tsx` | App bar with sync + auth controls |
| `src/components/course/CourseList.tsx` | Course cards |
| `src/components/course/CourseForm.tsx` | Create/edit course dialog (Radix) |
| `src/components/course/StudentRoster.tsx` | Student list per course |
| `src/components/course/StudentForm.tsx` | Add/edit student dialog |
| `src/components/grid/SeatingGrid.tsx` | Grid container, dnd-kit sortable context |
| `src/components/grid/GridCell.tsx` | Drop zone cell |
| `src/components/grid/StudentCard.tsx` | Draggable card with student name |
| `src/components/grid/GridConfig.tsx` | Rows/cols editor |
| `src/components/auth/LoginButton.tsx` | Google sign-in (system browser trigger) |
| `src/components/auth/AuthStatus.tsx` | Profile + logout |
| `src/components/sync/SyncButton.tsx` | Push/pull trigger |
| `src/components/sync/SyncStatus.tsx` | Last sync indicator |

### Backend (Rust + Tauri 2)
| File | Description |
|------|-------------|
| `src-tauri/Cargo.toml` | Rust deps: tauri 2, serde, reqwest, rusqlite |
| `src-tauri/tauri.conf.json` | App metadata, permissions, updater config |
| `src-tauri/capabilities/default.json` | Tauri 2 capability permissions |
| `src-tauri/src/main.rs` | Tauri app builder entry |
| `src-tauri/src/lib.rs` | Plugin registration, command router setup |
| `src-tauri/src/commands/mod.rs` | Re-exports all command modules |
| `src-tauri/src/commands/courses.rs` | `create_course`, `list_courses`, `update_course`, `delete_course` |
| `src-tauri/src/commands/students.rs` | `add_student`, `update_student`, `remove_student`, `list_students` |
| `src-tauri/src/commands/layouts.rs` | `save_layout`, `get_layout`, `list_layouts`, `delete_layout` |
| `src-tauri/src/commands/sync.rs` | `push_sync`, `pull_sync`, `get_sync_status`, `resolve_conflict` |
| `src-tauri/src/commands/auth.rs` | `start_oauth`, `exchange_code`, `refresh_token`, `logout`, `get_auth_status` |
| `src-tauri/src/db/mod.rs` | Schema init, migration runner, connection pool |
| `src-tauri/src/db/schema.rs` | Table DDL, version constants, migration steps |
| `src-tauri/src/drive/mod.rs` | Drive client factory |
| `src-tauri/src/drive/client.rs` | reqwest-based Drive v3 HTTP client (upload, download, list) |
| `src-tauri/src/auth/mod.rs` | OAuth PKCE flow, token store, refresh logic |
| `src-tauri/src/models.rs` | Serde structs matching TS types |

## Interfaces / Contracts

```typescript
// src/types/index.ts
interface Course {
  id: string;                   // UUID v4
  name: string;                 // 1-100 chars
  description?: string;
  createdAt: string;            // ISO 8601
  updatedAt: string;
  activeLayoutId?: string;
}

interface Student {
  id: string;
  courseId: string;
  name: string;                 // 1-100 chars
  studentId?: string;           // optional external ID
  createdAt: string;
}

interface SeatPosition {
  row: number;                  // 1-indexed
  col: number;
}

interface SeatingLayout {
  id: string;
  courseId: string;
  name: string;
  rows: number;                 // 1-20
  cols: number;                 // 1-20
  placements: Record<string, SeatPosition>; // studentId → {row, col}
  createdAt: string;
  updatedAt: string;
}

interface SyncState {
  recordId: string;
  recordType: 'course' | 'student' | 'layout';
  dirty: boolean;
  lastSyncedAt?: string;
  localUpdatedAt: string;
}
```

```rust
// src-tauri/src/models.rs — serde mirrors TS types
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Course {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub active_layout_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Student {
    pub id: String,
    pub course_id: String,
    pub name: String,
    pub student_id: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
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
```

## Component Tree

```
App
├── TopBar
│   ├── AuthStatus / LoginButton
│   └── SyncButton + SyncStatus
├── Sidebar
│   └── CourseList
│       └── CourseForm (Radix Dialog)
├── MainContent
│   ├── StudentRoster (left panel)
│   │   └── StudentForm (Radix Dialog)
│   └── SeatingGrid (right panel)
│       ├── GridConfig (toolbar — Radix Slider)
│       ├── GridCell[][] (rows × cols, dnd-kit sortable)
│       └── StudentCard[] (draggable within grid)
```

## Sync Architecture

**Offline-first by design.** All mutations write to SQLite with `dirty=true` and a local timestamp. Drive sync is explicit (user-triggered button, not continuous). Rust serializes dirty records to JSON and stores each as a Drive API file (one per course+layout pair, named by deterministic hash of `{userId}/{recordType}/{recordId}`). Pull reads Drive file list, compares timestamps, overwrites local if remote is newer. Conflict resolution follows spec: LWW by Unix timestamp, local wins on ties with user notification. Sync is gated by auth — no valid token = no Drive calls.

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit (Rust) | Commands, DB queries, Drive serialization, OAuth token refresh | `cargo test` with in-memory SQLite, mock HTTP server for Drive |
| Unit (TS) | Zustand reducers, component render, dnd drag handlers | Vitest + @testing-library/react |
| Integration | Tauri invoke → Rust command → SQLite round-trip | Mock `AppHandle`, assert store updates match persisted state |
| E2E | Full user flows: create course → add students → arrange grid → sync | Playwright + Tauri webview inspector |
| Snapshot | Grid render states (empty, placed, swap indicator) | Vitest snapshot serializer |

## Migration / Rollout

No migration needed for initial release. Implementation follows user-specified order:

1. **local-storage** — SQLite schema, all CRUD commands, migration framework
2. **course-management** — React components for courses + students, Zustand course store
3. **seating-grid** — dnd-kit grid, layout persistence, drag-and-drop logic
4. **drive-sync** — Rust Drive client, push/pull commands, conflict notification
5. **user-auth** — OAuth PKCE flow, token persistence, auth UI (last because local-only mode works without it)

Each phase is independently verifiable. No feature flags required — later phases simply add UI elements that are inert until their data exists.

## Open Questions

- [ ] Tauri 2 IPC serialization: confirm serde_json overhead acceptable for large layouts (20×20 grid, 400 students)
- [ ] WebKitGTK pointer event compatibility: verify dnd-kit sortable preset works on Linux WebKit
- [ ] Google Drive file ID strategy: deterministic hash vs metadata query for record lookup during pull
