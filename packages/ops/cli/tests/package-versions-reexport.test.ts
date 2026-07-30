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
    expect(NEBUTRA_PACKAGE_VERSIONS["@nebutra/ui"]).toMatch(/^\^0\./);
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
