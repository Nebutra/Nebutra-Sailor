import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MISANS_FILES, MISANS_UNICODE_RANGE } from "../generated/index";
import { misansFontFaceCss } from "./cjk-font-face";
import { FONT_REGISTRY } from "./index";

/**
 * MiSans is CDN-hosted (its licence forbids distributing the font on its own,
 * and this repo is public). Only content-hashed keys are committed; the host is
 * resolved per deployment by publicAssetUrl(). DM Sans is self-hosted through
 * next/font/local in ./next-cjk.ts, a compile-time transform — read as TEXT.
 */
const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const NEXT_CJK_SOURCE = read("./next-cjk.ts");
const GENERATED_INDEX = read("../generated/index.ts");

describe("MiSans wiring", () => {
  it("commits keys, never a host", () => {
    for (const { key } of MISANS_FILES) {
      expect(key).toMatch(/^fonts\/misans\/misans-\d{3}\.[0-9a-f]{10}\.woff2$/);
    }
    expect(GENERATED_INDEX).not.toMatch(/https?:\/\//);
  });

  it("declares one @font-face per weight against the given origin", () => {
    const css = misansFontFaceCss("https://assets.example.test/");
    for (const { key, weight } of MISANS_FILES) {
      expect(css).toContain(`font-weight:${weight};`);
      expect(css).toContain(`src:url("https://assets.example.test/${key}") format("woff2")`);
    }
    expect(css.match(/@font-face/g)).toHaveLength(MISANS_FILES.length);
    expect(css).toContain("font-display:swap");
  });

  it("carries a CJK-only unicode-range, so Latin never downloads a CJK file", () => {
    expect(misansFontFaceCss("https://a.test")).toContain(`unicode-range:${MISANS_UNICODE_RANGE}`);
    expect(MISANS_UNICODE_RANGE).not.toMatch(/U\+00[0-7]/i);
  });

  it("never loads a MiSans binary through next/font", () => {
    expect(NEXT_CJK_SOURCE).not.toMatch(/misans-\d{3}\.woff2/);
  });

  it("registers the variable the token stacks reference", () => {
    expect(FONT_REGISTRY.misans).toBe("--font-misans");
  });
});

describe("DM Sans wiring", () => {
  it("self-hosts the variable Latin subset under the heading variable", () => {
    expect(NEXT_CJK_SOURCE).toContain('path: "../generated/dm-sans.woff2"');
    expect(NEXT_CJK_SOURCE).toContain('variable: "--font-dm-sans"');
    expect(FONT_REGISTRY["dm sans display"]).toBe("--font-dm-sans");
  });
});
