import { describe, expect, it } from "vitest";
import { buildProgram } from "../src/program.js";
import { runCli } from "./helpers.js";

describe("schema command", () => {
  const registeredCommands = buildProgram({
    version: "0.0.0-test",
    isInteractive: false,
  }).commands.map((command) => command.name());

  it("emits JSON command names with --list", async () => {
    const result = await runCli(["schema", "--list"]);

    expect(result.exitCode).toBe(0);

    const commandNames = JSON.parse(result.stdout) as string[];
    expect(commandNames).toEqual(registeredCommands);
  });

  it("emits all registered command schemas with --all", async () => {
    const result = await runCli(["schema", "--all"]);

    expect(result.exitCode).toBe(0);

    const schema = JSON.parse(result.stdout) as {
      commands: Array<{ name: string; description: string }>;
    };

    expect(schema.commands.map((command) => command.name)).toEqual(registeredCommands);
    expect(schema.commands.find((command) => command.name === "ai")?.description).toContain(
      "gateway",
    );
    expect(schema.commands.find((command) => command.name === "status")?.description).toContain(
      "readiness",
    );
  });

  it("emits JSON for a specific command", async () => {
    const result = await runCli(["schema", "status"]);

    expect(result.exitCode).toBe(0);

    const schema = JSON.parse(result.stdout) as {
      name: string;
      description: string;
      options: Array<{ flags: string }>;
    };

    expect(schema.name).toBe("status");
    expect(schema.description).toContain("readiness");
    expect(schema.options.some((option) => option.flags.includes("--json"))).toBe(true);
  });

  it("returns not-found for an unknown command", async () => {
    const result = await runCli(["schema", "nonexistent-command", "--quiet"]);

    expect(result.exitCode).toBeGreaterThan(0);
  });
});
