import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  NOTO_SANS_SC_SOURCES,
  NOTO_SANS_SC_UNICODE_RANGE,
  NOTO_SANS_SC_VARIABLE,
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

describe("Noto Sans SC wiring", () => {
  it("declares every generated weight, with the file the subsetter wrote", () => {
    for (const { path, weight } of NOTO_SANS_SC_SOURCES) {
      const file = path.replace(/^\.\//, "");
      expect(NEXT_CJK_SOURCE).toContain(`"../generated/${file}", weight: "${weight}"`);
    }
  });

  it("declares no weight that has no file (nothing can be synthesised)", () => {
    const declared = [...NEXT_CJK_SOURCE.matchAll(/weight: "(\d+)"/g)].map((m) => m[1]);
    expect(declared.sort()).toEqual(NOTO_SANS_SC_SOURCES.map((s) => s.weight).sort());
  });

  it("carries the generated unicode-range verbatim (CJK only, no Latin)", () => {
    expect(NEXT_CJK_SOURCE).toContain(NOTO_SANS_SC_UNICODE_RANGE);
    expect(NOTO_SANS_SC_UNICODE_RANGE).not.toMatch(/U\+00[0-7]/i);
  });

  it("uses the CSS variable the registry and the token stacks reference", () => {
    expect(NEXT_CJK_SOURCE).toContain(`variable: "${NOTO_SANS_SC_VARIABLE}"`);
    expect(FONT_REGISTRY["noto sans sc"]).toBe(NOTO_SANS_SC_VARIABLE);
  });

  it("never preloads (a CJK weight must be demand-loaded)", () => {
    expect(NEXT_CJK_SOURCE).toContain("preload: false");
  });
});
