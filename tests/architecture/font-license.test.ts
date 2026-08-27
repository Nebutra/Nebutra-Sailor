import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const FONTS_DIR = join(process.cwd(), "packages/design/fonts");
const FONT_BINARY = /\.(woff2?|ttf|otf|eot)$/i;

describe("vivo Sans redistribution", () => {
  it("keeps the licence and NOTICE next to the workspace binaries", () => {
    expect(existsSync(join(FONTS_DIR, "vendor/vivo-sans/LICENCE-vivo-Sans.txt"))).toBe(true);
    expect(existsSync(join(FONTS_DIR, "NOTICE-FONTS.md"))).toBe(true);
    const notice = readFileSync(join(FONTS_DIR, "NOTICE-FONTS.md"), "utf8");
    expect(notice).toMatch(/2\.3/);
    expect(notice).toMatch(/not be published/i);
  });

  it("does not publish font binaries in the npm files list", () => {
    const manifest = JSON.parse(readFileSync(join(FONTS_DIR, "package.json"), "utf8")) as {
      files?: string[];
    };
    const files = manifest.files ?? [];
    expect(files.length).toBeGreaterThan(0);
    const binaries = files.filter((entry) => FONT_BINARY.test(entry) || entry.includes("*.woff"));
    expect(binaries).toEqual([]);
    expect(files).toContain("NOTICE-FONTS.md");
    expect(files).toContain("vendor/vivo-sans/LICENCE-vivo-Sans.txt");
  });
});
