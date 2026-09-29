import { describe, expect, it } from "vitest";
import { redirectsFileContents } from "./postbuild-static-export.mjs";
import { TAXONOMY_REDIRECTS } from "./taxonomy-redirects.mjs";

describe("_redirects generation (postbuild-static-export.mjs)", () => {
  const contents = redirectsFileContents();
  const lines = contents.trim().split("\n");

  it("has exactly one line per taxonomy entry", () => {
    expect(lines).toHaveLength(TAXONOMY_REDIRECTS.length);
  });

  it("contains every taxonomy entry, /docs-prefixed on both sides, as a 301", () => {
    for (const { source, destination } of TAXONOMY_REDIRECTS) {
      expect(contents).toContain(`/docs${source}  /docs${destination}  301`);
    }
  });

  it("never emits a source or destination without the /docs prefix", () => {
    for (const line of lines) {
      const [from, to] = line.split(/\s+/);
      expect(from.startsWith("/docs/")).toBe(true);
      expect(to.startsWith("/docs/")).toBe(true);
    }
  });

  it("ends with a trailing newline (Netlify/Workers _redirects convention)", () => {
    expect(contents.endsWith("\n")).toBe(true);
  });
});
