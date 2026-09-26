import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Every app that sends a CSP and renders <CjkFontFace /> must let the browser
 * fetch the MiSans subsets from the public asset origin. On 2026-09-26 both
 * CSPs said `font-src 'self' data:` and every MiSans face in production was
 * refused with no error on the page — Chinese quietly fell back to PingFang.
 * apps/web also needs the nonce on the inline <style>: its style-src allows
 * inline styles only by nonce.
 */
const CSP_SOURCES = ["apps/landing/next.config.ts", "apps/web/src/proxy.ts"];

describe("CSP lets the CJK webfont load", () => {
  for (const file of CSP_SOURCES) {
    it(`${file}: font-src allows publicAssetOrigin()`, () => {
      const src = readFileSync(file, "utf8");
      const fontSrc = src.split("\n").find((line) => line.includes("font-src"));
      expect(fontSrc, `${file} has no font-src directive`).toBeDefined();
      expect(fontSrc).toContain("publicAssetOrigin()");
    });
  }

  it("apps/web passes its CSP nonce to <CjkFontFace />", () => {
    const layout = readFileSync("apps/web/src/app/layout.tsx", "utf8");
    expect(layout).toMatch(/<CjkFontFace nonce=\{nonce\} \/>/);
  });
});
