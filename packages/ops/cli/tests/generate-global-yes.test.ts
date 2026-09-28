import { randomBytes } from "node:crypto";
import { mkdir, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ExitCode } from "../src/utils/exit-codes.js";
import { runCliInDir } from "./helpers.js";

/**
 * Regression test for `mergeGlobalOptions()` (src/utils/commander-types.ts),
 * exercised through the BUILT CLI from a temp project dir outside the
 * monorepo — `generate app <name>` is one of the four commands
 * (dev/test/generate/e2e) that route through this shared helper.
 *
 * `generate app` declares its own local `--yes` (no default), and the root
 * program ALSO declares a global `--yes`. Before the fix, `mergeGlobalOptions`
 * spread the subcommand's own (plain, non-Command) `options` object last and
 * unconditionally — so a real `command.optsWithGlobals()`-derived value could
 * be clobbered by whichever level Commander did NOT bind the flag to. The
 * unit tests in src/utils/commander-types.test.ts pin the merge logic
 * directly (asserting the resolved `yes`/`format` values); this test proves
 * the same shadowed-flag combination — `--dry-run --yes` on a command with
 * its own local `--yes` — reaches all the way through the real, built CLI
 * without throwing, hanging, or producing a broken result, from a project
 * root resolved via the (separately fixed) `findMonorepoRootOrExit()`.
 */
describe("generate app --dry-run --yes (shadowed global/local --yes, built CLI)", () => {
  let projectDir: string;

  beforeEach(async () => {
    const randomId = randomBytes(6).toString("hex");
    const dir = join(tmpdir(), `nebutra-generate-yes-${randomId}`);
    await mkdir(dir, { recursive: true });
    // macOS resolves os.tmpdir() (/tmp/...) to /private/tmp/... on disk —
    // match what the CLI itself reports so path assertions don't false-fail.
    projectDir = await realpath(dir);
    await writeFile(
      join(projectDir, "nebutra.config.json"),
      JSON.stringify({ stack: "sailor-2026-09" }, null, 2),
    );
  });

  afterEach(async () => {
    await rm(projectDir, { recursive: true, force: true });
  });

  it("completes cleanly with both the global and local --yes present", async () => {
    const result = await runCliInDir(["generate", "app", "blog", "--dry-run", "--yes"], projectDir);

    expect(result.exitCode).toBe(ExitCode.DRY_RUN_OK);
    const output = JSON.parse(result.stdout);
    expect(output.mode).toBe("dry-run");
    expect(output.type).toBe("app");
    expect(output.location).toBe("apps/blog");
    // Every planned file lands under THIS temp project, not the CLI's own
    // install location — the root-resolution fix and the option-merge fix
    // compose correctly end to end.
    for (const file of output.files) {
      expect(file.path.startsWith(projectDir)).toBe(true);
    }
  });

  it("also completes cleanly with only the global --yes (placed before the subcommand)", async () => {
    const result = await runCliInDir(["--yes", "generate", "app", "blog", "--dry-run"], projectDir);

    expect(result.exitCode).toBe(ExitCode.DRY_RUN_OK);
    const output = JSON.parse(result.stdout);
    expect(output.type).toBe("app");
  });
});
