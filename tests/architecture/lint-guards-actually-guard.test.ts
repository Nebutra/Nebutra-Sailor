/**
 * Every governance guard must fail on a violation it claims to catch.
 *
 * A guard is only ever exercised on the happy path: main is clean, the guard
 * says clean, and nobody learns whether it can say anything else. On
 * 2026-08-18 four of them had been reading zero files in CI for want of
 * ripgrep — brand-hex, arbitrary-breakpoints, defined-css-vars and
 * ui-contracts — and printing their green line the whole time. The audit gate
 * had been deciding on `pnpm audit`'s exit code, so `--audit-level=high` never
 * entered the decision. A guard that cannot fail is worse than no guard: it
 * also supplies confidence.
 *
 * So each entry here writes a file that genuinely violates the rule, runs the
 * guard, and requires a non-zero exit — then removes it and requires zero. The
 * second half matters as much as the first: a guard that fails on everything
 * would pass the first check alone.
 *
 * Adding a guard to scripts/lint-*.mjs without adding it here fails the last
 * test in this file. Skipping is allowed and must carry a reason, because an
 * unexplained gap is how this class of bug returns.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** A path inside a governed scan root that no real file occupies. */
const PROBE = "apps/design/src/__lint_guard_probe.tsx";

type Case = {
  /** Guard basename, without scripts/ or .mjs. */
  guard: string;
  /** Content that violates the rule. Must be a real violation, not a guess. */
  violation: string;
  /** Where to write it, when the guard scans somewhere other than PROBE. */
  path?: string;
  /** Override for guards whose whole-tree scan does not fit the default. */
  timeoutMs?: number;
};

const CASES: Case[] = [
  {
    // Slowest guard in the set by an order of magnitude — a single run walks
    // the whole tree in ~65s, and this case runs it twice. Worth knowing on its
    // own: every `pnpm lint` pays that, and the other seventeen finish in
    // roughly a second each.
    guard: "lint-no-lucide",
    violation: 'import { X } from "lucide-react";\n',
    timeoutMs: 240_000,
  },
  {
    guard: "lint-no-raw-inputs",
    violation: 'export const C = () => <input type="text" />;\n',
  },
  {
    // The bracket form is the one Tailwind silently drops; `p-4/50` is not a
    // violation and testing it would have reported this guard as broken.
    guard: "lint-no-spacing-opacity",
    violation: 'export const C = () => <div className="p-4/[0.04] gap-3/[0.2]" />;\n',
  },
  {
    guard: "lint-no-focus-rings",
    violation: 'export const C = () => <button type="button" className="focus:ring-2" />;\n',
  },
  {
    guard: "lint-no-forbidden-containers",
    violation: 'export const C = () => <div className="mx-auto max-w-7xl" />;\n',
  },
  {
    guard: "lint-no-brand-hex",
    violation: 'export const c = "#0033FE";\n',
  },
  {
    guard: "lint-no-arbitrary-breakpoints",
    violation: 'export const C = () => <div className="min-[600px]:flex" />;\n',
  },
];

/**
 * Guards with no case yet, each with the reason. This list is the honest part:
 * it says which rules are unverified instead of leaving them looking covered.
 */
const UNCOVERED: Record<string, string> = {
  "lint-brand-literals":
    "file-level allowlist with a shrink-only ratchet; a probe file would have to be added to the allowlist to avoid failing for the wrong reason",
  "lint-i18n-brand-literals": "scans message catalogs, not source; needs a catalog fixture",
  "lint-microcopy":
    "governs apps/web copy against a Chinese-language rule set; fixture needs a native-speaker violation to be meaningful",
  "lint-repository-seam":
    "shrink-only allowlist keyed on core-domain paths; a probe would need a matching domain entry",
  "lint-defined-css-vars":
    "resolves var() against built stylesheets; a probe needs a built CSS tree",
  "lint-ui-contracts":
    "asserts component contracts across 821 files; a single-file probe does not exercise it",
  "lint-motion-tokens": "checks token consumption ratios across the tree, not per-file violations",
  "lint-inert-dimensions": "checks that switchable dimensions have readers — a whole-tree property",
  "lint-no-dark-overrides":
    "needs a paired light/dark class to be a real violation; single-line probe is ambiguous",
  "lint-phosphor-marketing-only":
    "violation depends on path, not content; needs a probe outside the marketing roots",
  "lint-forge-hard-correct": "forge-specific correctness rules; each needs its own fixture",
};

function runGuard(guard: string): number {
  try {
    execFileSync("node", [`scripts/${guard}.mjs`], { stdio: "pipe" });
    return 0;
  } catch (error) {
    return (error as { status?: number }).status ?? 1;
  }
}

// Serial, with room: each case runs its guard twice and they share one probe
// path, so parallel execution would have them deleting each other's files. The
// 60s budget is for the slow whole-tree scanners — lint-no-lucide walks every
// source file twice per case.
describe.sequential("lint guards actually guard", () => {
  for (const testCase of CASES) {
    it(`${testCase.guard} fails on a violation and passes without it`, {
      timeout: testCase.timeoutMs ?? 60_000,
    }, () => {
      const probePath = testCase.path ?? PROBE;
      try {
        writeFileSync(probePath, testCase.violation);
        expect(
          runGuard(testCase.guard),
          `${testCase.guard} accepted a file that violates it — the guard reports clean ` +
            `on input it exists to reject. Probe:\n${testCase.violation}`,
        ).not.toBe(0);
      } finally {
        rmSync(probePath, { force: true });
      }

      expect(
        runGuard(testCase.guard),
        `${testCase.guard} fails on a clean tree, so its verdict carries no information`,
      ).toBe(0);
    });
  }

  it("every guard is either covered or listed as uncovered, with a reason", () => {
    const guards = readdirSync("scripts")
      .filter((f) => f.startsWith("lint-") && f.endsWith(".mjs"))
      .map((f) => f.replace(/\.mjs$/, ""));

    const covered = new Set(CASES.map((c) => c.guard));
    const unaccounted = guards.filter((g) => !covered.has(g) && !(g in UNCOVERED));

    expect(
      unaccounted,
      `These guards have neither a failing-case test nor an entry in UNCOVERED:\n` +
        `${unaccounted.map((g) => `  ${g}`).join("\n")}\n\n` +
        `Add a case that makes the guard fail, or an UNCOVERED entry saying why not. ` +
        `A guard nobody has seen fail is a guard nobody knows works.`,
    ).toEqual([]);

    // The reverse: an UNCOVERED entry for a guard that no longer exists hides
    // the fact that its rule left the repo.
    const stale = Object.keys(UNCOVERED).filter((g) => !guards.includes(g));
    expect(stale, `UNCOVERED names guards that no longer exist: ${stale.join(", ")}`).toEqual([]);
  });

  it("the probe path is not a real file", () => {
    // If someone ever commits this path, the cases above would delete it.
    expect(existsSync(join(process.cwd(), PROBE))).toBe(false);
  });
});
