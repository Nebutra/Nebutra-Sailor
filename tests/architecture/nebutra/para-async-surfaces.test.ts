import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const SRC = "apps/para/src";

/**
 * Every async surface in PARA renders more than its success case.
 *
 * `data?.map(...)` draws an empty grid while loading, an empty grid on failure, and an empty grid
 * when the account genuinely has nothing — three situations the user cannot tell apart, two of
 * which look like the page is broken. That shape was in four files. Constitution §12.1: an
 * unevaluated state is a defect.
 *
 * The convergence is `components/ui/async-surface.tsx`, composed from @nebutra/ui/layout's
 * EmptyState and ErrorState — which existed the whole time and which PARA had never used.
 *
 * This asserts the pattern is reached for, rather than asserting how it renders: the regression to
 * catch is the fifth surface hand-rolling its own branches, not React's output.
 *
 * Not every query consumer is a surface. A dropdown populated from a list owes the user a menu, not
 * a skeleton and an empty state, and forcing the pattern there would make the guard noisy — which
 * is how a gate stops being read. Those carry a top-level `// @async-surface-exempt: <reason>`,
 * the same escape hatch this repo uses for the repository seam and primitive reuse.
 */

function sh(cmd: string): string[] {
  return execSync(`${cmd} || true`, { encoding: "utf-8", cwd: ROOT, maxBuffer: 32 * 1024 * 1024 })
    .split("\n")
    .filter(Boolean);
}

/** Components that read a query and therefore owe the user four outcomes. */
const QUERY_HOOKS = "useProjects|useProject|useWorkspaces|useAssets|useSubjects";

describe("PARA async surfaces", () => {
  const consumers = sh(`rg -l --glob '*.tsx' -e '(${QUERY_HOOKS})\\(' ${SRC}`).filter(
    (f) => !f.includes("/ui/async-surface"),
  );

  it("finds the surfaces that read a query", () => {
    expect(
      consumers.length,
      "no query consumers found — the pattern below is unverified",
    ).toBeGreaterThan(0);
  });

  it("routes each of them through AsyncSurface", () => {
    const handRolled: string[] = [];
    for (const file of consumers) {
      const src = readFileSync(file, "utf-8");
      if (/^\s*\/\/\s*@async-surface-exempt:/m.test(src)) continue;
      if (!src.includes("AsyncSurface")) handRolled.push(file);
    }
    expect(handRolled, "these read a query without AsyncSurface").toEqual([]);
  });

  it("keeps the pattern built from the design system, not hand-rolled markup", () => {
    const pattern = readFileSync(`${SRC}/components/ui/async-surface.tsx`, "utf-8");
    expect(pattern).toContain("@nebutra/ui/layout");
    expect(pattern).toContain("EmptyState");
    expect(pattern).toContain("ErrorState");
  });
});
