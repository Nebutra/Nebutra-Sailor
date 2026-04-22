import { describe, expect, it } from "vitest";
import { runCli } from "./helpers.js";

describe("schema command", () => {
  it("emits JSON command names with --list", async () => {
    const result = await runCli(["schema", "--list"]);

    expect(result.exitCode).toBe(0);

    const commandNames = JSON.parse(result.stdout) as string[];
    expect(commandNames).toContain("init");
    expect(commandNames).toContain("add");
    expect(commandNames).toContain("schema");
  });

  it("emits JSON for a specific command", async () => {
    const result = await runCli(["schema", "add"]);

    expect(result.exitCode).toBe(0);

    const schema = JSON.parse(result.stdout) as {
      name: string;
      description: string;
      options: Array<{ flags: string }>;
    };

    expect(schema.name).toBe("add");
    expect(schema.description).toContain("Add a component or feature");
    expect(schema.options.some((option) => option.flags.includes("--21st"))).toBe(true);
  });
});
