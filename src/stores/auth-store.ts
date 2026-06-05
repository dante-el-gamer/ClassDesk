import { create } from "zustand";
import * as api from "../lib/api";

// ── State shape ────────────────────────────────────────────────────────────

interface AuthState {
  // Auth status
  authenticated: boolean;
  email: string | null;
  isLoading: boolean;
  isLoginInProgress: boolean;
  error: string | null;

  // Actions
  checkAuthStatus: () => Promise<void>;
  /// Returns `true` if the login flow was started successfully,
  /// `false` if an error occurred (the error is set in state).
  startLogin: () => Promise<boolean>;
  completeLogin: () => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  clearError: () => void;
}

// ── Store ──────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  authenticated: false,
  email: null,
  isLoading: false,
  isLoginInProgress: false,
  error: null,

  // ── Actions ───────────────────────────────────────────────────────────

  checkAuthStatus: async () => {
    set({ isLoading: true, error: null });
    try {
      const status = await api.getAuthStatus();
      set({
        authenticated: status.authenticated,
        email: status.email,
        isLoading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
        isLoading: false,
      });
    }
  },

  startLogin: async () => {
    const { isLoginInProgress } = get();
    if (isLoginInProgress) return false;

    set({ isLoginInProgress: true, error: null });
    try {
      // Starts the local server, generates PKCE, and opens the browser
      await api.startLogin();
      // The browser is now open showing Google's consent screen.
      // isLoginInProgress stays true while waiting for the user.
      return true;
    } catch (err) {
      set({
        isLoginInProgress: false,
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  },

  completeLogin: async () => {
    set({ isLoading: true, error: null });
    try {
      // Exchange the auth code (received by local server) for tokens
      const status = await api.exchangeCode();
      set({
        authenticated: status.authenticated,
        email: status.email,
        isLoading: false,
        isLoginInProgress: false,
      });
    } catch (err) {
      set({
        isLoading: false,
        isLoginInProgress: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },

  logout: async () => {
    set({ isLoading: true, error: null });
    try {
      await api.logout();
      set({
        authenticated: false,
        email: null,
        isLoading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
        isLoading: false,
      });
    }
  },

  refreshToken: async () => {
    try {
      const status = await api.refreshToken();
      set({
        authenticated: status.authenticated,
        email: status.email,
        error: null,
      });
    } catch (err) {
      // If refresh fails, don't clear auth — the token might still work
      const message = err instanceof Error ? err.message : String(err);
      // Only set error for non-revoked cases (revoked is handled server-side)
      if (!message.includes("TOKEN_REVOKED")) {
        set({ error: message });
      }
    }
  },

  clearError: () => set({ error: null }),
}));
