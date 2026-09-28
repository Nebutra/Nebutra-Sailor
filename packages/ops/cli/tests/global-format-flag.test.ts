import { randomBytes } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCliInDir } from "./helpers.js";

/**
 * Regression test for a Commander interaction bug: the root `program`
 * declares a GLOBAL `--format <type>` option (used by most top-level
 * commands), and several subcommands (`brand <verb>`, `i18n <verb>`,
 * `ai ...`, `secrets <verb>`, `db <verb>`, `services <verb>`, `infra <verb>`,
 * `env <verb>`) ALSO declare their own local `--format <type>` option.
 *
 * When both a parent and a subcommand declare the same flag, Commander binds
 * a user-supplied `--format json` to the PARENT's option — never to the
 * subcommand's local one, which stays at its own default. Every one of these
 * subcommands read the merged value via `options.optsWithGlobals?.()`, but
 * `options` is the plain object Commander passes as the local `opts()`
 * snapshot — it has no `optsWithGlobals` method (that only exists on the
 * `Command` instance) — so the lookup silently always returned `undefined`,
 * and `--format json` was discarded no matter where the user typed it.
 *
 * The fix reads `command.optsWithGlobals()` from the `Command` instance
 * (Commander passes it as the action's last parameter) instead.
 *
 * This spawns the BUILT CLI (dist/index.js — see tests/helpers.ts) with a
 * temp project dir OUTSIDE the monorepo, and exercises `brand palette
 * --dry-run --format json`: `brand palette` declares its own local
 * `--format`, matching the buggy pattern this test guards against.
 */
describe("--format json reaches a subcommand with its own local --format option", () => {
  let projectDir: string;

  beforeEach(async () => {
    const randomId = randomBytes(6).toString("hex");
    projectDir = join(tmpdir(), `nebutra-format-flag-${randomId}`);
    await mkdir(projectDir, { recursive: true });
    // `brand palette --dry-run` still resolves a project root before doing
    // anything else — give it a marker so the test isolates the --format
    // bug from the (separately tested) root-resolution bug.
    await writeFile(
      join(projectDir, "nebutra.config.json"),
      JSON.stringify({ stack: "sailor-2026-09" }, null, 2),
    );
  });

  afterEach(async () => {
    await rm(projectDir, { recursive: true, force: true });
  });

  it("`brand palette --dry-run --format json` emits the JSON-wrapped result, not plain text", async () => {
    const result = await runCliInDir(
      [
        "brand",
        "palette",
        "--primary=#0033FE",
        "--secondary=#0BF1C3",
        "--dry-run",
        "--format",
        "json",
      ],
      projectDir,
    );

    // `formatOutput()` in commands/brand.ts only emits this JSON envelope
    // when `options.format === "json"` actually resolved to "json" — the
    // plain-text branch never prints a `"command": "brand:palette"` key.
    expect(result.stdout).toContain('"command": "brand:palette"');
    const jsonLine = result.stdout
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .join("\n");
    const envelopeMatch = jsonLine.match(/\{\s*"command":\s*"brand:palette"[\s\S]*?\n\}/);
    expect(envelopeMatch).toBeTruthy();
    const envelope = JSON.parse(envelopeMatch?.[0] ?? "{}");
    expect(envelope.command).toBe("brand:palette");
    expect(envelope.success).toBe(true);
  });

  it("without --format json, the same command falls back to plain text (no JSON envelope)", async () => {
    const result = await runCliInDir(
      ["brand", "palette", "--primary=#0033FE", "--secondary=#0BF1C3", "--dry-run"],
      projectDir,
    );

    expect(result.stdout).not.toContain('"command": "brand:palette"');
  });
});
