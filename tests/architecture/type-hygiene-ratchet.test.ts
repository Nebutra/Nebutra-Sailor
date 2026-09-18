/**
 * Shrink-only ratchets for type-hygiene tech debt (#232).
 *
 * Counts bare `as any` / `@ts-expect-error` / `@ts-expect-error` / `@ts-nocheck`
 * in production TypeScript (excludes tests, dist, node_modules, templates,
 * and generated Prisma client). The baseline may only go down.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "../..");

/** Recorded 2026-07-24 after CLI residual cleanup. Shrink-only. */
const AS_ANY_BASELINE = 59;

const PATTERN = /\bas any\b|@ts-ignore|@ts-expect-error|@ts-nocheck/g;

/** Directories whose TypeScript is generated or vendored, not authored here. */
const SKIP_SEGMENT = [
  "node_modules/",
  "dist/",
  ".next/",
  "coverage/",
  "generated/",
  "templates/",
  ".turbo/",
  ".source/",
];

/**
 * Production TypeScript tracked by git.
 *
 * This walked the filesystem with a hardcoded skip list until 2026-09-18. That
 * counts anything sitting in the working directory, so four local copies of
 * this repo (multi-agent scratch trees, untracked) pushed the measurement to
 * 249 against a baseline of 59 — a red ratchet locally, green in CI, about
 * code that was never in the repo.
 *
 * `git ls-files` is the same source of truth template-boundary uses, and it
 * cannot see untracked scratch by construction. A guard that measures the
 * repository should ask git what the repository contains.
 */
function trackedSourceFiles(): string[] {
  const output = execFileSync("git", ["-C", ROOT, "ls-files", "-z", "*.ts", "*.tsx"], {
    encoding: "utf-8",
    maxBuffer: 64 * 1024 * 1024,
  });

  return (
    output
      .split("\0")
      .filter(Boolean)
      .filter((rel) => !SKIP_SEGMENT.some((segment) => rel.includes(segment)))
      .filter((rel) => !/\.(test|spec)\.(ts|tsx)$/.test(rel))
      .filter((rel) => !rel.endsWith(".d.ts"))
      .map((rel) => join(ROOT, rel))
      // A tracked path can be absent in a partial checkout or mid-rebase.
      .filter((abs) => existsSync(abs))
  );
}

function countMatches(files: string[]): { total: number; samples: string[] } {
  let total = 0;
  const samples: string[] = [];
  for (const file of files) {
    const text = readFileSync(file, "utf-8");
    const matches = text.match(PATTERN);
    if (!matches?.length) continue;
    total += matches.length;
    if (samples.length < 8) {
      samples.push(`${relative(ROOT, file)} (+${matches.length})`);
    }
  }
  return { total, samples };
}

describe("type hygiene ratchet (#232)", () => {
  it("as any / @ts-* count does not grow above baseline", () => {
    const files = trackedSourceFiles();
    const { total, samples } = countMatches(files);
    expect(
      total,
      `Type-hygiene surface grew (${total} > ${AS_ANY_BASELINE}).\n` +
        `Reduce casts or lower AS_ANY_BASELINE after a shrink.\n` +
        `Samples:\n  - ${samples.join("\n  - ")}`,
    ).toBeLessThanOrEqual(AS_ANY_BASELINE);

    // Keep baseline honest: if you cut below, lower AS_ANY_BASELINE in this file.
    if (total < AS_ANY_BASELINE * 0.85) {
      // Soft signal only — do not fail green CI for good progress.
      // eslint-disable-next-line no-console
      console.warn(
        `[type-hygiene] count ${total} is well below baseline ${AS_ANY_BASELINE} — lower AS_ANY_BASELINE`,
      );
    }
  });
});
