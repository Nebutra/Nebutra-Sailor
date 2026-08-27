import { afterEach, describe, expect, it, vi } from "vitest";
import { showDone } from "./done";

describe("showDone", () => {
  const originalNoColor = process.env.NO_COLOR;

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalNoColor === undefined) {
      delete process.env.NO_COLOR;
    } else {
      process.env.NO_COLOR = originalNoColor;
    }
  });

  it("prints a short golden path with db steps when database is enabled", () => {
    process.env.NO_COLOR = "1";

    let output = "";
    vi.spyOn(process.stdout, "write").mockImplementation(((chunk: string | Uint8Array) => {
      output += String(chunk);
      return true;
    }) as typeof process.stdout.write);

    showDone({
      elapsedSec: 12,
      targetDir: "demo-app",
      packageManager: "pnpm",
      skippedInstall: true,
      hasDatabase: true,
    });

    expect(output).toContain("cd demo-app");
    expect(output).toContain("pnpm install");
    expect(output).toContain("pnpm db:migrate");
    expect(output).toContain("pnpm dev");
    expect(output).toContain("nebutra doctor");
    // Advanced noise removed from golden path
    expect(output).not.toContain("pnpm brand:init");
    expect(output).not.toContain("pnpm audit");
    expect(output).not.toContain("Free license");
  });

  it("omits db steps when database is none", () => {
    process.env.NO_COLOR = "1";

    let output = "";
    vi.spyOn(process.stdout, "write").mockImplementation(((chunk: string | Uint8Array) => {
      output += String(chunk);
      return true;
    }) as typeof process.stdout.write);

    showDone({
      elapsedSec: 3,
      targetDir: "demo-app",
      skippedInstall: false,
      hasDatabase: false,
    });

    expect(output).not.toContain("db:migrate");
    expect(output).not.toContain("infra:up");
    expect(output).toContain("pnpm dev");
  });

  it("skips cd when scaffolded into the current directory", () => {
    process.env.NO_COLOR = "1";

    let output = "";
    vi.spyOn(process.stdout, "write").mockImplementation(((chunk: string | Uint8Array) => {
      output += String(chunk);
      return true;
    }) as typeof process.stdout.write);

    showDone({
      elapsedSec: 3,
      targetDir: ".",
      skippedInstall: false,
      hasDatabase: true,
    });

    expect(output).toContain("· .");
    expect(output).not.toMatch(/cd \./);
  });
});
