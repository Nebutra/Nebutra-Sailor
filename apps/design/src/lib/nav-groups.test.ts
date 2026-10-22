import { describe, expect, it } from "vitest";
import { groupForPath, NAV_GROUPS } from "./nav-groups";

describe("groupForPath", () => {
  it("places every top-level route in exactly one group", () => {
    const expected: Record<string, string> = {
      "/design": "design",
      "/tokens": "design",
      "/tokens/motion": "design",
      "/patterns/modality": "design",
      "/accessibility": "design",
      "/develop": "develop",
      "/components": "develop",
      "/components/button": "develop",
      "/showcase": "develop",
      "/adoption": "develop",
      "/ecosystem": "ecosystem",
      "/palette": "ecosystem",
      "/motion-lab": "ecosystem",
      "/icons": "ecosystem",
      "/brand": "resources",
    };
    for (const [path, id] of Object.entries(expected)) {
      expect(groupForPath(path)?.id, path).toBe(id);
    }
  });

  it("has no group for the home page or an unknown route", () => {
    expect(groupForPath("/")).toBeNull();
    expect(groupForPath("/nope")).toBeNull();
  });

  it("matches whole segments, not string prefixes", () => {
    expect(groupForPath("/designer")).toBeNull();
    expect(groupForPath("/components-old")).toBeNull();
  });

  it("ignores a trailing slash and a query string", () => {
    expect(groupForPath("/showcase/")?.id).toBe("develop");
    expect(groupForPath("/showcase?tier=core")?.id).toBe("develop");
  });

  it("never claims the same prefix for two groups", () => {
    const seen = new Set<string>();
    for (const group of NAV_GROUPS) {
      for (const prefix of group.prefixes) {
        expect(seen.has(prefix), prefix).toBe(false);
        seen.add(prefix);
      }
    }
  });

  it("links each group to a route that group owns", () => {
    for (const group of NAV_GROUPS) {
      expect(groupForPath(group.href)?.id, group.href).toBe(group.id);
    }
  });
});
