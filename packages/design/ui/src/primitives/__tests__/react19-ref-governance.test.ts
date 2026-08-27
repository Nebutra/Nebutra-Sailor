import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const primitivesDir = join(process.cwd(), "src", "primitives");

const primitiveFiles = readdirSync(primitivesDir)
  .filter((filename) => filename.endsWith(".tsx"))
  .sort();

const sourceFor = (filename: string) => readFileSync(join(primitivesDir, filename), "utf8");

describe("React 19 ref governance", () => {
  it.each(primitiveFiles)("does not use legacy React 18 primitive APIs in %s", (filename) => {
    const source = sourceFor(filename);

    expect(source).not.toMatch(/\bforwardRef\b/u);
    expect(source).not.toMatch(/\bReact\.forwardRef\b/u);
    expect(source).not.toMatch(/\bForwardRefExoticComponent\b/u);
    expect(source).not.toMatch(/\bForwardedRef\b/u);
    expect(source).not.toMatch(/\bReact\.useContext\b/u);
    expect(source).not.toMatch(/\buseContext\b/u);
  });
});
