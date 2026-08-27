import { describe, expect, it } from "vitest";
import { buildProgram } from "../src/program.js";
import { runCli } from "./helpers.js";

const registeredCommands = buildProgram({
  version: "0.0.0-test",
  isInteractive: false,
}).commands.map((command) => command.name());

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

    for (const command of registeredCommands) {
      expect(result.stdout).toContain(command);
    }
    expect(result.stdout).not.toContain("preset");
  });

  it("zsh completions should include command descriptions", async () => {
    const result = await runCli(["completions", "zsh"]);

    expect(result.stdout).toContain("Initialize a Nebutra project");
    expect(result.stdout).toContain("registry-backed platform feature");
    expect(result.stdout).toContain("AI provider and gateway");
    expect(result.stdout).toContain("Template marketplace, ideas, showcase");
  });

  it("fish completions should include all subcommands", async () => {
    const result = await runCli(["completions", "fish"]);

    for (const command of registeredCommands) {
      expect(result.stdout).toContain(command);
    }
    expect(result.stdout).not.toContain("preset");
  });
});
