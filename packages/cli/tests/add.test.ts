import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ExitCode } from "../src/utils/exit-codes.js";
import { runCliInDir } from "./helpers.js";

describe("add command", () => {
  let testDir: string;

  beforeEach(async () => {
    const randomId = randomBytes(6).toString("hex");
    testDir = join(tmpdir(), `nebutra-add-test-${randomId}`);
    await mkdir(testDir, { recursive: true });
    await writeFile(
      join(testDir, "package.json"),
      `${JSON.stringify({ name: "fixture-app", private: true, version: "0.0.0" }, null, 2)}\n`,
      "utf8",
    );
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("shows a registry-backed dry-run plan for local features", async () => {
    const result = await runCliInDir(
      ["add", "queue", "--provider", "upstash", "--dry-run"],
      testDir,
    );

    expect(result.exitCode).toBe(ExitCode.DRY_RUN_OK);

    const plan = JSON.parse(result.stdout) as {
      planType: string;
      features: Array<{ name: string; provider?: string }>;
      operations: Array<{ type: string; relativePath?: string }>;
    };

    expect(plan.planType).toBe("local-feature-install");
    expect(plan.features).toEqual([
      expect.objectContaining({ name: "queue", provider: "upstash" }),
    ]);
    expect(plan.operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "write-file",
          relativePath: "packages/queue/src/index.ts",
        }),
        expect.objectContaining({ type: "merge-env", relativePath: ".env.local" }),
        expect.objectContaining({ type: "update-package-json", relativePath: "package.json" }),
      ]),
    );
  });

  it("installs local feature files, env placeholders, and dependencies", async () => {
    const result = await runCliInDir(["add", "queue", "--provider", "upstash", "--yes"], testDir);

    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    expect(existsSync(join(testDir, "packages/queue/src/index.ts"))).toBe(true);
    expect(existsSync(join(testDir, "packages/queue/README.md"))).toBe(true);
    expect(existsSync(join(testDir, ".env.local"))).toBe(true);

    const envFile = await readFile(join(testDir, ".env.local"), "utf8");
    expect(envFile).toContain("QSTASH_TOKEN=");
    expect(envFile).toContain("QSTASH_CURRENT_SIGNING_KEY=");

    const packageJson = JSON.parse(await readFile(join(testDir, "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
    };
    expect(packageJson.dependencies).toMatchObject({
      "@upstash/qstash": "latest",
    });
  });
});
