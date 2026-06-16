import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DocumentationPage from "./DocumentationPage";

describe("DocumentationPage", () => {
  it("renders the main heading", () => {
    render(<DocumentationPage />);
    expect(
      screen.getByRole("heading", { name: /documentación/i }),
    ).toBeInTheDocument();
  });

  it("renders the feature overview section", () => {
    render(<DocumentationPage />);
    expect(
      screen.getByRole("heading", { name: /funcionalidades/i }),
    ).toBeInTheDocument();
  });

  it("renders keyboard shortcuts section", () => {
    render(<DocumentationPage />);
    expect(
      screen.getByRole("heading", { name: /atajos de teclado/i }),
    ).toBeInTheDocument();
  });

  it("renders architecture overview section", () => {
    render(<DocumentationPage />);
    expect(
      screen.getByRole("heading", { name: /arquitectura/i }),
    ).toBeInTheDocument();
  });

  it("renders how-to guide section", () => {
    render(<DocumentationPage />);
    expect(
      screen.getByRole("heading", { name: /cómo empezar/i }),
    ).toBeInTheDocument();
  });
});
