import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ChangelogPage from "./ChangelogPage";

describe("ChangelogPage", () => {
  it("renders the main heading", () => {
    render(<ChangelogPage />);
    expect(
      screen.getByRole("heading", { name: /versiones/i }),
    ).toBeInTheDocument();
  });

  it("renders version 0.1.0 entry", () => {
    render(<ChangelogPage />);
    expect(screen.getByText(/0\.1\.0/)).toBeInTheDocument();
  });

  it("renders at least one changelog entry with a date", () => {
    render(<ChangelogPage />);
    // Check that there is at least one date element
    const dateElements = document.querySelectorAll("time");
    expect(dateElements.length).toBeGreaterThanOrEqual(1);
  });

  it("renders initial release entry", () => {
    render(<ChangelogPage />);
    expect(
      screen.getByText(/lanzamiento inicial/i),
    ).toBeInTheDocument();
  });
});
