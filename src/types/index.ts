/** A course that groups students and seating layouts. */
export interface Course {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  active_layout_id: string | null;
}

/** A student enrolled in a course. */
export interface Student {
  id: string;
  course_id: string;
  name: string;
  student_id: string | null;
  created_at: string;
}

/** A single seat position within a grid (1-indexed row and column). */
export interface SeatPosition {
  row: number;
  col: number;
}

/** A seating layout with configurable grid dimensions and student placements. */
export interface SeatingLayout {
  id: string;
  course_id: string;
  name: string;
  rows: number;
  cols: number;
  placements: Record<string, SeatPosition>;
  created_at: string;
  updated_at: string;
}

/** Tracks the sync state of a record for Drive integration. */
export interface SyncState {
  record_id: string;
  record_type: "course" | "student" | "layout";
  dirty: boolean;
  last_synced_at: string | null;
  local_updated_at: string;
}

// ── Settings ────────────────────────────────────────────────────────────────

export type SidebarPosition = "left" | "top" | "right" | "bottom";

export type ThemeMode = "light" | "dark" | "darker";

export type ActionId =
  | "newCourse"
  | "saveLayout"
  | "deleteCourse"
  | "undo"
  | "toggleTheme"
  | "openSettings";

export interface KeyBinding {
  key: string | null;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
}

export type KeyBindings = Record<ActionId, KeyBinding>;
