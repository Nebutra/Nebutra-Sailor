import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CATALOG } from "../../../../packages/design/ui/src/catalog/manifest";
import { BLOCKS, BLOCKS_DIR } from "./showcase-blocks";

const dir = join(__dirname, "../..", BLOCKS_DIR);
const source = (file: string) => readFileSync(join(dir, file), "utf8");

describe("BLOCKS", () => {
  it("ships 6 to 8 scenes", () => {
    expect(BLOCKS.length).toBeGreaterThanOrEqual(6);
    expect(BLOCKS.length).toBeLessThanOrEqual(8);
  });

  it("has a file for every block and a block for every file", () => {
    const files = readdirSync(dir).filter((f) => f.endsWith(".tsx"));
    expect(files.sort()).toEqual(BLOCKS.map((b) => b.file).sort());
  });

  it("has unique ids", () => {
    expect(new Set(BLOCKS.map((b) => b.id)).size).toBe(BLOCKS.length);
  });

  it("only claims catalog components the file really imports", () => {
    const ids = new Set(CATALOG.map((entry) => entry.id));
    for (const block of BLOCKS) {
      const src = source(block.file);
      for (const use of block.uses) {
        expect(ids.has(use.id), `${block.id}: "${use.id}" is not a catalog entry`).toBe(true);
        expect(
          new RegExp(`\\b${use.name}\\b`).test(src),
          `${block.id}: ${use.name} is not in ${block.file}`,
        ).toBe(true);
      }
    }
  });

  it("imports every @nebutra/ui component it renders from a declared use", () => {
    for (const block of BLOCKS) {
      const src = source(block.file);
      const named = [
        ...src.matchAll(/import \{([^}]+)\} from "@nebutra\/ui\/(?:primitives|layout)"/g),
      ]
        .flatMap((m) => (m[1] ?? "").split(","))
        .map((s) => s.trim())
        .filter((s) => /^[A-Z]/.test(s) || s === "toast");
      const declared = new Set(block.uses.map((u) => u.name));
      // Sub-parts (TableRow, SelectItem, ...) belong to the declared parent by name prefix.
      const orphans = named.filter(
        (name) => ![...declared].some((parent) => name === parent || name.startsWith(parent)),
      );
      expect(orphans, `${block.id} imports components it does not list in uses`).toEqual([]);
    }
  });

  it("follows the repo rules: no arbitrary font sizes, inline colour or console.log", () => {
    for (const block of BLOCKS) {
      const src = source(block.file);
      expect(src, block.id).not.toMatch(/text-\[\d/);
      expect(src, block.id).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(src, block.id).not.toMatch(/console\.log/);
      expect(src, block.id).not.toMatch(/motion\.div/);
    }
  });
});
