import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AboutPage from "./AboutPage";

describe("AboutPage", () => {
  it("renders the main heading", () => {
    render(<AboutPage />);
    expect(
      screen.getByRole("heading", { name: /acerca de/i }),
    ).toBeInTheDocument();
  });

  it("renders the project description section", () => {
    render(<AboutPage />);
    expect(
      screen.getByRole("heading", { name: /classdeck/i }),
    ).toBeInTheDocument();
  });

  it("renders the tech stack section", () => {
    render(<AboutPage />);
    expect(
      screen.getByRole("heading", { name: /tecnologías/i }),
    ).toBeInTheDocument();
  });

  it("renders the credits section", () => {
    render(<AboutPage />);
    expect(
      screen.getByRole("heading", { name: /créditos/i }),
    ).toBeInTheDocument();
  });
});
