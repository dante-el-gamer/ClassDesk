import { describe, it, expect, vi, beforeEach } from "vitest";
import { useSyncStore } from "./sync-store";

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("../lib/api", () => ({
  getSyncStatus: vi.fn(),
  pushSync: vi.fn(),
  pullSync: vi.fn(),
  resolveConflict: vi.fn(),
  getAccessToken: vi.fn(),
}));

import * as api from "../lib/api";
const mockedApi = vi.mocked(api);

// ── Fixtures ───────────────────────────────────────────────────────────────

const makeStatus = (overrides: Partial<api.SyncStatusInfo> = {}) => ({
  dirty_count: 0,
  last_synced_at: null,
  dirty_records: [],
  ...overrides,
});

const makeResult = (overrides: Partial<api.SyncOperationResult> = {}) => ({
  count: 0,
  message: "Nothing to sync.",
  conflicts: [],
  ...overrides,
});

// ── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  useSyncStore.setState({
    isSyncing: false,
    lastSyncResult: null,
    syncStatus: null,
    error: null,
  });
  vi.resetAllMocks();

  // Default: getSyncStatus returns empty status (prevents cross-test leakage)
  mockedApi.getSyncStatus.mockResolvedValue({
    dirty_count: 0,
    last_synced_at: null,
    dirty_records: [],
  });
});

// ── loadSyncStatus ─────────────────────────────────────────────────────────

describe("loadSyncStatus", () => {
  it("loads sync status from the backend", async () => {
    const status = makeStatus({ dirty_count: 3 });
    mockedApi.getSyncStatus.mockResolvedValue(status);

    await useSyncStore.getState().loadSyncStatus();

    expect(useSyncStore.getState().syncStatus?.dirty_count).toBe(3);
    expect(useSyncStore.getState().error).toBeNull();
  });

  it("handles API errors gracefully", async () => {
    mockedApi.getSyncStatus.mockRejectedValue(new Error("DB error"));

    await useSyncStore.getState().loadSyncStatus();

    expect(useSyncStore.getState().syncStatus).toBeNull();
    expect(useSyncStore.getState().error).toBe("DB error");
  });
});

// ── pushSync ───────────────────────────────────────────────────────────────

describe("pushSync", () => {
  it("rejects when getAccessToken returns empty", async () => {
    mockedApi.getAccessToken?.mockResolvedValue("");

    const result = await useSyncStore.getState().pushSync();

    expect(result).toBeNull();
    expect(useSyncStore.getState().error).toBe(
      "Sign in with Google to enable sync.",
    );
  });

  it("calls the API and updates state on success", async () => {
    mockedApi.getAccessToken?.mockResolvedValue("valid-token");
    const result = makeResult({ count: 2, message: "Pushed 2 records." });
    mockedApi.pushSync.mockResolvedValue(result);

    const returned = await useSyncStore.getState().pushSync();

    expect(mockedApi.pushSync).toHaveBeenCalledWith("valid-token");
    expect(returned?.count).toBe(2);
    expect(useSyncStore.getState().lastSyncResult?.message).toBe(
      "Pushed 2 records.",
    );
    expect(useSyncStore.getState().isSyncing).toBe(false);
  });

  it("handles API errors during push", async () => {
    mockedApi.getAccessToken?.mockResolvedValue("valid-token");
    mockedApi.pushSync.mockRejectedValue(new Error("Drive error"));

    const result = await useSyncStore.getState().pushSync();

    expect(result).toBeNull();
    expect(useSyncStore.getState().error).toBe("Drive error");
    expect(useSyncStore.getState().isSyncing).toBe(false);
  });
});

// ── pullSync ───────────────────────────────────────────────────────────────

describe("pullSync", () => {
  it("rejects when getAccessToken returns empty", async () => {
    mockedApi.getAccessToken?.mockResolvedValue("");

    const result = await useSyncStore.getState().pullSync();

    expect(result).toBeNull();
    expect(useSyncStore.getState().error).toBe(
      "Sign in with Google to enable sync.",
    );
  });

  it("calls the API on success", async () => {
    mockedApi.getAccessToken?.mockResolvedValue("token");
    const result = makeResult({ count: 1 });
    mockedApi.pullSync.mockResolvedValue(result);

    const returned = await useSyncStore.getState().pullSync();

    expect(mockedApi.pullSync).toHaveBeenCalledWith("token");
    expect(returned?.count).toBe(1);
    expect(useSyncStore.getState().error).toBeNull();
  });
});

// ── resolveConflict ────────────────────────────────────────────────────────

describe("resolveConflict", () => {
  it("calls the API with local keep", async () => {
    mockedApi.resolveConflict.mockResolvedValue("Kept local version.");

    await useSyncStore
      .getState()
      .resolveConflict("token", "c-001", "course", "local");

    expect(mockedApi.resolveConflict).toHaveBeenCalledWith(
      "token",
      "c-001",
      "course",
      "local",
    );
  });

  it("handles errors", async () => {
    mockedApi.resolveConflict.mockRejectedValue(
      new Error("File not found"),
    );

    await useSyncStore
      .getState()
      .resolveConflict("token", "x", "course", "remote");

    expect(useSyncStore.getState().error).toBe("File not found");
  });
});

// ── clearError / clearLastResult ───────────────────────────────────────────

describe("clearError", () => {
  it("clears the error", () => {
    useSyncStore.setState({ error: "Some error" });
    useSyncStore.getState().clearError();
    expect(useSyncStore.getState().error).toBeNull();
  });
});

describe("clearLastResult", () => {
  it("clears the last sync result", () => {
    useSyncStore.setState({
      lastSyncResult: makeResult({ count: 1 }),
    });
    useSyncStore.getState().clearLastResult();
    expect(useSyncStore.getState().lastSyncResult).toBeNull();
  });
});
