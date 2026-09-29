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

  it("states in the product that it uses MiSans, and every public footer reaches that statement", () => {
    // The licence: 您应在软件中特别注明使用了 MiSans 字体. The statement lives on
    // /credits (2026-09-28); the footers carry a link to it, not the line.
    const credits = readFileSync(
      join(ROOT, "apps/landing/src/app/[lang]/(legal)/credits/page.tsx"),
      "utf8",
    );
    expect(credits).toContain("本网站使用了 MiSans 字体");
    for (const footer of [
      "apps/landing/src/nebutra/shell/site-footer.tsx",
      "apps/landing/src/components/landing/FooterMinimal.tsx",
      "apps/web/src/components/navigation/public-page-chrome.tsx",
    ]) {
      expect(readFileSync(join(ROOT, footer), "utf8"), footer).toContain("/credits");
    }
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
    // Open-licence faces (DM Sans, the registry faces) ship on purpose so a
    // hoisted npm install resolves them (NOTICE-FONTS.md "Distribution"). What
    // may never ship is a face whose licence forbids redistribution, by name
    // or swept in by a wildcard.
    const isText = (entry: string) => /\.(txt|md)$/i.test(entry);
    const restricted = files.filter(
      (entry) =>
        (/misans|vivo/i.test(entry) && !isText(entry)) || /\*\.(woff2?|ttf|otf)/.test(entry),
    );
    expect(restricted).toEqual([]);
    expect(files).toContain("NOTICE-FONTS.md");
    expect(files).toContain("vendor/misans/LICENSE.txt");
    expect(files.some((entry) => /vivo/i.test(entry))).toBe(false);
    expect(JSON.stringify(manifest.exports ?? {})).not.toMatch(/vivo/i);
  });
});
