import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = readFileSync(join(root, "src/next-geist.ts"), "utf8");
const ranges = JSON.parse(readFileSync(join(root, "generated/geist-sans/ranges.json"), "utf8")) as {
  latin: string;
  rest: string;
};

describe("next-geist", () => {
  it("declares each file with the unicode-range subset-geist.mjs cut it to", () => {
    expect(source).toContain(`"${ranges.latin}"`);
    expect(source).toContain(`"${ranges.rest}"`);
  });

  it("keeps the family name of geist/font/sans so token stacks resolve unchanged", () => {
    expect(source.match(/value: "'GeistSans'"/g)).toHaveLength(2);
    expect(source).toContain('variable: "--font-geist-sans"');
  });
});
