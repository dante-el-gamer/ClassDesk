import { invoke } from "@tauri-apps/api/core";
import type { Course, Student, SeatingLayout, SeatPosition } from "../types";

// ── Course commands ────────────────────────────────────────────────────────

export async function createCourse(
  name: string,
  description?: string,
): Promise<Course> {
  return invoke<Course>("create_course", {
    name,
    description: description ?? null,
  });
}

export async function listCourses(): Promise<Course[]> {
  return invoke<Course[]>("list_courses");
}

export async function updateCourse(
  id: string,
  name: string,
  description?: string | null,
): Promise<Course> {
  return invoke<Course>("update_course", { id, name, description });
}

export async function deleteCourse(id: string): Promise<void> {
  return invoke<void>("delete_course", { id });
}

// ── Student commands ───────────────────────────────────────────────────────

export async function createStudent(
  courseId: string,
  name: string,
  studentId?: string,
): Promise<Student> {
  return invoke<Student>("create_student", {
    courseId,
    name,
    studentId: studentId ?? null,
  });
}

export async function listStudents(
  courseId: string,
): Promise<Student[]> {
  return invoke<Student[]>("list_students", { courseId });
}

export async function updateStudent(
  id: string,
  name: string,
  studentId?: string | null,
): Promise<Student> {
  return invoke<Student>("update_student", { id, name, studentId });
}

export async function deleteStudent(id: string): Promise<void> {
  return invoke<void>("delete_student", { id });
}

// ── Layout commands ────────────────────────────────────────────────────────

export async function saveLayout(
  courseId: string,
  name: string,
  rows: number,
  cols: number,
  placements: Record<string, SeatPosition>,
  id?: string,
): Promise<SeatingLayout> {
  return invoke<SeatingLayout>("save_layout", {
    id: id ?? null,
    courseId,
    name,
    rows,
    cols,
    placements,
  });
}

export async function getLayout(
  id: string,
): Promise<SeatingLayout | null> {
  return invoke<SeatingLayout | null>("get_layout", { id });
}

export async function listLayouts(
  courseId: string,
): Promise<SeatingLayout[]> {
  return invoke<SeatingLayout[]>("list_layouts", { courseId });
}

export async function deleteLayout(id: string): Promise<void> {
  return invoke<void>("delete_layout", { id });
}

// ── Sync commands ──────────────────────────────────────────────────────────

export interface SyncOperationResult {
  count: number;
  message: string;
  conflicts: ConflictInfo[];
}

export interface ConflictInfo {
  record_id: string;
  record_type: string;
  local_updated_at: string;
  remote_updated_at: string;
  resolution: string;
}

export interface SyncStatusInfo {
  dirty_count: number;
  last_synced_at: string | null;
  dirty_records: DirtyRecordSummary[];
}

export interface DirtyRecordSummary {
  record_id: string;
  record_type: string;
  local_updated_at: string;
}

export async function pushSync(
  accessToken: string,
): Promise<SyncOperationResult> {
  return invoke<SyncOperationResult>("push_sync", { accessToken });
}

export async function pullSync(
  accessToken: string,
): Promise<SyncOperationResult> {
  return invoke<SyncOperationResult>("pull_sync", { accessToken });
}

export async function getSyncStatus(): Promise<SyncStatusInfo> {
  return invoke<SyncStatusInfo>("get_sync_status");
}

export async function resolveConflict(
  accessToken: string,
  recordId: string,
  recordType: string,
  keep: "local" | "remote",
): Promise<string> {
  return invoke<string>("resolve_conflict", {
    accessToken,
    recordId,
    recordType,
    keep,
  });
}

// ── Auth commands ───────────────────────────────────────────────────────────

export interface AuthStatus {
  authenticated: boolean;
  email: string | null;
}

export interface OAuthStartInfo {
  port: number;
  auth_url: string;
}

export async function startLogin(): Promise<OAuthStartInfo> {
  return invoke<OAuthStartInfo>("start_login");
}

export async function exchangeCode(): Promise<AuthStatus> {
  return invoke<AuthStatus>("exchange_code");
}

export async function refreshToken(): Promise<AuthStatus> {
  return invoke<AuthStatus>("refresh_token");
}

export async function logout(): Promise<AuthStatus> {
  return invoke<AuthStatus>("logout");
}

export async function getAuthStatus(): Promise<AuthStatus> {
  return invoke<AuthStatus>("get_auth_status");
}

/// Retrieve the current access token from the backend.
/// Only call this when you are about to make a Drive API request —
/// the token is ephemeral and should not be cached on the frontend.
export async function getAccessToken(): Promise<string> {
  return invoke<string>("get_access_token");
}
