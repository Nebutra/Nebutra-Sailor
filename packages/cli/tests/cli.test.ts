import { describe, expect, it } from "vitest";
import { runCli } from "./helpers.js";

describe("CLI", () => {
  it("should output version with --version", async () => {
    const result = await runCli(["--version"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("0.1.0");
  });

  it("should show help text with --help", async () => {
    const result = await runCli(["--help"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Nebutra — unified CLI");
    expect(result.stdout).toContain("init");
    expect(result.stdout).toContain("add");
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

  it("should handle add command with --help", async () => {
    const result = await runCli(["add", "--help"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Add a component or feature to your project");
  });

  it("should handle create command with --help", async () => {
    const result = await runCli(["create", "--help"]);

    expect(result.exitCode).toBe(0);
    // Create command help should be shown
    expect(result.stdout.length).toBeGreaterThan(0);
  });

  it("should show error for unknown command", async () => {
    const result = await runCli(["nonexistent-command"]);

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr.length > 0 || result.stdout.length > 0).toBe(true);
  });

  it("should list all available commands in help", async () => {
    const result = await runCli(["--help"]);

    expect(result.stdout).toContain("init");
    expect(result.stdout).toContain("add");
    expect(result.stdout).toContain("Commands:");
  });
});
