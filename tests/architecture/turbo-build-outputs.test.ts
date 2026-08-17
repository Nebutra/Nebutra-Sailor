import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A package whose build emits dist/ but declares `outputs: []` is correct exactly
 * once, then broken forever.
 *
 * First run: cache miss, the build really runs, dist exists, consumers link.
 * Every run after: cache HIT, nothing is restored because nothing was saved, and
 * the consumer fails with `Cannot find module '@nebutra/<name>'` — on the same
 * commit that built cleanly minutes earlier. packages/platform/gateway-core did
 * this, and the two runs of ec266a7b, one green and one red with no code in
 * between, are what it looks like from the outside.
 *
 * The rule is about EMITTING, not about having a build: `tsc --noEmit` and
 * type-check-only builds legitimately declare no outputs, and their consumers
 * import src directly.
 */

const ROOT = resolve(process.cwd());

function packageTurboConfigs(): string[] {
  const out: string[] = [];
  const walk = (dir: string, depth: number) => {
    if (depth > 3) return;
    let entries: string[];
    try {
      entries = require("node:fs").readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries as Array<{ name: string; isDirectory(): boolean }>) {
      if (e.name === "node_modules" || e.name.startsWith(".")) continue;
      const full = join(dir, e.name);
      if (e.isDirectory()) walk(full, depth + 1);
      else if (e.name === "turbo.json" && dir !== ROOT) out.push(full);
    }
  };
  for (const top of ["packages", "apps", "backends"]) {
    const d = join(ROOT, top);
    if (existsSync(d)) walk(d, 0);
  }
  return out;
}

/**
 * turbo.json is JSONC — turbo documents comments as supported, and the configs
 * in this repo use them to record why an outputs list is what it is. JSON.parse
 * chokes on that, so this test crashed on a valid file rather than checking it.
 */
function readJsonc(path: string): Record<string, unknown> {
  const raw = readFileSync(path, "utf-8")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  return JSON.parse(raw) as Record<string, unknown>;
}

/** True when the package's build script actually writes files. */
function buildEmits(pkgDir: string): boolean {
  const pkgPath = join(pkgDir, "package.json");
  if (!existsSync(pkgPath)) return false;
  const pkg = readJsonc(pkgPath) as {
    scripts?: Record<string, string>;
    main?: string;
    types?: string;
    exports?: Record<string, { import?: string }>;
  };
  const build: string | undefined = pkg.scripts?.build;
  if (!build) return false;
  // `tsc --noEmit` checks types and writes nothing.
  if (/--noEmit/.test(build)) return false;
  // The give-away that something downstream reads compiled output.
  const entry = pkg.main ?? pkg.types ?? pkg.exports?.["."]?.import;
  return typeof entry === "string" && entry.includes("dist");
}

describe("turbo build outputs", () => {
  it("finds package-level turbo configs to check", () => {
    expect(packageTurboConfigs().length).toBeGreaterThan(0);
  });

  it("no package that emits dist/ declares empty build outputs", () => {
    const offenders: string[] = [];
    for (const cfg of packageTurboConfigs()) {
      const outputs = (readJsonc(cfg) as { tasks?: { build?: { outputs?: unknown } } }).tasks?.build
        ?.outputs;
      if (!Array.isArray(outputs) || outputs.length > 0) continue;
      const dir = dirname(cfg);
      if (buildEmits(dir)) {
        offenders.push(
          `${dir.replace(`${ROOT}/`, "")} — build writes dist/ and package entry points at it, ` +
            "but turbo is told there is nothing to cache",
        );
      }
    }
    expect(
      offenders,
      `these will build once and then break on every cached run:\n  ${offenders.join("\n  ")}`,
    ).toEqual([]);
  });
});
