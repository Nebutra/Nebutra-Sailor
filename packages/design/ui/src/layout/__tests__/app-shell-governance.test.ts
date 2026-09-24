import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const APP_SHELL = join(process.cwd(), "src/layout/app-shell.tsx");

describe("AppShell layout governance", () => {
  it("pins dashboard chrome to the viewport while main content scrolls", () => {
    const source = readFileSync(APP_SHELL, "utf8");

    expect(source).toContain("h-dvh");
    expect(source).not.toContain("min-h-dvh");
    expect(source).toContain("min-h-0");
    expect(source).toContain("flex-1 overflow-y-auto");
  });
});
