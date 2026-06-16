import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, Navigate } from "react-router-dom";
import TopBar from "../components/layout/TopBar";
import PageLayout from "../components/layout/PageLayout";
import DocumentationPage from "../pages/DocumentationPage";
import ChangelogPage from "../pages/ChangelogPage";
import AboutPage from "../pages/AboutPage";

// Mock stores used by TopBar
vi.mock("../stores/sync-store", () => ({
  useSyncStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      loadSyncStatus: vi.fn(),
      error: null,
      clearError: vi.fn(),
    };
    return selector ? selector(state) : state;
  },
}));

vi.mock("../stores/auth-store", () => ({
  useAuthStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      authenticated: false,
      email: null,
      isLoading: false,
      isLoginInProgress: false,
      error: null,
      startLogin: vi.fn(),
      completeLogin: vi.fn(),
      logout: vi.fn(),
      clearError: vi.fn(),
    };
    return selector ? selector(state) : state;
  },
}));

vi.mock("../stores/command-store", () => ({
  useCommandStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      dispatch: vi.fn(),
    };
    return selector ? selector(state) : state;
  },
}));

describe("Navigation integration", () => {
  function TestApp() {
    return (
      <Routes>
        <Route
          path="/"
          element={
            <div className="flex h-screen flex-col">
              <TopBar />
              <div data-testid="root-view">Root view</div>
            </div>
          }
        />
        <Route element={<PageLayout />}>
          <Route path="/documentacion" element={<DocumentationPage />} />
          <Route path="/versiones" element={<ChangelogPage />} />
          <Route path="/acerca-de" element={<AboutPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  it("navigates from root to Documentation page and renders content", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/"]}>
        <TestApp />
      </MemoryRouter>,
    );

    // Initially at root
    expect(screen.getByTestId("root-view")).toBeInTheDocument();

    // Click on Documentation nav link (visible because TopBar is rendered)
    await user.click(screen.getByText("Documentación"));

    // Should now see DocumentationPage content
    expect(
      screen.getByRole("heading", { name: /documentación/i }),
    ).toBeInTheDocument();
  });

  it("navigates between all three sub-pages", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/"]}>
        <TestApp />
      </MemoryRouter>,
    );

    // Navigate to Documentación
    await user.click(screen.getByText("Documentación"));
    expect(
      screen.getByRole("heading", { name: /documentación/i }),
    ).toBeInTheDocument();

    // Navigate to Versiones
    await user.click(screen.getByText("Versiones"));
    expect(
      screen.getByRole("heading", { name: /versiones/i }),
    ).toBeInTheDocument();

    // Navigate to Acerca de
    await user.click(screen.getByText("Acerca de"));
    expect(
      screen.getByRole("heading", { name: /acerca de/i }),
    ).toBeInTheDocument();
  });

  it("shows TopBar on every sub-page", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/"]}>
        <TestApp />
      </MemoryRouter>,
    );

    await user.click(screen.getByText("Documentación"));
    expect(screen.getByText("ClassDeck")).toBeInTheDocument();

    await user.click(screen.getByText("Versiones"));
    expect(screen.getByText("ClassDeck")).toBeInTheDocument();

    await user.click(screen.getByText("Acerca de"));
    expect(screen.getByText("ClassDeck")).toBeInTheDocument();
  });
});
