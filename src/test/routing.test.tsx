import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "../App";

// Mock the API module to avoid actual network calls during routing tests
vi.mock("../lib/api", () => ({
  createCourse: vi.fn(),
  listCourses: vi.fn().mockResolvedValue([]),
  updateCourse: vi.fn(),
  deleteCourse: vi.fn(),
  createStudent: vi.fn(),
  listStudents: vi.fn().mockResolvedValue([]),
  updateStudent: vi.fn(),
  deleteStudent: vi.fn(),
}));

describe("App routing", () => {
  it("renders main view with empty state at root route", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    expect(
      screen.getByText("Select a course to manage students"),
    ).toBeInTheDocument();
  });

  it("renders DocumentationPage content at /documentacion", () => {
    render(
      <MemoryRouter initialEntries={["/documentacion"]}>
        <App />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: /documentación/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Select a course to manage students"),
    ).not.toBeInTheDocument();
  });

  it("renders ChangelogPage content at /versiones", () => {
    render(
      <MemoryRouter initialEntries={["/versiones"]}>
        <App />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: /versiones/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Select a course to manage students"),
    ).not.toBeInTheDocument();
  });

  it("renders AboutPage content at /acerca-de", () => {
    render(
      <MemoryRouter initialEntries={["/acerca-de"]}>
        <App />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: /acerca de/i }),
    ).toBeInTheDocument();
  });

  it("redirects unknown routes to root view", () => {
    render(
      <MemoryRouter initialEntries={["/nonexistent"]}>
        <App />
      </MemoryRouter>,
    );

    expect(
      screen.getByText("Select a course to manage students"),
    ).toBeInTheDocument();
  });
});
