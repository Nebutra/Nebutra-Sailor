import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  RESERVED_SLUGS,
  rejectSlug,
  resolveTenantSlug,
  safeInternalPath,
  tenantPath,
} from "../tenant-path";

const APP_DIR = join(import.meta.dirname, "../../app");

/** Real route segments a slug could shadow, read from the app directory. */
function topLevelRouteSegments(): string[] {
  const segments = new Set<string>();

  const collect = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      // Route groups "(app)" and dynamic segments "[id]" are not URL segments.
      if (entry.name.startsWith("(")) {
        collect(join(dir, entry.name));
        continue;
      }
      if (entry.name.startsWith("[") || entry.name.startsWith("_")) continue;
      segments.add(entry.name);
    }
  };

  collect(APP_DIR);
  return [...segments];
}

describe("reserved slugs", () => {
  it("covers every top-level route a workspace could shadow", () => {
    // The anti-drift mechanism. RESERVED_SLUGS cannot be derived at runtime —
    // it is consulted on the request path and in a client form, neither of
    // which can read the filesystem — so adding a route without reserving its
    // name has to fail here instead of letting a workspace named "billing"
    // quietly shadow /billing.
    const unreserved = topLevelRouteSegments().filter((segment) => !RESERVED_SLUGS.has(segment));

    expect(
      unreserved,
      "these route segments are not reserved — a workspace could claim them and shadow the route. " +
        "Add them to RESERVED_SLUGS in src/lib/tenant-path.ts.",
    ).toEqual([]);
  });

  it("rejects a reserved name before calling it malformed", () => {
    // "settings" satisfies SLUG_PATTERN. Reporting it as malformed would send
    // someone to fix the shape of a name whose shape is fine.
    expect(rejectSlug("settings")).toBe("reserved");
    expect(rejectSlug("SETTINGS")).toBe("reserved");
  });

  it("rejects shapes the router cannot carry", () => {
    expect(rejectSlug("ab")).toBe("malformed");
    expect(rejectSlug("-lead")).toBe("malformed");
    expect(rejectSlug("trail-")).toBe("malformed");
    expect(rejectSlug("Has Space")).toBe("malformed");
  });

  it("accepts an ordinary workspace name", () => {
    expect(rejectSlug("nebutra")).toBeNull();
    expect(rejectSlug("acme-corp")).toBeNull();
  });
});

describe("resolveTenantSlug", () => {
  const memberships = [
    { id: "org_1", slug: "acme" },
    { id: "org_2", slug: "nebutra" },
  ];

  it("resolves a slug the user belongs to", () => {
    expect(resolveTenantSlug("nebutra", memberships)).toEqual({ id: "org_2", slug: "nebutra" });
  });

  it("is case-insensitive on the URL segment", () => {
    expect(resolveTenantSlug("NEBUTRA", memberships)).toEqual({ id: "org_2", slug: "nebutra" });
  });

  it("does not resolve a workspace the user is not in", () => {
    // Membership IS the lookup. A non-member gets null, the route 404s, and
    // nothing reveals whether "someone-elses-co" exists.
    expect(resolveTenantSlug("someone-elses-co", memberships)).toBeNull();
  });

  it("returns null for a missing segment rather than guessing a default", () => {
    expect(resolveTenantSlug(undefined, memberships)).toBeNull();
    expect(resolveTenantSlug("", memberships)).toBeNull();
  });
});

describe("tenantPath", () => {
  it("prefixes an in-app path with its tenant", () => {
    expect(tenantPath("acme", "/settings")).toBe("/acme/settings");
    expect(tenantPath("acme", "settings/team")).toBe("/acme/settings/team");
  });

  it("does not leave a trailing slash on the tenant root", () => {
    expect(tenantPath("acme", "/")).toBe("/acme");
  });
});

describe("safeInternalPath", () => {
  it("keeps an ordinary in-app destination", () => {
    expect(safeInternalPath("/settings/team")).toBe("/settings/team");
  });

  it("refuses a protocol-relative URL", () => {
    // The case a startsWith("/") check alone lets through: a browser reads
    // "//evil.com" as a host and leaves the site.
    expect(safeInternalPath("//evil.com")).toBe("/dashboard");
    expect(safeInternalPath("/\\evil.com")).toBe("/dashboard");
  });

  it("refuses an absolute or scheme URL", () => {
    expect(safeInternalPath("https://evil.com/steal")).toBe("/dashboard");
    expect(safeInternalPath("javascript:alert(1)")).toBe("/dashboard");
  });

  it("falls back rather than erroring on a missing value", () => {
    expect(safeInternalPath(null)).toBe("/dashboard");
    expect(safeInternalPath(undefined)).toBe("/dashboard");
    expect(safeInternalPath("")).toBe("/dashboard");
  });
});
