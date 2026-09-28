import { randomBytes } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ExitCode } from "../src/utils/exit-codes.js";
import { runCliInDir } from "./helpers.js";

/**
 * Regression tests for the "customer path" root-resolution bug: when
 * `nebutra` is installed as a dependency (or run via `npx`) inside a project
 * scaffolded by create-sailor, the project does not contain the CLI's own
 * source — it only has the CLI in node_modules. `findMonorepoRoot()` used to
 * walk up from `import.meta.url` (the CLI's own install location under
 * node_modules/nebutra/dist), so every delegating command silently resolved
 * to the wrong directory instead of the project the user is actually in.
 *
 * These tests spawn the BUILT CLI (dist/index.js — see tests/helpers.ts)
 * with `cwd` set to a temp directory that lives entirely outside this
 * monorepo (os.tmpdir(), never under packages/ops/cli), proving root
 * resolution walks up from the invocation directory, not the CLI's location.
 */
describe("project root resolution (built CLI, outside the monorepo)", () => {
  let projectDir: string;

  beforeEach(async () => {
    const randomId = randomBytes(6).toString("hex");
    projectDir = join(tmpdir(), `nebutra-root-resolution-${randomId}`);
    await mkdir(projectDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(projectDir, { recursive: true, force: true });
  });

  it("`doctor` finds the temp project's own nebutra.config.json, not the CLI's", async () => {
    await writeFile(
      join(projectDir, "nebutra.config.json"),
      JSON.stringify({ stack: "sailor-2026-09" }, null, 2),
    );
    await writeFile(join(projectDir, "package.json"), JSON.stringify({ name: "temp-project" }));

    const result = await runCliInDir(["doctor"], projectDir);

    // Must not hang (helpers.ts already enforces a 30s spawn timeout) and
    // must report the marker it found in THIS directory.
    expect(result.stdout + result.stderr).toContain("nebutra.config.json found");
    expect(result.stdout + result.stderr).not.toContain("nebutra.config.json missing");
  });

  it("`env validate` reads the temp project's own .env.example, not the CLI's dist", async () => {
    await writeFile(
      join(projectDir, "nebutra.config.json"),
      JSON.stringify({ stack: "sailor-2026-09" }, null, 2),
    );
    await writeFile(join(projectDir, ".env.example"), "TEMP_PROJECT_ONLY_KEY=changeme\n");

    const result = await runCliInDir(
      ["env", "validate", "--format", "json"],
      projectDir,
      // Make sure the check can't accidentally pass via an inherited env var.
      { ...process.env, TEMP_PROJECT_ONLY_KEY: undefined },
    );

    expect(result.exitCode).toBe(ExitCode.CONFIG_ERROR);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.missing).toContain("TEMP_PROJECT_ONLY_KEY");
  });

  it("fails fast with a clear message when run outside any project (never hangs)", async () => {
    // No nebutra.config.json, no pnpm-workspace.yaml, no package.json with
    // "workspaces" anywhere above this directory (os.tmpdir() is a safe bet).
    const result = await runCliInDir(["doctor"], projectDir);

    expect(result.exitCode).not.toBe(ExitCode.SUCCESS);
    expect(result.stdout + result.stderr).toMatch(/could not find a nebutra project root/i);
    expect(result.stdout + result.stderr).toMatch(/create-sailor/i);
  });
});
