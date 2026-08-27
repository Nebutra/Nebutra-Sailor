import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A package whose examples import it by its published name only typechecks if
 * something has already built its dist — and turbo's typecheck task dependsOn
 * `^build`, which is a package's dependencies, never itself. So on a clean
 * graph run the examples cannot resolve the package they demonstrate, and CI
 * fails on a file that is correct.
 *
 * It passes locally for the worst reason: a tree that has been built once has
 * the dist sitting there. Three packages carried this and two of them only
 * surfaced when a different failure upstream stopped masking them.
 *
 * The fix is a `paths` entry mapping the package's own name at its source
 * entry, which keeps the example honest — it still reads the way a consumer
 * writes it — without waiting on a build. This asserts every package that
 * needs one has one.
 */

const REPO_ROOT = join(import.meta.dirname, "../..");

function packageDirs(): string[] {
  const out: string[] = [];
  const categories = join(REPO_ROOT, "packages");
  for (const category of readdirSync(categories, { withFileTypes: true })) {
    if (!category.isDirectory()) continue;
    const inner = join(categories, category.name);
    for (const pkg of readdirSync(inner, { withFileTypes: true })) {
      if (!pkg.isDirectory()) continue;
      out.push(join(inner, pkg.name));
    }
  }
  return out;
}

function readJsonc<T>(path: string): T | null {
  try {
    return JSON.parse(readFileSync(path, "utf8").replace(/^\s*\/\/.*$/gm, "")) as T;
  } catch {
    return null;
  }
}

describe("packages whose examples import themselves", () => {
  it("map the self-reference to source so typecheck needs no prior build", () => {
    const unmapped: string[] = [];

    for (const dir of packageDirs()) {
      const manifest = readJsonc<{ name?: string }>(join(dir, "package.json"));
      const tsconfig = readJsonc<{
        include?: string[];
        compilerOptions?: { paths?: Record<string, string[]> };
      }>(join(dir, "tsconfig.json"));
      const name = manifest?.name;
      if (!name || !tsconfig) continue;
      if (!(tsconfig.include ?? []).some((entry) => entry.includes("example"))) continue;

      const examples = join(dir, "examples");
      if (!existsSync(examples)) continue;
      const selfImports = readdirSync(examples, { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile() && /\.tsx?$/.test(entry.name))
        .some((entry) =>
          new RegExp(`from ["']${name.replace("/", "\\/")}["']`).test(
            readFileSync(join(entry.parentPath ?? examples, entry.name), "utf8"),
          ),
        );
      if (!selfImports) continue;

      if (!tsconfig.compilerOptions?.paths?.[name]) {
        unmapped.push(`${name} (${dir.slice(REPO_ROOT.length + 1)})`);
      }
    }

    expect(
      unmapped,
      "these packages' examples import the package by name with no `paths` entry " +
        "mapping it to source, so their typecheck resolves only where a dist " +
        `already exists — green locally, red on a clean checkout: ${unmapped.join(", ")}`,
    ).toEqual([]);
  });
});
