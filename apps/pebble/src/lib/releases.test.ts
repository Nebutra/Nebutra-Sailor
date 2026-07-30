import { describe, expect, it } from "vitest";
import { DOCS_BASE, DOWNLOADS, GITHUB_RELEASES } from "./releases";

describe("pebble brand front release links", () => {
  it("points download artifacts at GitHub Releases, not the brand origin", () => {
    expect(GITHUB_RELEASES).toContain("github.com/Nebutra/pebble/releases");
    for (const url of Object.values(DOWNLOADS)) {
      expect(url.startsWith("https://github.com/")).toBe(true);
    }
  });

  it("keeps docs on the platform docs host under /pebble", () => {
    expect(DOCS_BASE).toBe("https://pebble.nebutra.com/docs");
  });
});
