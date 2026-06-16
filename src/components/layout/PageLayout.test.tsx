import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import PageLayout from "./PageLayout";

describe("PageLayout", () => {
  it("renders TopBar with navigation links", () => {
    render(
      <MemoryRouter initialEntries={["/test-page"]}>
        <Routes>
          <Route element={<PageLayout />}>
            <Route path="/test-page" element={<div>Test content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("ClassDeck")).toBeInTheDocument();
    expect(screen.getByText("Documentación")).toBeInTheDocument();
    expect(screen.getByText("Versiones")).toBeInTheDocument();
    expect(screen.getByText("Acerca de")).toBeInTheDocument();
  });

  it("renders outlet content below TopBar", () => {
    render(
      <MemoryRouter initialEntries={["/test-page"]}>
        <Routes>
          <Route element={<PageLayout />}>
            <Route
              path="/test-page"
              element={<div data-testid="outlet-content">Page content</div>}
            />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("outlet-content")).toHaveTextContent(
      "Page content",
    );
  });

  it("shows Suspense fallback for ThreeDecorations", () => {
    render(
      <MemoryRouter initialEntries={["/test-page"]}>
        <Routes>
          <Route element={<PageLayout />}>
            <Route path="/test-page" element={<div>Test</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    // The Suspense fallback is a div with h-32 class
    const fallbackDiv = document.querySelector(".h-32");
    expect(fallbackDiv).toBeInTheDocument();
  });

  it("has flex h-screen flex-col wrapper class", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/test-page"]}>
        <Routes>
          <Route element={<PageLayout />}>
            <Route path="/test-page" element={<div>Test</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("flex");
  });
});
