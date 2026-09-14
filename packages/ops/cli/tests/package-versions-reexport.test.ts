import { NEBUTRA_PACKAGE_VERSIONS as PRESET_REGISTRY } from "@nebutra/preset/nebutra-package-versions";
import { describe, expect, it } from "vitest";
import {
  getNebutraPackageVersion,
  getNebutraPackageVersionOrNull,
  getNebutraPackageVersionOrThrow,
  NEBUTRA_PACKAGE_VERSIONS,
} from "../src/utils/nebutra-versions";

describe("nebutra CLI package-versions re-export", () => {
  it("shares the preset registry object (no local duplicate map)", () => {
    expect(Object.keys(NEBUTRA_PACKAGE_VERSIONS).length).toBeGreaterThan(10);
    // Identity, which is what "no local duplicate map" actually means. The
    // assertion here used to be `toMatch(/^\^0\./)` — a stand-in for "looks
    // like a version" that quietly asserted the whole scoped graph was still
    // on 0.x. It outlived that: the registry had drifted to ^0.2.3 while npm
    // carried 1.1.2, so the test was pinning the staleness rather than
    // catching it, and it failed the release that finally corrected it.
    expect(NEBUTRA_PACKAGE_VERSIONS).toBe(PRESET_REGISTRY);
  });

  it("carries a usable caret range for every entry", () => {
    // What the old regex was reaching for, without an opinion on the era.
    for (const [name, range] of Object.entries(NEBUTRA_PACKAGE_VERSIONS)) {
      expect(range, name).toMatch(/^\^\d+\.\d+\.\d+/);
    }
  });

  it("keeps null-returning getNebutraPackageVersion for nebutra add", () => {
    expect(getNebutraPackageVersion("@nebutra/ui")).toBe(NEBUTRA_PACKAGE_VERSIONS["@nebutra/ui"]);
    expect(getNebutraPackageVersion("@nebutra/not-a-real-package")).toBeNull();
    expect(getNebutraPackageVersionOrNull("@nebutra/not-a-real-package")).toBeNull();
  });

  it("exposes a throwing alias for strict call sites", () => {
    expect(getNebutraPackageVersionOrThrow("@nebutra/ui")).toBe(
      NEBUTRA_PACKAGE_VERSIONS["@nebutra/ui"],
    );
    expect(() => getNebutraPackageVersionOrThrow("@nebutra/not-a-real-package")).toThrow();
  });
});
