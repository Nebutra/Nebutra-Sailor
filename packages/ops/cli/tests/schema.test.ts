import { describe, expect, it } from "vitest";
import { runCli } from "./helpers.js";

describe("schema command", () => {
  const registeredCommands = [
    "init",
    "add",
    "create",
    "mcp",
    "schema",
    "brand",
    "i18n",
    "infra",
    "env",
    "license",
    "ai",
    "auth",
    "billing",
    "stats",
    "db",
    "generate",
    "preset",
    "dev",
    "test",
    "admin",
    "community",
    "growth",
    "ecosystem",
    "services",
    "search",
    "secrets",
    "completions",
    "doctor",
  ];

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
    expect(schema.commands.find((command) => command.name === "create")?.description).toContain(
      "topology-first",
    );
    expect(schema.commands.find((command) => command.name === "ai")?.description).toContain(
      "gateway",
    );
    expect(
      schema.commands.find((command) => command.name === "ecosystem")?.description,
    ).not.toMatch(/OPC/);
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
    expect(schema.description).toContain("registry-backed");
    expect(schema.options.some((option) => option.flags.includes("--21st"))).toBe(true);
  });

  it("exposes the current create-sailor flag domains", async () => {
    const result = await runCli(["schema", "create"]);

    expect(result.exitCode).toBe(0);

    const schema = JSON.parse(result.stdout) as {
      name: string;
      options: Array<{ flags: string }>;
      extensions?: {
        valueDomains?: Record<string, string[]>;
        aliases?: Record<string, Record<string, string>>;
      };
    };

    expect(schema.name).toBe("create");
    expect(schema.options.some((option) => option.flags.includes("--queue"))).toBe(true);
    expect(schema.options.some((option) => option.flags.includes("--storage"))).toBe(true);
    expect(schema.extensions?.valueDomains?.storage).toContain("supabase-storage");
    expect(schema.extensions?.valueDomains?.cache).toContain("upstash-redis");
    expect(schema.extensions?.aliases?.storage?.supabase).toBe("supabase-storage");
  });

  it("exposes expanded local feature domains for add", async () => {
    const result = await runCli(["schema", "add"]);

    expect(result.exitCode).toBe(0);

    const schema = JSON.parse(result.stdout) as {
      extensions?: {
        valueDomains?: {
          components?: string[];
          provider?: string[];
        };
      };
    };

    expect(schema.extensions?.valueDomains?.components).toEqual(
      expect.arrayContaining(["queue", "search", "cache", "webhooks", "captcha"]),
    );
    expect(schema.extensions?.valueDomains?.provider).toEqual(
      expect.arrayContaining(["upstash-redis", "svix", "turnstile"]),
    );
  });
});
