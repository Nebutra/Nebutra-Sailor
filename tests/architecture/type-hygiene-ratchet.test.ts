/**
 * Shrink-only ratchets for type-hygiene tech debt (#232).
 *
 * Counts bare `as any` / `@ts-expect-error` / `@ts-expect-error` / `@ts-nocheck`
 * in production TypeScript (excludes tests, dist, node_modules, templates,
 * and generated Prisma client). The baseline may only go down.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "../..");

/** Recorded 2026-07-24 after CLI residual cleanup. Shrink-only. */
const AS_ANY_BASELINE = 59;

const SKIP_DIR = new Set([
  "node_modules",
  "dist",
  ".next",
  "coverage",
  "generated",
  "templates",
  ".turbo",
  ".git",
  ".source", // fumadocs generated
]);

const PATTERN = /\bas any\b|@ts-ignore|@ts-expect-error|@ts-nocheck/g;

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (SKIP_DIR.has(name)) continue;
    const full = join(dir, name);
    let st: ReturnType<typeof statSync>;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      walk(full, out);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(name)) continue;
    if (/\.(test|spec)\.(ts|tsx)$/.test(name)) continue;
    if (name.endsWith(".d.ts")) continue;
    out.push(full);
  }
  return out;
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
    const files = walk(ROOT);
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
