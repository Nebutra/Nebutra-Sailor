import { describe, expect, it } from "vitest";
import { DOCS_BASE, DOWNLOAD_ROWS, DOWNLOADS, GITHUB_RELEASES } from "./releases";

describe("pebble brand front release links", () => {
  it("points download artifacts at GitHub Releases, not the brand origin", () => {
    expect(GITHUB_RELEASES).toContain("github.com/Nebutra/pebble/releases");
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
