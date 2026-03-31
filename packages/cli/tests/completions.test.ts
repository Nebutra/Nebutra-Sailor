import { describe, expect, it } from "vitest";
import { runCli } from "./helpers.js";

describe("Completions Command", () => {
  it("should generate bash completions", async () => {
    const result = await runCli(["completions", "bash"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("_nebutra_completions");
    expect(result.stdout).toContain("complete -o bashdefault");
    expect(result.stdout).toContain("COMPREPLY");
  });

  it("should generate zsh completions", async () => {
    const result = await runCli(["completions", "zsh"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("#compdef nebutra");
    expect(result.stdout).toContain("_nebutra()");
    expect(result.stdout).toContain("init:");
    expect(result.stdout).toContain("add:");
  });

  it("should generate fish completions", async () => {
    const result = await runCli(["completions", "fish"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("complete -c nebutra");
    expect(result.stdout).toContain("nebutra");
    // Fish completions should have command definitions
    expect(result.stdout.length).toBeGreaterThan(100);
  });

  it("should show help for completions command", async () => {
    const result = await runCli(["completions", "--help"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Generate");
  });

  it("bash completions should include known commands", async () => {
    const result = await runCli(["completions", "bash"]);

    expect(result.stdout).toContain("init");
    expect(result.stdout).toContain("add");
    expect(result.stdout).toContain("create");
  });

  it("zsh completions should include command descriptions", async () => {
    const result = await runCli(["completions", "zsh"]);

    expect(result.stdout).toContain("Initialize a Nebutra project");
    expect(result.stdout).toContain("Add a component");
  });

  it("fish completions should include all subcommands", async () => {
    const result = await runCli(["completions", "fish"]);

    expect(result.stdout).toContain("init");
    expect(result.stdout).toContain("add");
    expect(result.stdout).toContain("create");
    expect(result.stdout).toContain("doctor");
  });
});
