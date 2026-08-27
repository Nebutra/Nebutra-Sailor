import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Command, CommanderError } from "commander";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { registerAiCommand } from "../src/commands/ai.js";
import { ExitCode } from "../src/utils/exit-codes.js";
import { createTempDir } from "./helpers.js";

async function runAiCommand(args: string[]): Promise<{ stdout: string; exitCode: number }> {
  const program = new Command();
  let stdout = "";
  const originalLog = console.log;

  program.exitOverride();
  registerAiCommand(program);
  console.log = (message?: unknown) => {
    stdout += `${String(message)}\n`;
  };

  try {
    await program.parseAsync(["node", "nebutra", ...args]);
    return { stdout, exitCode: ExitCode.SUCCESS };
  } catch (error) {
    if (error instanceof CommanderError) {
      return { stdout, exitCode: error.exitCode };
    }
    throw error;
  } finally {
    console.log = originalLog;
  }
}

describe("ai governance commands", () => {
  let testDir: string;
  let cleanup: () => Promise<void>;
  let originalCwd: string;

  beforeEach(async () => {
    const temp = await createTempDir();
    testDir = temp.path;
    cleanup = temp.cleanup;
    originalCwd = process.cwd();
    process.chdir(testDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await cleanup();
  });

  it("enables providers and reports the provider catalog as JSON", async () => {
    const enable = await runAiCommand([
      "ai",
      "provider",
      "enable",
      "openai",
      "deepseek",
      "--env",
      "--format",
      "json",
    ]);

    expect(enable.exitCode).toBe(ExitCode.SUCCESS);

    const config = JSON.parse(await readFile(join(testDir, "nebutra.config.json"), "utf-8"));
    expect(config.ai.providers.openai.enabled).toBe(true);
    expect(config.ai.providers.deepseek.enabled).toBe(true);
    expect(config.ai.providers.openai.envVars).toContain("OPENAI_API_KEY");
    expect(config.ai.providers.deepseek.envVars).toContain("DEEPSEEK_API_KEY");

    const list = await runAiCommand(["ai", "provider", "list", "--format", "json"]);
    expect(list.exitCode).toBe(ExitCode.SUCCESS);

    const output = JSON.parse(list.stdout);
    expect(output.enabledCount).toBe(2);
    expect(output.totalProviders).toBeGreaterThan(4);
    expect(output.providers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "openai", enabled: true }),
        expect.objectContaining({ id: "deepseek", enabled: true }),
      ]),
    );
  });

  it("initializes gateway governance and stores route policies", async () => {
    const gateway = await runAiCommand(["ai", "gateway", "init", "--format", "json"]);
    expect(gateway.exitCode).toBe(ExitCode.SUCCESS);

    const route = await runAiCommand([
      "ai",
      "route",
      "set",
      "chat",
      "--policy",
      "cost-latency-balanced",
      "--fallback",
      "openai:gpt-5.4,deepseek:deepseek-chat",
      "--format",
      "json",
    ]);
    expect(route.exitCode).toBe(ExitCode.SUCCESS);

    const config = JSON.parse(await readFile(join(testDir, "nebutra.config.json"), "utf-8"));
    expect(config.ai.gateway.enabled).toBe(true);
    expect(config.ai.routes.chat.policy).toBe("cost-latency-balanced");
    expect(config.ai.routes.chat.fallback).toEqual(["openai:gpt-5.4", "deepseek:deepseek-chat"]);

    const routes = await runAiCommand(["ai", "route", "list", "--format", "json"]);
    expect(routes.exitCode).toBe(ExitCode.SUCCESS);
    expect(JSON.parse(routes.stdout).routes).toEqual([
      expect.objectContaining({ name: "chat", policy: "cost-latency-balanced" }),
    ]);
  });
});
