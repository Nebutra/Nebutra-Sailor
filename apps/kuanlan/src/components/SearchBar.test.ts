import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));

describe("search bar", () => {
  it("keeps the magnifier and does not paint a trailing ink dot", () => {
    const bar = readFileSync(join(here, "SearchBar.tsx"), "utf8");
    const css = readFileSync(join(here, "../app/globals.css"), "utf8");
    expect(bar).toContain("search-glyph");
    expect(bar).not.toContain("search-spark");
    expect(css).not.toContain(".search-spark");
  });
});
