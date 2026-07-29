import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The landing page renders a hand-maintained tree of the repository's apps,
 * packages and backends. Hand-maintained means it drifts, and it drifts
 * silently: nothing type-checks a string that names a directory.
 *
 * It already did. `apps/tsekaluk-dev` was extracted to its own repository and
 * the entry was removed in the same commit — but the deployed marketing site
 * kept advertising it for a day, because the only thing that would have caught
 * the mismatch was somebody looking at the page.
 *
 * These assertions are cheap and they fail in CI rather than in production.
 */

const REPO_ROOT = join(import.meta.dirname, "../..");
const DATA_FILE = join(REPO_ROOT, "apps/landing/src/lib/constants/landing-data.ts");

/** Roots the tree describes. A path outside these is not a repo directory. */
const TRACKED_ROOTS = ["apps", "packages", "backends", "infra", "workflows", "e2e", "tests"];

function declaredPaths(): string[] {
  const source = readFileSync(DATA_FILE, "utf8");
  const pattern = new RegExp(`path:\\s*"((?:${TRACKED_ROOTS.join("|")})/[^"]+)"`, "g");
  return [...new Set([...source.matchAll(pattern)].map((m) => m[1] as string))];
}

describe("landing structure tree", () => {
  it("only names directories that exist", () => {
    const missing = declaredPaths().filter((p) => !existsSync(join(REPO_ROOT, p)));
    expect(
      missing,
      `landing-data.ts advertises paths that are not in the repo: ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("does not advertise an app that was extracted to its own repository", () => {
    // The specific failure this file was written for. Kept as its own case so
    // a regression names the cause rather than just "a path is missing".
    const source = readFileSync(DATA_FILE, "utf8");
    expect(source).not.toContain("tsekaluk");
  });

  it("names every app that exists, so the tree stays a description and not a sample", () => {
    // A tree that quietly omits half the apps is worse than no tree: it reads
    // as complete. Anything intentionally hidden belongs in EXCLUDED with a
    // reason, not simply left out.
    const EXCLUDED = new Set<string>([
      // Nothing today. Add with a comment saying why it is not shown.
    ]);

    const onDisk = readdirSync(join(REPO_ROOT, "apps"), { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .map((e) => `apps/${e.name}`)
      .filter((p) => !EXCLUDED.has(p));

    const declared = new Set(declaredPaths());
    const undeclared = onDisk.filter((p) => !declared.has(p));

    expect(undeclared, `apps missing from the landing tree: ${undeclared.join(", ")}`).toEqual([]);
  });

  it("shows a count that matches how many apps there are", () => {
    // The tag is a hand-typed number next to a hand-typed list, which is two
    // chances to be wrong about the same fact. It read 10 while 14 apps
    // existed — the kind of thing nobody notices because it looks plausible.
    const source = readFileSync(DATA_FILE, "utf8");
    const group = source.slice(source.indexOf('label: "apps",'));
    const tag = group.match(/tag:\s*"(\d+)"/)?.[1];

    const actual = readdirSync(join(REPO_ROOT, "apps"), { withFileTypes: true }).filter(
      (e) => e.isDirectory() && !e.name.startsWith("."),
    ).length;

    expect(Number(tag), `apps tag says ${tag}, repo has ${actual}`).toBe(actual);
  });
});
