import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { applyScaffoldBrand, brandNameFromProject, PENDING_BRAND_FILE } from "./brand";

describe("brandNameFromProject", () => {
  it("title-cases package-style names", () => {
    expect(brandNameFromProject("acme-rocket")).toBe("Acme Rocket");
    expect(brandNameFromProject("my_app")).toBe("My App");
    expect(brandNameFromProject("my.cool.app")).toBe("My Cool App");
  });

  it("drops an npm scope and keeps inner capitals", () => {
    expect(brandNameFromProject("@acme/rocket")).toBe("Rocket");
    expect(brandNameFromProject("myApp")).toBe("MyApp");
  });

  it("cases known acronyms", () => {
    expect(brandNameFromProject("ai-studio")).toBe("AI Studio");
    expect(brandNameFromProject("hr-saas")).toBe("HR SaaS");
  });

  it("never returns an empty name", () => {
    expect(brandNameFromProject("---")).toBe("My App");
  });
});

describe("applyScaffoldBrand", () => {
  let dir: string | undefined;
  afterEach(() => {
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
  });

  it("leaves the name for the first pnpm dev when the pipeline cannot run", () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-brand-"));
    const result = applyScaffoldBrand(dir, "Acme Rocket", "definitely-not-a-package-manager");
    expect(result.applied).toBe(false);
    const pending = JSON.parse(fs.readFileSync(path.join(dir, PENDING_BRAND_FILE), "utf8"));
    expect(pending).toEqual({ name: "Acme Rocket" });
  });
});
