import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  VIVO_SANS_CN_SOURCES,
  VIVO_SANS_CN_UNICODE_RANGE,
  VIVO_SANS_CN_VARIABLE,
} from "../generated/index";
import { FONT_REGISTRY } from "./index";

/**
 * next/font is a compile-time transform: the options object passed to
 * localFont() must be a literal, so ./next-cjk.ts cannot spread the generated
 * metadata. These tests read that file as TEXT (importing it would pull in
 * next/font/local, which only exists inside a Next build) and assert the
 * literals still agree with what the subsetter actually emitted.
 */
const NEXT_CJK_SOURCE = readFileSync(
  fileURLToPath(new URL("./next-cjk.ts", import.meta.url)),
  "utf8",
);

describe("vivo Sans SC wiring", () => {
  it("declares every generated weight, with the file the subsetter wrote", () => {
    for (const { path, weight } of VIVO_SANS_CN_SOURCES) {
      const file = path.replace(/^\.\//, "");
      expect(NEXT_CJK_SOURCE).toContain(`"../generated/${file}", weight: "${weight}"`);
    }
  });

  it("declares no weight that has no file (nothing can be synthesised)", () => {
    const declared = [...NEXT_CJK_SOURCE.matchAll(/weight: "(\d+)"/g)].map((m) => m[1]);
    expect(declared.sort()).toEqual(VIVO_SANS_CN_SOURCES.map((s) => s.weight).sort());
  });

  it("carries the generated unicode-range verbatim (CJK only, no Latin)", () => {
    expect(NEXT_CJK_SOURCE).toContain(VIVO_SANS_CN_UNICODE_RANGE);
    expect(VIVO_SANS_CN_UNICODE_RANGE).not.toMatch(/U\+00[0-7]/i);
  });

  it("uses the CSS variable the registry and the token stacks reference", () => {
    expect(NEXT_CJK_SOURCE).toContain(`variable: "${VIVO_SANS_CN_VARIABLE}"`);
    expect(FONT_REGISTRY["vivo sans sc"]).toBe(VIVO_SANS_CN_VARIABLE);
  });

  it("never preloads (a ~490 KB CJK weight must be demand-loaded)", () => {
    expect(NEXT_CJK_SOURCE).toContain("preload: false");
  });
});
