import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { type ApiBlock, apiForEntry } from "../api-docs";
import { LIVE_DOCS } from "../docs";
import { COMPONENTS } from "../registry";

function flatten(block: ApiBlock): ApiBlock[] {
  return [block, ...block.parts.flatMap(flatten)];
}

describe("published component documentation", () => {
  it("gives every registered page a playground and state matrix", () => {
    const missing: string[] = [];
    for (const entry of COMPONENTS) {
      const file = resolve(__dirname, "../docs", `${entry.slug}.tsx`);
      if (!LIVE_DOCS.has(entry.slug) || !existsSync(file)) {
        missing.push(entry.slug);
        continue;
      }

      const source = ts.createSourceFile(
        file,
        readFileSync(file, "utf8"),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );
      const exports = source.statements
        .filter(ts.isFunctionDeclaration)
        .filter((node) => node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword))
        .map((node) => node.name?.text);
      for (const name of ["Playground", "StatesMatrix"]) {
        if (!exports.includes(name)) missing.push(`${entry.slug}.${name}`);
      }
    }
    expect(missing, "Pages must expose both live documentation sections").toEqual([]);
    expect([...LIVE_DOCS].sort()).toEqual(COMPONENTS.map((entry) => entry.slug).sort());
  });

  it("describes every owned prop and exported API, including compound parts", () => {
    const missing: string[] = [];
    for (const entry of COMPONENTS) {
      const { blocks, unresolved } = apiForEntry(entry, COMPONENTS);
      for (const name of unresolved) missing.push(`${entry.slug}: unresolved ${name}`);
      for (const block of blocks.flatMap(flatten)) {
        if (!block.description.trim()) missing.push(`${entry.slug}: ${block.name}`);
        for (const prop of [...block.props, ...block.members]) {
          if (!prop.description.trim()) missing.push(`${entry.slug}: ${block.name}.${prop.name}`);
        }
      }
    }
    expect(missing, "Document APIs in the library source so tables and editor help agree").toEqual(
      [],
    );
  }, 60_000);
});
