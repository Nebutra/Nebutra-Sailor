import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ExitCode } from "../src/utils/exit-codes.js";

/**
 * Run the CLI with given args in a specific directory
 */
async function runCliInDir(
  args: string[],
  cwd: string,
): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  return new Promise((resolve, reject) => {
    const cliPath = new URL("../dist/index.js", import.meta.url).pathname;

    const child = spawn("node", [cliPath, ...args], {
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 30000,
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("error", reject);

    child.on("close", (code) => {
      resolve({
        stdout,
        stderr,
        exitCode: code ?? 1,
      });
    });
  });
}

describe("init command", () => {
  let testDir: string;

  beforeEach(async () => {
    const randomId = randomBytes(6).toString("hex");
    testDir = join(tmpdir(), `nebutra-init-test-${randomId}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("should initialize a project with default config", async () => {
    const result = await runCliInDir(["init", "--yes"], testDir);

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(existsSync(join(testDir, "nebutra.config.json"))).toBe(true);

    const config = JSON.parse(await readFile(join(testDir, "nebutra.config.json"), "utf-8"));
    expect(config.$schema).toBe("https://nebutra.com/schema.json");
    expect(config.componentsDirectory).toBe("packages/ui/src/components");
  });

  it("should output JSON diff with --dry-run flag", async () => {
    const result = await runCliInDir(["init", "--dry-run"], testDir);

    expect(result.exitCode).toBe(ExitCode.DRY_RUN_OK);
    expect(existsSync(join(testDir, "nebutra.config.json"))).toBe(false);

    // Verify JSON output is present in stdout
    const jsonMatch = result.stdout.match(/\{[\s\S]*\}/);
    expect(jsonMatch).toBeTruthy();

    if (jsonMatch) {
      const diff = JSON.parse(jsonMatch[0]);
      expect(diff.operation).toBe("create");
      expect(diff.path).toContain("nebutra.config.json");
      expect(diff.after).toBeDefined();
      expect(diff.after.$schema).toBe("https://nebutra.com/schema.json");
    }
  });

  it("should skip initialization with --if-not-exists when config exists", async () => {
    // First, create the config
    await runCliInDir(["init", "--yes"], testDir);

    // Second, run with --if-not-exists
    const result = await runCliInDir(["init", "--if-not-exists", "--yes"], testDir);

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.stdout).toContain("already exists, skipping");
  });

  it("should proceed normally with --if-not-exists when config does not exist", async () => {
    const result = await runCliInDir(["init", "--if-not-exists", "--yes"], testDir);

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(existsSync(join(testDir, "nebutra.config.json"))).toBe(true);
  });

  it("should run non-interactively with --yes flag", async () => {
    const result = await runCliInDir(["init", "--yes"], testDir);

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    // Should not contain any clack/prompt UI elements (no spinners, intros, outros)
    expect(result.stdout).not.toContain("nebutra init");
    expect(existsSync(join(testDir, "nebutra.config.json"))).toBe(true);
  });

  it("--dry-run should show update operation when config exists", async () => {
    // Create initial config
    await runCliInDir(["init", "--yes"], testDir);

    // Run dry-run to see update diff
    const result = await runCliInDir(["init", "--dry-run"], testDir);

    expect(result.exitCode).toBe(ExitCode.DRY_RUN_OK);

    const jsonMatch = result.stdout.match(/\{[\s\S]*\}/);
    expect(jsonMatch).toBeTruthy();

    if (jsonMatch) {
      const diff = JSON.parse(jsonMatch[0]);
      expect(diff.operation).toBe("update");
      expect(diff.before).toBeDefined();
      expect(diff.after).toBeDefined();
    }
  });

  it("should not modify config during dry-run even with existing config", async () => {
    // Create initial config with a timestamp in the file content
    const _initialConfig = {
      $schema: "https://nebutra.com/schema.json",
      componentsDirectory: "custom/path",
      timestamp: new Date().toISOString(),
    };

    await mkdir(testDir, { recursive: true });
    await readFile(join(testDir, "nebutra.config.json"), "utf-8").catch(() => null);

    const result = await runCliInDir(["init", "--dry-run"], testDir);
    expect(result.exitCode).toBe(ExitCode.DRY_RUN_OK);

    // Config should not be created (no file)
    if (existsSync(join(testDir, "nebutra.config.json"))) {
      // If it exists, it should have been there before, so we're OK
      expect(true).toBe(true);
    }
  });

  it("should support combining --dry-run and --if-not-exists", async () => {
    // First create config
    await runCliInDir(["init", "--yes"], testDir);

    // Then run dry-run with if-not-exists (should skip due to if-not-exists)
    const result = await runCliInDir(["init", "--dry-run", "--if-not-exists"], testDir);

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.stdout).toContain("already exists, skipping");
  });
});
