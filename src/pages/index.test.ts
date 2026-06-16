import { describe, it, expect } from "vitest";
import * as pages from "./index";

describe("pages barrel exports", () => {
  it("exports DocumentationPage", () => {
    expect(pages.DocumentationPage).toBeDefined();
    expect(typeof pages.DocumentationPage).toBe("function");
  });

  it("exports ChangelogPage", () => {
    expect(pages.ChangelogPage).toBeDefined();
    expect(typeof pages.ChangelogPage).toBe("function");
  });

  it("exports AboutPage", () => {
    expect(pages.AboutPage).toBeDefined();
    expect(typeof pages.AboutPage).toBe("function");
  });
});
