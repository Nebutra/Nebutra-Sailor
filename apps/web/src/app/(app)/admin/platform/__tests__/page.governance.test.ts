import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Platform control plane, folded in from the standalone @nebutra/admin app
// (nebutra-admin Fly Machine). Guard model is PlatformStaff — deliberately
// distinct from the tenant `admin:access` permission the parent /admin layout
// checks. These are source-level governance assertions (this repo's existing
// pattern for the sibling /admin page — see ../../__tests__/page.governance.test.ts)
// rather than a rendered/auth-mocked test, so they run without a database.
const LAYOUT = join(process.cwd(), "src/app/(app)/admin/platform/layout.tsx");
const INBOX_PAGE = join(process.cwd(), "src/app/(app)/admin/platform/page.tsx");
const FLEET_PAGE = join(process.cwd(), "src/app/(app)/admin/platform/fleet/page.tsx");
const SUPPLY_PAGE = join(process.cwd(), "src/app/(app)/admin/platform/supply/page.tsx");
const SERVER_ACTIONS = join(process.cwd(), "src/lib/admin-platform/server-actions.ts");
const STAFF = join(process.cwd(), "src/lib/admin-platform/staff.ts");
const ACCESS = join(process.cwd(), "src/lib/admin-platform/access-assertion.ts");

describe("platform control-plane guard", () => {
  it("gates on PlatformStaff standing, not the tenant admin:access permission", () => {
    const layout = readFileSync(LAYOUT, "utf8");
    expect(layout).toContain("getStaffContext");
    expect(layout).toContain('redirect("/admin")');
    expect(layout).not.toContain("hasPermission");
    expect(layout).not.toContain("resolveRole(");
  });

  it("resolves staff standing off a verified Cloudflare Access assertion, never a plaintext header", () => {
    const staff = readFileSync(STAFF, "utf8");
    expect(staff).toContain("verifyAccessAssertion");
    expect(staff).toContain("platformStaff.findUnique");
    expect(staff).toContain("revokedAt");
    expect(staff).toContain("cf-access-jwt-assertion");

    const access = readFileSync(ACCESS, "utf8");
    expect(access).toContain("jwtVerify");
  });

  it("renders every console page server-side only", () => {
    for (const page of [INBOX_PAGE, FLEET_PAGE, SUPPLY_PAGE]) {
      expect(readFileSync(page, "utf8")).toContain('import "server-only"');
    }
  });

  it("re-checks PlatformStaff inside every Server Action, not only in the layout", () => {
    const actions = readFileSync(SERVER_ACTIONS, "utf8");
    expect(actions.startsWith('"use server"')).toBe(true);
    const exported = actions.match(/export async function \w+\([\s\S]*?\n}\n/g) ?? [];
    expect(exported.length).toBeGreaterThan(0);
    for (const fn of exported) {
      expect(fn).toContain("requireStaff()");
    }
  });
});
