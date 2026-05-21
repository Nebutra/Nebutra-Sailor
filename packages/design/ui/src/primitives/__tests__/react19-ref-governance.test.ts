import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migratedPrimitiveFiles = [
  "input.tsx",
  "textarea.tsx",
  "select.tsx",
  "toggle-group.tsx",
  "progress.tsx",
] as const;

const sourceFor = (filename: (typeof migratedPrimitiveFiles)[number]) =>
  readFileSync(join(process.cwd(), "src", "primitives", filename), "utf8");

describe("React 19 ref governance", () => {
  it.each(migratedPrimitiveFiles)("does not use forwardRef in %s", (filename) => {
    const source = sourceFor(filename);

    expect(source).not.toMatch(/\bReact\.forwardRef\b/u);
    expect(source).not.toMatch(/\bForwardRefExoticComponent\b/u);
    expect(source).not.toMatch(/\bForwardedRef\b/u);
  });
});
