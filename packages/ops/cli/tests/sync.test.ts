import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ExitCode } from "../src/utils/exit-codes.js";
import { runCliInDir } from "./helpers.js";

// Keep the child process runnable (PATH/HOME/etc.) without inheriting the
// host shell's own provider secrets — otherwise a dev machine or CI runner
// with e.g. OPENAI_API_KEY already exported would make these tests flaky.
const ENV_ALLOWLIST = ["PATH", "HOME", "TMPDIR", "TEMP", "TMP", "SystemRoot", "windir"];
const ISOLATED_ENV: Record<string, string | undefined> = Object.fromEntries(
  ENV_ALLOWLIST.filter((key) => process.env[key] !== undefined).map((key) => [
    key,
    process.env[key],
  ]),
);

const SAMPLE_CONFIG = {
  stack: "sailor-2026-09",
  capabilities: ["auth", "billing", "email", "notifications", "mcp"],
};

describe("sync command", () => {
  let testDir: string;

  beforeEach(async () => {
    const randomId = randomBytes(6).toString("hex");
    testDir = join(tmpdir(), `nebutra-sync-test-${randomId}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("errors when no nebutra.config.json is found", async () => {
    const result = await runCliInDir(["sync", "--json"], testDir, ISOLATED_ENV);
    expect(result.exitCode).toBe(ExitCode.CONFIG_ERROR);
  });

  it("errors on unknown capabilities, listing valid names", async () => {
    await writeFile(
      join(testDir, "nebutra.config.json"),
      `${JSON.stringify({ stack: "x", capabilities: ["auth", "not-a-real-capability"] }, null, 2)}\n`,
    );

    const result = await runCliInDir(["sync", "--json"], testDir, ISOLATED_ENV);

    expect(result.exitCode).toBe(ExitCode.CONFIG_ERROR);
    expect(result.stderr).toContain("not-a-real-capability");
    expect(result.stderr).toContain("auth");
  });

  it("adds missing keys to .env.example, grouped by capability/provider, and creates .env.local", async () => {
    await writeFile(
      join(testDir, "nebutra.config.json"),
      `${JSON.stringify(SAMPLE_CONFIG, null, 2)}\n`,
    );

    const result = await runCliInDir(["sync", "--json"], testDir, ISOLATED_ENV);
    expect(result.exitCode).toBe(ExitCode.SUCCESS);

    const payload = JSON.parse(result.stdout) as {
      added: Record<string, string[]>;
      unchanged: string[];
      warnings: string[];
    };

    expect(payload.added[".env.example"]).toEqual(
      expect.arrayContaining(["BETTER_AUTH_SECRET", "STRIPE_SECRET_KEY", "RESEND_API_KEY"]),
    );
    expect(payload.added[".env.local"]).toEqual([]);
    expect(payload.warnings).toEqual([]);

    const envExample = await readFile(join(testDir, ".env.example"), "utf-8");
    expect(envExample).toContain("# auth (better-auth)");
    expect(envExample).toContain("BETTER_AUTH_SECRET=");
    expect(envExample).toContain("# billing (stripe)");
    expect(envExample).toContain("STRIPE_SECRET_KEY=");
    // notifications/mcp have no env keys — should not appear as a group
    expect(envExample).not.toContain("# notifications");
    expect(envExample).not.toContain("# mcp");

    expect(existsSync(join(testDir, ".env.local"))).toBe(true);
    const envLocal = await readFile(join(testDir, ".env.local"), "utf-8");
    expect(envLocal).toContain("nebutra sync");
    // sync never adds keys to .env.local
    expect(envLocal).not.toContain("=");
  });

  it("is idempotent — a second run reports nothing added", async () => {
    await writeFile(
      join(testDir, "nebutra.config.json"),
      `${JSON.stringify(SAMPLE_CONFIG, null, 2)}\n`,
    );

    const first = await runCliInDir(["sync", "--json"], testDir, ISOLATED_ENV);
    expect(first.exitCode).toBe(ExitCode.SUCCESS);
    const firstEnvExample = await readFile(join(testDir, ".env.example"), "utf-8");

    const second = await runCliInDir(["sync", "--json"], testDir, ISOLATED_ENV);
    expect(second.exitCode).toBe(ExitCode.SUCCESS);

    const payload = JSON.parse(second.stdout) as {
      added: Record<string, string[]>;
      unchanged: string[];
    };
    expect(payload.added[".env.example"]).toBeUndefined();
    expect(payload.added[".env.local"]).toBeUndefined();
    expect(payload.unchanged.length).toBeGreaterThan(0);

    const secondEnvExample = await readFile(join(testDir, ".env.example"), "utf-8");
    expect(secondEnvExample).toBe(firstEnvExample);
  });

  it("preserves existing lines/comments and does not duplicate already-present keys", async () => {
    await writeFile(
      join(testDir, "nebutra.config.json"),
      `${JSON.stringify(SAMPLE_CONFIG, null, 2)}\n`,
    );
    await writeFile(
      join(testDir, ".env.example"),
      ["# hand-written header", "", "STRIPE_SECRET_KEY=", ""].join("\n"),
    );

    const result = await runCliInDir(["sync", "--json"], testDir, ISOLATED_ENV);
    expect(result.exitCode).toBe(ExitCode.SUCCESS);

    const envExample = await readFile(join(testDir, ".env.example"), "utf-8");
    expect(envExample).toContain("# hand-written header");
    // STRIPE_SECRET_KEY should appear exactly once
    expect(envExample.match(/STRIPE_SECRET_KEY=/g)?.length).toBe(1);

    const payload = JSON.parse(result.stdout) as {
      added: Record<string, string[]>;
      unchanged: string[];
    };
    expect(payload.added[".env.example"]).not.toContain("STRIPE_SECRET_KEY");
    expect(payload.unchanged).toContain("STRIPE_SECRET_KEY");
  });

  it("--dry-run writes nothing and exits with code 10", async () => {
    await writeFile(
      join(testDir, "nebutra.config.json"),
      `${JSON.stringify(SAMPLE_CONFIG, null, 2)}\n`,
    );

    const result = await runCliInDir(["sync", "--dry-run", "--json"], testDir, ISOLATED_ENV);

    expect(result.exitCode).toBe(ExitCode.DRY_RUN_OK);
    expect(existsSync(join(testDir, ".env.example"))).toBe(false);
    expect(existsSync(join(testDir, ".env.local"))).toBe(false);

    const payload = JSON.parse(result.stdout) as {
      mode: string;
      added: Record<string, string[]>;
    };
    expect(payload.mode).toBe("dry-run");
    expect(payload.added[".env.example"]).toEqual(
      expect.arrayContaining(["BETTER_AUTH_SECRET", "STRIPE_SECRET_KEY"]),
    );
  });

  it("dedupes duplicate capability names with a warning", async () => {
    await writeFile(
      join(testDir, "nebutra.config.json"),
      `${JSON.stringify({ stack: "x", capabilities: ["auth", "auth", "mcp"] }, null, 2)}\n`,
    );

    const result = await runCliInDir(["sync", "--json"], testDir, ISOLATED_ENV);

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.stderr).toContain("duplicate capability");

    const payload = JSON.parse(result.stdout) as { warnings: string[] };
    expect(payload.warnings.length).toBe(1);

    const envExample = await readFile(join(testDir, ".env.example"), "utf-8");
    // Only one auth group, not two
    expect(envExample.match(/# auth \(better-auth\)/g)?.length).toBe(1);
  });

  it("prints a hint to run `nebutra status` after syncing", async () => {
    await writeFile(
      join(testDir, "nebutra.config.json"),
      `${JSON.stringify(SAMPLE_CONFIG, null, 2)}\n`,
    );

    const result = await runCliInDir(["sync"], testDir, ISOLATED_ENV);

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.stderr).toContain("nebutra status");
  });
});
