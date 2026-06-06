import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NavLinks from "./NavLinks";

describe("NavLinks", () => {
  it("renders three navigation link labels", () => {
    render(
      <MemoryRouter>
        <NavLinks />
      </MemoryRouter>,
    );

    expect(screen.getByText("Documentación")).toBeInTheDocument();
    expect(screen.getByText("Versiones")).toBeInTheDocument();
    expect(screen.getByText("Acerca de")).toBeInTheDocument();
  });

  it("renders each link with the correct href", () => {
    render(
      <MemoryRouter>
        <NavLinks />
      </MemoryRouter>,
    );

    expect(screen.getByText("Documentación").closest("a")).toHaveAttribute(
      "href",
      "/documentacion",
    );
    expect(screen.getByText("Versiones").closest("a")).toHaveAttribute(
      "href",
      "/versiones",
    );
    expect(screen.getByText("Acerca de").closest("a")).toHaveAttribute(
      "href",
      "/acerca-de",
    );
  });

  it("sets aria-current on the active link for /versiones", () => {
    render(
      <MemoryRouter initialEntries={["/versiones"]}>
        <NavLinks />
      </MemoryRouter>,
    );

    const versionesLink = screen.getByText("Versiones").closest("a");
    expect(versionesLink).toHaveAttribute("aria-current", "page");

    const docLink = screen.getByText("Documentación").closest("a");
    expect(docLink).not.toHaveAttribute("aria-current");
  });

  it("sets aria-current on the active link for /acerca-de", () => {
    render(
      <MemoryRouter initialEntries={["/acerca-de"]}>
        <NavLinks />
      </MemoryRouter>,
    );

    const acercaLink = screen.getByText("Acerca de").closest("a");
    expect(acercaLink).toHaveAttribute("aria-current", "page");

    const versionesLink = screen.getByText("Versiones").closest("a");
    expect(versionesLink).not.toHaveAttribute("aria-current");

    const docLink = screen.getByText("Documentación").closest("a");
    expect(docLink).not.toHaveAttribute("aria-current");
  });
});
