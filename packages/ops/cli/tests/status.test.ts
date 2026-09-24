import { randomBytes } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
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
  capabilities: [
    "auth",
    "billing",
    "email",
    "storage",
    "queue",
    "cache",
    "notifications",
    "webhooks",
    "ai",
    "mcp",
  ],
};

describe("status command", () => {
  let testDir: string;

  beforeEach(async () => {
    const randomId = randomBytes(6).toString("hex");
    testDir = join(tmpdir(), `nebutra-status-test-${randomId}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("errors when no nebutra.config.json is found", async () => {
    const result = await runCliInDir(["status", "--json"], testDir, ISOLATED_ENV);

    expect(result.exitCode).toBe(ExitCode.CONFIG_ERROR);
  });

  it("reports missing-key / local-fallback state with an empty environment", async () => {
    await writeFile(
      join(testDir, "nebutra.config.json"),
      `${JSON.stringify(SAMPLE_CONFIG, null, 2)}\n`,
    );

    const result = await runCliInDir(["status", "--json"], testDir, ISOLATED_ENV);

    expect(result.exitCode).toBe(ExitCode.SUCCESS);

    const payload = JSON.parse(result.stdout) as {
      stack: string;
      locale: string;
      capabilities: Array<{ name: string; state: string; provider: string[]; missing: string[] }>;
    };

    expect(payload.stack).toBe("sailor-2026-09");
    expect(payload.locale).toBe("global");

    const byName = Object.fromEntries(payload.capabilities.map((c) => [c.name, c]));
    expect(byName.billing.state).toBe("missing-key");
    expect(byName.storage.state).toBe("local-fallback");
    expect(byName.storage.provider).toEqual(["local"]);
    expect(byName.notifications.state).toBe("live");
    expect(byName.webhooks.state).toBe("live");
    expect(byName.mcp.state).toBe("live");
  });

  it("reports live state once required env keys are set via .env.local", async () => {
    await writeFile(
      join(testDir, "nebutra.config.json"),
      `${JSON.stringify(SAMPLE_CONFIG, null, 2)}\n`,
    );
    await writeFile(
      join(testDir, ".env.local"),
      ["STRIPE_SECRET_KEY=sk_test_123", "OPENAI_API_KEY=sk-test-456", "NEBUTRA_LOCALE=cn", ""].join(
        "\n",
      ),
    );

    const result = await runCliInDir(["status", "--json"], testDir, ISOLATED_ENV);

    expect(result.exitCode).toBe(ExitCode.SUCCESS);

    const payload = JSON.parse(result.stdout) as {
      locale: string;
      capabilities: Array<{ name: string; state: string; provider: string[] }>;
    };

    expect(payload.locale).toBe("cn");

    const byName = Object.fromEntries(payload.capabilities.map((c) => [c.name, c]));
    expect(byName.billing.state).toBe("live");
    expect(byName.billing.provider).toEqual(["stripe"]);
    expect(byName.ai.state).toBe("live");
    expect(byName.ai.provider).toEqual(["openai"]);

    // Never print secret values
    expect(result.stdout).not.toContain("sk_test_123");
    expect(result.stdout).not.toContain("sk-test-456");
  });

  it("renders a human-readable table without --json", async () => {
    await writeFile(
      join(testDir, "nebutra.config.json"),
      `${JSON.stringify(SAMPLE_CONFIG, null, 2)}\n`,
    );

    const result = await runCliInDir(["status"], testDir, ISOLATED_ENV);

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(result.stdout).toContain("nebutra status");
    expect(result.stdout).toContain("billing");
    expect(result.stdout).not.toContain('"capabilities"');
  });
});
