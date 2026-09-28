import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, normalize, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CATALOG } from "../../packages/design/ui/src/catalog/manifest";

/**
 * A catalog entry's status is a measurement (ADR 2026-09-27 UI catalog):
 * `stable` when some app or package outside @nebutra/ui imports it,
 * `experimental` when nothing does yet. This test takes the measurement and
 * fails when the manifest disagrees in either direction — so "stable" can
 * never mean "someone once hoped so".
 *
 * An import is attributed through the entry point it names: `Card` from
 * `@nebutra/ui/primitives` is the file primitives/index.ts re-exports it from,
 * so two components that share an export name in different entry points (there
 * were two Terminals) are never confused.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const UI_SRC = join(ROOT, "packages/design/ui/src");

const ENTRY_POINTS: Record<string, string> = {
  "@nebutra/ui": "index.ts",
  "@nebutra/ui/primitives": "primitives/index.ts",
  "@nebutra/ui/primitives/canonical": "primitives/canonical.ts",
  "@nebutra/ui/components": "components/index.ts",
  "@nebutra/ui/patterns": "patterns/index.ts",
  "@nebutra/ui/layout": "layout/index.ts",
};

const ownerOf = new Map<string, string>();
for (const entry of CATALOG) for (const file of entry.files) ownerOf.set(file, entry.id);

function resolveModule(fromFile: string, spec: string): string | null {
  const base = normalize(join(dirname(fromFile), spec));
  for (const candidate of [
    `${base}.tsx`,
    `${base}.ts`,
    join(base, "index.ts"),
    join(base, "index.tsx"),
  ]) {
    if (existsSync(join(UI_SRC, candidate))) return candidate;
  }
  return null;
}

const exportNames = (source: string): string[] => {
  const names: string[] = [];
  for (const m of source.matchAll(
    /export\s+(?:declare\s+)?(?:const|function|class|let)\s+(\w+)/g,
  )) {
    names.push(m[1] as string);
  }
  for (const m of source.matchAll(/export\s*\{([^}]*)\}(?!\s*from)/g)) {
    for (const part of (m[1] as string).split(",")) {
      const name = part
        .trim()
        .split(/\s+as\s+/)
        .pop()
        ?.trim();
      if (name && !part.trim().startsWith("type ")) names.push(name);
    }
  }
  return names;
};

/** name → catalog entry id, for everything an entry-point file exports. */
function exportsOf(file: string, seen = new Set<string>()): Map<string, string> {
  const out = new Map<string, string>();
  if (seen.has(file)) return out;
  seen.add(file);
  const source = readFileSync(join(UI_SRC, file), "utf8");
  const owner = ownerOf.get(file);
  if (owner) {
    for (const name of exportNames(source)) out.set(name, owner);
  }
  for (const m of source.matchAll(/export\s*\{([^}]*)\}\s*from\s*["'](\.[^"']+)["']/g)) {
    const target = resolveModule(file, m[2] as string);
    if (!target) continue;
    const inner = exportsOf(target, seen);
    for (const part of (m[1] as string).split(",")) {
      const trimmed = part.trim();
      if (!trimmed || trimmed.startsWith("type ")) continue;
      const [original, alias] = trimmed.split(/\s+as\s+/).map((s) => s.trim());
      const id = inner.get(original as string) ?? ownerOf.get(target);
      if (id) out.set((alias ?? original) as string, id);
    }
  }
  for (const m of source.matchAll(/export\s*\*\s*from\s*["'](\.[^"']+)["']/g)) {
    const target = resolveModule(file, m[1] as string);
    if (target) for (const [name, id] of exportsOf(target, seen)) out.set(name, id);
  }
  return out;
}

const byEntryPoint = new Map(
  Object.entries(ENTRY_POINTS).map(([spec, file]) => [spec, exportsOf(file)]),
);

function measuredCallers(): Map<string, Set<string>> {
  const callers = new Map<string, Set<string>>();
  const files = execFileSync("git", ["ls-files", "apps", "packages", "e2e", "tests"], {
    cwd: ROOT,
    encoding: "utf8",
  })
    .split("\n")
    .filter(
      (f) =>
        /\.(tsx?|mdx)$/.test(f) &&
        !f.startsWith("packages/design/ui/") &&
        !/\.(stories|test|spec)\.tsx?$/.test(f) &&
        existsSync(join(ROOT, f)),
    );
  const IMPORT = /import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*["'](@nebutra\/ui(?:\/[\w/-]+)?)["']/g;
  for (const file of files) {
    const source = readFileSync(join(ROOT, file), "utf8");
    for (const m of source.matchAll(IMPORT)) {
      const names = byEntryPoint.get(m[2] as string);
      if (!names) continue;
      for (const part of (m[1] as string).split(",")) {
        const trimmed = part.trim();
        if (!trimmed || trimmed.startsWith("type ")) continue;
        const id = names.get(trimmed.split(/\s+as\s+/)[0]?.trim() as string);
        if (id)
          callers.set(id, (callers.get(id) ?? new Set()).add(relative(ROOT, join(ROOT, file))));
      }
    }
  }
  return callers;
}

describe("UI catalog status", () => {
  const callers = measuredCallers();

  it("resolves the entry points it measures through", () => {
    // A resolver that lost its way would find no callers and pass every
    // "experimental" entry — so prove it sees the obvious ones first.
    expect(callers.get("button")?.size ?? 0).toBeGreaterThan(50);
    expect(callers.get("page-header")?.size ?? 0).toBeGreaterThan(5);
  });

  it("makes every entry importable from the entry point it names", () => {
    const unreachable = CATALOG.filter((entry) => {
      const names = byEntryPoint.get(entry.import);
      return !names || ![...names.values()].includes(entry.id);
    }).map((entry) => `${entry.id}: nothing in ${entry.import} reaches ${entry.files[0]}`);
    expect(unreachable).toEqual([]);
  });

  it("marks an entry stable exactly when something outside the library imports it", () => {
    const wrong = CATALOG.flatMap((entry) => {
      const used = (callers.get(entry.id)?.size ?? 0) > 0;
      if (used && entry.status !== "stable") {
        return [
          `${entry.id}: imported by ${[...(callers.get(entry.id) ?? [])][0]} — mark it stable`,
        ];
      }
      if (!used && entry.status === "stable") {
        return [`${entry.id}: nothing outside @nebutra/ui imports it — mark it experimental`];
      }
      return [];
    });
    expect(wrong).toEqual([]);
  });
});
