import "server-only";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ConsoleShell } from "@/components/admin-platform/console-shell";
import type { ConsoleTab } from "@/components/admin-platform/console-tabs";
import { cachedInbox, fleetSize } from "@/lib/admin-platform/console-data";
import { environmentLabel } from "@/lib/admin-platform/format";
import { getStaffContext, type StaffContext } from "@/lib/admin-platform/staff";

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
 *
 * ConsoleShell/ConsoleTabs/CommandPalette below are ported from apps/admin's
 * root layout, unmodified except for the tab hrefs (nested under
 * /admin/platform instead of being the app root).
 */
async function tabsFor(staff: StaffContext): Promise<ConsoleTab[]> {
  let inboxCount: number | undefined;
  try {
    inboxCount = (await cachedInbox({ userId: staff.userId, role: staff.role })).items.length;
  } catch {
    inboxCount = undefined;
  }
  return [
    { href: "/admin/platform", label: "Inbox", count: inboxCount },
    { href: "/admin/platform/fleet", label: "Fleet", count: fleetSize },
    { href: "/admin/platform/supply", label: "Supply" },
    { href: "/admin/platform/tenants", label: "Customers", disabled: true },
    { href: "/admin/platform/staff", label: "Staff", disabled: true },
    { href: "/admin/platform/trust", label: "Trust", disabled: true },
  ];
}

export default async function PlatformAdminLayout({ children }: { children: ReactNode }) {
  const staff = await getStaffContext();
  if (!staff) {
    redirect("/admin");
  }

  return (
    <ConsoleShell staff={staff} environment={environmentLabel()} tabs={await tabsFor(staff)}>
      {children}
    </ConsoleShell>
  );
}
