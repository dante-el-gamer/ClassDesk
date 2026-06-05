import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAuthStore } from "./auth-store";

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("../lib/api", () => ({
  getAuthStatus: vi.fn(),
  startLogin: vi.fn(),
  exchangeCode: vi.fn(),
  refreshToken: vi.fn(),
  logout: vi.fn(),
  getAccessToken: vi.fn(),
}));

import * as api from "../lib/api";
const mockedApi = vi.mocked(api);

// ── Fixtures ───────────────────────────────────────────────────────────────

const makeStatus = (overrides: Partial<api.AuthStatus> = {}) => ({
  authenticated: false,
  email: null,
  ...overrides,
});

// ── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  useAuthStore.setState({
    authenticated: false,
    email: null,
    isLoading: false,
    isLoginInProgress: false,
    error: null,
  });
  vi.resetAllMocks();
});

// ── checkAuthStatus ────────────────────────────────────────────────────────

describe("checkAuthStatus", () => {
  it("sets authenticated to true when the backend has tokens", async () => {
    mockedApi.getAuthStatus.mockResolvedValue(
      makeStatus({ authenticated: true, email: "user@example.com" }),
    );

    await useAuthStore.getState().checkAuthStatus();

    expect(useAuthStore.getState().authenticated).toBe(true);
    expect(useAuthStore.getState().email).toBe("user@example.com");
    expect(useAuthStore.getState().error).toBeNull();
  });

  it("sets authenticated to false when no tokens exist", async () => {
    mockedApi.getAuthStatus.mockResolvedValue(makeStatus());

    await useAuthStore.getState().checkAuthStatus();

    expect(useAuthStore.getState().authenticated).toBe(false);
    expect(useAuthStore.getState().email).toBeNull();
  });

  it("handles API errors gracefully", async () => {
    mockedApi.getAuthStatus.mockRejectedValue(new Error("DB error"));

    await useAuthStore.getState().checkAuthStatus();

    expect(useAuthStore.getState().error).toBe("DB error");
  });
});

// ── startLogin / completeLogin ─────────────────────────────────────────────

describe("startLogin", () => {
  it("starts the OAuth flow and opens the browser", async () => {
    mockedApi.startLogin.mockResolvedValue({
      port: 54321,
      auth_url: "https://accounts.google.com/o/oauth2/v2/auth?...",
    });

    await useAuthStore.getState().startLogin();

    expect(mockedApi.startLogin).toHaveBeenCalled();
    // Browser is open; isLoginInProgress stays true
    expect(useAuthStore.getState().isLoginInProgress).toBe(true);
  });

  it("handles errors during startLogin", async () => {
    mockedApi.startLogin.mockRejectedValue(new Error("Failed to open browser"));

    await useAuthStore.getState().startLogin();

    expect(useAuthStore.getState().isLoginInProgress).toBe(false);
    expect(useAuthStore.getState().error).toBe("Failed to open browser");
  });

  it("does not start a second flow if one is already in progress", async () => {
    useAuthStore.setState({ isLoginInProgress: true });

    await useAuthStore.getState().startLogin();

    expect(mockedApi.startLogin).not.toHaveBeenCalled();
  });
});

describe("completeLogin", () => {
  it("exchanges code and stores tokens", async () => {
    mockedApi.exchangeCode.mockResolvedValue(
      makeStatus({ authenticated: true, email: "user@test.com" }),
    );

    await useAuthStore.getState().completeLogin();

    expect(useAuthStore.getState().authenticated).toBe(true);
    expect(useAuthStore.getState().email).toBe("user@test.com");
    expect(useAuthStore.getState().isLoginInProgress).toBe(false);
    expect(useAuthStore.getState().error).toBeNull();
  });

  it("handles exchange errors", async () => {
    mockedApi.exchangeCode.mockRejectedValue(
      new Error("Login timed out or was cancelled."),
    );

    await useAuthStore.getState().completeLogin();

    expect(useAuthStore.getState().authenticated).toBe(false);
    expect(useAuthStore.getState().isLoginInProgress).toBe(false);
    expect(useAuthStore.getState().error).toBe(
      "Login timed out or was cancelled.",
    );
  });
});

// ── logout ─────────────────────────────────────────────────────────────────

describe("logout", () => {
  it("clears auth state on successful logout", async () => {
    useAuthStore.setState({
      authenticated: true,
      email: "user@example.com",
    });
    mockedApi.logout.mockResolvedValue(
      makeStatus({ authenticated: false, email: null }),
    );

    await useAuthStore.getState().logout();

    expect(useAuthStore.getState().authenticated).toBe(false);
    expect(useAuthStore.getState().email).toBeNull();
  });

  it("handles logout errors", async () => {
    useAuthStore.setState({ authenticated: true });
    mockedApi.logout.mockRejectedValue(new Error("DB error"));

    await useAuthStore.getState().logout();

    // Auth state should remain unchanged on error
    expect(useAuthStore.getState().authenticated).toBe(true);
    expect(useAuthStore.getState().error).toBe("DB error");
  });
});

// ── refreshToken ───────────────────────────────────────────────────────────

describe("refreshToken", () => {
  it("updates auth state on successful refresh", async () => {
    mockedApi.refreshToken.mockResolvedValue(
      makeStatus({ authenticated: true, email: "user@test.com" }),
    );

    await useAuthStore.getState().refreshToken();

    expect(useAuthStore.getState().authenticated).toBe(true);
    expect(useAuthStore.getState().email).toBe("user@test.com");
  });

  it("handles revoked tokens gracefully", async () => {
    // Auth store should not set error for revoked tokens
    // (the backend already cleared them)
    mockedApi.refreshToken.mockResolvedValue(
      makeStatus({ authenticated: false }),
    );

    await useAuthStore.getState().refreshToken();

    expect(useAuthStore.getState().authenticated).toBe(false);
  });
});

// ── clearError ─────────────────────────────────────────────────────────────

describe("clearError", () => {
  it("clears the error message", () => {
    useAuthStore.setState({ error: "Something went wrong" });
    useAuthStore.getState().clearError();
    expect(useAuthStore.getState().error).toBeNull();
  });
});
