import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TopBar from "./TopBar";

function createMockStore(initial: Record<string, unknown>) {
  return (selector?: (state: Record<string, unknown>) => unknown) => {
    return selector ? selector(initial) : initial;
  };
}

vi.mock("../../stores/sync-store", () => ({
  useSyncStore: createMockStore({
    loadSyncStatus: vi.fn(),
    error: null,
    clearError: vi.fn(),
  }),
}));

vi.mock("../../stores/auth-store", () => ({
  useAuthStore: createMockStore({
    authenticated: false,
    email: null,
    isLoading: false,
    isLoginInProgress: false,
    error: null,
    startLogin: vi.fn(),
    completeLogin: vi.fn(),
    logout: vi.fn(),
    clearError: vi.fn(),
  }),
}));

vi.mock("../../stores/command-store", () => ({
  useCommandStore: createMockStore({
    dispatch: vi.fn(),
  }),
}));

describe("TopBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders logo and title", () => {
    render(
      <MemoryRouter>
        <TopBar />
      </MemoryRouter>,
    );

    expect(screen.getByText("ClassDeck")).toBeInTheDocument();
    expect(screen.getByAltText("ClassDeck")).toBeInTheDocument();
  });

  it("renders NavLinks with three navigation items", () => {
    render(
      <MemoryRouter>
        <TopBar />
      </MemoryRouter>,
    );

    expect(screen.getByText("Documentación")).toBeInTheDocument();
    expect(screen.getByText("Versiones")).toBeInTheDocument();
    expect(screen.getByText("Acerca de")).toBeInTheDocument();
  });

  it("renders login button when not authenticated", () => {
    render(
      <MemoryRouter>
        <TopBar />
      </MemoryRouter>,
    );

    expect(screen.getByText("Sign in with Google")).toBeInTheDocument();
  });
});
