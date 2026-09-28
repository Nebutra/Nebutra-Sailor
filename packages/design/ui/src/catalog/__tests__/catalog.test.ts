import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { demoExport, renderLoaders } from "../../../scripts/gen-catalog.mjs";
import { CATALOG, CATALOG_CATEGORIES, INTERNAL_FILES } from "../manifest";

/**
 * The catalog is the one description of @nebutra/ui (ADR 2026-09-27 UI
 * catalog). These checks hold it to the source tree, so a component cannot
 * be added, moved or deleted without the catalog saying so.
 */

const SRC = join(process.cwd(), "src");
const DEMOS = join(SRC, "catalog/demos");
const SURVEYED = ["primitives", "components", "patterns", "layout"];
const NOT_A_COMPONENT = /(\.stories|\.test|\.spec)\.tsx?$|\.d\.ts$|(^|\/)(index|canonical)\.ts$/;

function sourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      if (name === "__tests__") continue;
      const abs = join(dir, name);
      if (statSync(abs).isDirectory()) walk(abs);
      else if (/\.tsx?$/.test(name)) {
        const rel = relative(SRC, abs);
        if (!NOT_A_COMPONENT.test(rel)) out.push(rel);
      }
    }
  };
  for (const dir of SURVEYED) walk(join(SRC, dir));
  return out.sort();
}

const demoIds = readdirSync(DEMOS)
  .filter((f) => f.endsWith(".tsx"))
  .map((f) => f.slice(0, -4))
  .sort();

describe("UI catalog", () => {
  it("gives every component file exactly one owner", () => {
    const owners = new Map<string, string[]>();
    for (const entry of CATALOG) {
      for (const file of entry.files) owners.set(file, [...(owners.get(file) ?? []), entry.id]);
    }
    for (const file of INTERNAL_FILES) owners.set(file, [...(owners.get(file) ?? []), "INTERNAL"]);

    const unowned = sourceFiles().filter((file) => !owners.has(file));
    const shared = [...owners]
      .filter(([, ids]) => ids.length > 1)
      .map(([f, ids]) => `${f}: ${ids}`);
    const missing = [...owners.keys()].filter((file) => !existsSync(join(SRC, file)));

    expect(
      unowned,
      "component files no catalog entry owns — add them to an entry or INTERNAL_FILES",
    ).toEqual([]);
    expect(shared, "files claimed by more than one entry").toEqual([]);
    expect(missing, "catalog files that do not exist").toEqual([]);
  });

  it("gives every demo exactly one entry, named after it", () => {
    const claimed = CATALOG.flatMap((entry) =>
      entry.demos.map((demo) => ({ demo, entry: entry.id })),
    );
    const counts = new Map<string, number>();
    for (const { demo } of claimed) counts.set(demo, (counts.get(demo) ?? 0) + 1);

    expect(
      demoIds.filter((id) => !counts.has(id)),
      "demos no entry lists",
    ).toEqual([]);
    expect(
      [...counts].filter(([, n]) => n > 1).map(([id]) => id),
      "demos listed twice",
    ).toEqual([]);
    expect(
      claimed.filter(({ demo }) => !demoIds.includes(demo)).map(({ demo }) => demo),
      "listed demos that do not exist",
    ).toEqual([]);
    expect(
      claimed
        .filter(({ demo, entry }) => !demo.startsWith(`${entry}-`))
        .map(({ demo, entry }) => `${entry}: ${demo}`),
      "a demo id starts with its entry id",
    ).toEqual([]);
  });

  it("gives every entry a demo", () => {
    expect(CATALOG.filter((e) => e.demos.length === 0).map((e) => e.id)).toEqual([]);
  });

  it("keeps ids unique and categories known", () => {
    const ids = CATALOG.map((entry) => entry.id);
    expect(ids.length).toBe(new Set(ids).size);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    const categories = new Set<string>(CATALOG_CATEGORIES.map((c) => c.id));
    expect(CATALOG.filter((entry) => !categories.has(entry.category)).map((e) => e.id)).toEqual([]);
  });

  it("makes each demo one exported component that imports the library by its public name", () => {
    for (const id of demoIds) {
      const source = readFileSync(join(DEMOS, `${id}.tsx`), "utf8");
      expect(() => demoExport(source, id)).not.toThrow();
      // Demos are client components: a server importing the catalog must never render one.
      expect(source.trimStart().startsWith('"use client";'), `${id} starts with "use client"`).toBe(
        true,
      );
      // A demo is the code a reader copies: no relative reaches into the library, no app aliases.
      const code = source.replace(/`[\s\S]*?`/g, "``");
      expect(code, id).not.toMatch(/from\s+["'](\.\.?\/|@\/)/);
      // A demo shows the component, with copy a product would ship.
      expect(code, `${id} renders nothing`).not.toMatch(/^\s*return null;/m);
      expect(source, `${id} uses placeholder copy`).not.toMatch(/lorem ipsum/i);
    }
  });

  it("has an up-to-date demo loader table", () => {
    expect(readFileSync(join(SRC, "catalog/demo-loaders.generated.ts"), "utf8")).toBe(
      renderLoaders(),
    );
  });
});
