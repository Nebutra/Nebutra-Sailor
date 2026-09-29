import "server-only";
import { PageHeader } from "@nebutra/ui/layout";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getStaffContext } from "@/lib/admin-platform/staff";

/**
 * Platform control-plane surface, folded into @nebutra/web (was the standalone
 * @nebutra/admin app / nebutra-admin Fly Machine — see
 * docs/architecture/2026-09-29-admin-into-web.md).
 *
 * THIS IS NOT THE TENANT ADMIN GUARD ABOVE IT.
 *
 * The parent `/admin` layout gates on the signed-in tenant session's
 * `admin:access` permission — that answers "is this org member allowed to see
 * their org's admin panel". Platform staff standing is a completely different,
 * tenant-independent grant (PlatformStaff row keyed by user id, joined off a
 * Cloudflare Access-verified email) and must not be conflated with it: a tenant
 * `owner` has no standing here, and a platform operator has none inside a
 * tenant. See @/lib/admin-platform/staff for the three-layer model
 * (Cloudflare Access authenticates, PlatformStaff authorises).
 *
 * `getStaffContext()` never throws for "not staff" — it returns null for every
 * reason (no Access assertion, unknown email, revoked grant, bad role string)
 * so this redirect never discloses which one applied.
 */
export default async function PlatformAdminLayout({ children }: { children: ReactNode }) {
  const staff = await getStaffContext();
  if (!staff) {
    redirect("/admin");
  }

  return (
    <div className="mx-auto max-w-wide px-4 py-8">
      <PageHeader
        title="Platform"
        description="Cross-product control plane — fleet, supply, staff. Staff-only."
      />
      <div className="mt-6">{children}</div>
    </div>
  );
}
