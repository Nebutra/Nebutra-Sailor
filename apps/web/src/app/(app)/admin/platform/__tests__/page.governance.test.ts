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
const PAGE = join(process.cwd(), "src/app/(app)/admin/platform/page.tsx");
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

  it("renders the Fleet domain read-only, from configuration, not a live probe", () => {
    const page = readFileSync(PAGE, "utf8");
    expect(page).toContain("FLEET");
    expect(page).toContain('import "server-only"');
  });
});
