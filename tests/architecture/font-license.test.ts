import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const FONTS_DIR = join(ROOT, "packages/design/fonts");
const FONT_BINARY = /\.(woff2?|ttf|otf|eot)$/i;
const VIVO_BINARY = /vivo/i;

function gitTrackedFiles(): string[] {
  const output = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" });
  return output.split("\n").filter(Boolean);
}

describe("CJK face redistribution", () => {
  it("does not track vivo Sans binaries in Git", () => {
    const tracked = gitTrackedFiles().filter(
      (path) => VIVO_BINARY.test(path) && FONT_BINARY.test(path),
    );
    expect(tracked).toEqual([]);
  });

  it("does not keep vivo Sans vendor or generated faces on disk", () => {
    expect(existsSync(join(FONTS_DIR, "vendor/vivo-sans"))).toBe(false);
    expect(existsSync(join(FONTS_DIR, "generated/vivo-sans-cn.css"))).toBe(false);
    expect(existsSync(join(ROOT, "packages/design/brand/assets/fonts/vivo-sans"))).toBe(false);
  });

  it("ships the licence notices for the brand faces", () => {
    expect(existsSync(join(FONTS_DIR, "vendor/misans/LICENSE.txt"))).toBe(true);
    expect(existsSync(join(FONTS_DIR, "vendor/dm-sans/OFL.txt"))).toBe(true);
    const notice = readFileSync(join(FONTS_DIR, "NOTICE-FONTS.md"), "utf8");
    expect(notice).toMatch(/MiSans/);
    expect(notice).toMatch(/DM Sans/);
    expect(notice).toMatch(/SIL Open Font License|OFL/i);
    expect(notice).not.toMatch(/vivo Sans/);
  });

  it("never tracks MiSans binaries — the licence forbids redistributing the font", () => {
    // Same class of restriction that removed vivo Sans (b5e73db35). The subsets
    // are served from the asset CDN; only their keys are committed.
    const tracked = gitTrackedFiles().filter(
      (path) => /misans/i.test(path) && FONT_BINARY.test(path),
    );
    expect(tracked).toEqual([]);
  });

  it("does not publish font binaries in the npm files list", () => {
    const manifest = JSON.parse(readFileSync(join(FONTS_DIR, "package.json"), "utf8")) as {
      files?: string[];
      exports?: Record<string, string>;
    };
    const files = manifest.files ?? [];
    expect(files.length).toBeGreaterThan(0);
    const binaries = files.filter((entry) => FONT_BINARY.test(entry) || entry.includes("*.woff"));
    expect(binaries).toEqual([]);
    expect(files).toContain("NOTICE-FONTS.md");
    expect(files).toContain("vendor/misans/LICENSE.txt");
    expect(files.some((entry) => /vivo/i.test(entry))).toBe(false);
    expect(JSON.stringify(manifest.exports ?? {})).not.toMatch(/vivo/i);
  });
});
