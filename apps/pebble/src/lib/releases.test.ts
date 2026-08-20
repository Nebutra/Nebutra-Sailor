import { describe, expect, it } from "vitest";
import { DOCS_BASE, DOWNLOAD_ROWS, DOWNLOADS, GITHUB_RELEASES } from "./releases";

describe("pebble brand front release links", () => {
  it("points download artifacts at GitHub Releases, not the brand origin", () => {
    // Case-insensitive on the org: GITHUB_RELEASES is derived from
    // brand.social.github, which stores the lowercase form, and GitHub treats
    // the two as the same account. Asserting the capital N pinned a spelling
    // the SSOT does not own — the claim worth making is that downloads leave
    // for GitHub Releases rather than the brand origin.
    expect(GITHUB_RELEASES.toLowerCase()).toContain("github.com/nebutra/pebble/releases");
    for (const url of Object.values(DOWNLOADS)) {
      expect(url.startsWith("https://github.com/")).toBe(true);
    }
  });

  it("exposes live Linux and macOS installers; Windows stays soon until signed", () => {
    const byLabel = Object.fromEntries(DOWNLOAD_ROWS.map((r) => [r.label, r]));
    expect(byLabel["Linux x64"]?.available).toBe(true);
    expect(byLabel["Linux arm64"]?.available).toBe(true);
    expect(byLabel["macOS Universal"]?.available).toBe(true);
    expect(byLabel["macOS Universal"]?.href).toBe(DOWNLOADS.macosUniversal);
    expect(byLabel["macOS Universal"]?.badge).toBe(".dmg");
    expect(byLabel["Windows x64"]?.available).toBe(false);
  });

  it("keeps docs on the platform docs host under /pebble", () => {
    expect(DOCS_BASE).toBe("https://pebble.nebutra.com/docs");
  });
});
