import { create } from "zustand";
import * as api from "../lib/api";
import type { SyncOperationResult, SyncStatusInfo } from "../lib/api";

// ── State shape ────────────────────────────────────────────────────────────

interface SyncState {
  // Sync status
  isSyncing: boolean;
  lastSyncResult: SyncOperationResult | null;
  syncStatus: SyncStatusInfo | null;
  error: string | null;

  // Actions
  loadSyncStatus: () => Promise<void>;
  pushSync: (accessToken?: string) => Promise<SyncOperationResult | null>;
  pullSync: (accessToken?: string) => Promise<SyncOperationResult | null>;
  resolveConflict: (
    accessToken: string,
    recordId?: string,
    recordType?: string,
    keep?: "local" | "remote",
  ) => Promise<void>;
  clearError: () => void;
  clearLastResult: () => void;
}

/// Retrieve a fresh access token from the backend.
/// Returns empty string if not authenticated or token is expired.
async function fetchAccessToken(): Promise<string> {
  try {
    const token = await api.getAccessToken();
    return token;
  } catch {
    return "";
  }
}

// ── Store ──────────────────────────────────────────────────────────────────

export const useSyncStore = create<SyncState>((set, get) => ({
  // Initial state
  isSyncing: false,
  lastSyncResult: null,
  syncStatus: null,
  error: null,

  // ── Actions ───────────────────────────────────────────────────────────

  loadSyncStatus: async () => {
    try {
      const status = await api.getSyncStatus();
      set({ syncStatus: status, error: null });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },

  pushSync: async (token?: string) => {
    const accessToken = token ?? await fetchAccessToken();
    if (!accessToken) {
      const error = "Sign in with Google to enable sync.";
      set({ error });
      return null;
    }

    set({ isSyncing: true, error: null });
    try {
      const result = await api.pushSync(accessToken);
      set({
        isSyncing: false,
        lastSyncResult: result,
      });
      // Refresh status after sync
      get().loadSyncStatus();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({
        isSyncing: false,
        error: message,
      });
      return null;
    }
  },

  pullSync: async (token?: string) => {
    const accessToken = token ?? await fetchAccessToken();
    if (!accessToken) {
      const error = "Sign in with Google to enable sync.";
      set({ error });
      return null;
    }

    set({ isSyncing: true, error: null });
    try {
      const result = await api.pullSync(accessToken);
      set({
        isSyncing: false,
        lastSyncResult: result,
      });
      // Refresh status after sync
      get().loadSyncStatus();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({
        isSyncing: false,
        error: message,
      });
      return null;
    }
  },

  resolveConflict: async (
    tokenOrAccessToken: string,
    recordId?: string,
    recordType?: string,
    keep?: "local" | "remote",
  ) => {
    set({ error: null });
    try {
      // Support both overloads: (accessToken, ...) and just the fields
      const accessToken = recordId ? tokenOrAccessToken : await fetchAccessToken();
      const id = recordId ?? tokenOrAccessToken;
      const type = recordType ?? "course";

      await api.resolveConflict(
        accessToken,
        id,
        type,
        keep ?? "local",
      );
      // Refresh status
      get().loadSyncStatus();
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },

  clearError: () => set({ error: null }),

  clearLastResult: () => set({ lastSyncResult: null }),
}));
