import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { runCli } from "./helpers.js";

const PKG_VERSION = (
  JSON.parse(
    readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "package.json"), "utf8"),
  ) as { version: string }
).version;

describe("CLI", () => {
  it("should output version with --version", async () => {
    const result = await runCli(["--version"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(PKG_VERSION);
  });

  it("should show help text with --help", async () => {
    const result = await runCli(["--help"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Nebutra — the CLI for Sailor projects");
    expect(result.stdout).toContain("init");
    expect(result.stdout).toContain("status");
  });

  it("should show usage information when run without args", async () => {
    const result = await runCli([]);

    expect(result.stdout).toBeDefined();
    expect(result.stdout.length).toBeGreaterThan(0);
  });

  it("should handle init command with --help", async () => {
    const result = await runCli(["init", "--help"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Initialize a Nebutra project");
  });

  it("should handle status command with --help", async () => {
    const result = await runCli(["status", "--help"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("capability readiness");
  });

  it("should show error for unknown command", async () => {
    const result = await runCli(["nonexistent-command"]);

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr.length > 0 || result.stdout.length > 0).toBe(true);
  });

  it("should list all available commands in help", async () => {
    const result = await runCli(["--help"]);

    expect(result.stdout).toContain("init");
    expect(result.stdout).toContain("status");
    expect(result.stdout).toContain("Commands:");
  });
});
