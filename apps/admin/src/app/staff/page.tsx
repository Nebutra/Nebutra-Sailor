import { canPlatform } from "@nebutra/permissions";
import { PageTitle, Panel } from "@/components/panel";
import { GrantStaffButton, RevokeStaffButton } from "@/components/staff-controls";
import { StatusDot } from "@/components/status-dot";
import { relativeTime } from "@/lib/format";
import { requireStaff } from "@/lib/staff";
import { listStaffGrants } from "@/lib/staff-api";

export const dynamic = "force-dynamic";
export const metadata = { title: "Staff" };

const ROLE_LABEL: Record<string, string> = {
  platform_owner: "Owner",
  platform_operator: "Operator",
  platform_support: "Support",
  platform_readonly: "Read-only",
};

const TH =
  "h-9 whitespace-nowrap border-border border-b bg-muted/40 px-3 text-left font-medium text-muted-foreground text-xs leading-4";

/**
 * Staff — who may operate the platform. Rows come from the gateway's staff
 * endpoint, the same one the CLI and the MCP tools use, so what is listed here
 * is what an agent sees. Revoked grants stay listed: revocation is a tombstone.
 * Grant and revoke show only to an owner; the gateway enforces it regardless.
 */
export default async function StaffPage() {
  const staff = await requireStaff();
  const canWrite = canPlatform(staff.role, "grant", "PlatformStaff");
  const result = await listStaffGrants(staff);
  const now = Date.now();

  return (
    <>
      <PageTitle
        title="Staff"
        subtitle="Who may operate the platform. Separate from workspace roles."
        actions={canWrite ? <GrantStaffButton /> : undefined}
      />
      <Panel
        title="Platform access"
        count={result.ok ? result.data.staff.filter((s) => s.active).length : undefined}
        description="Active grants first. Revoked grants stay listed with their note."
      >
        {result.ok ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className={TH}>Person</th>
                  <th className={TH}>Role</th>
                  <th className={TH}>Status</th>
                  <th className={TH}>Granted</th>
                  <th className={TH}>Note</th>
                  <th className={TH}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.data.staff.map((row) => {
                  const label = row.email ?? row.name ?? row.userId;
                  return (
                    <tr key={row.userId} className="border-border border-b last:border-b-0">
                      <td className="h-11 px-3">
                        <div className="font-medium leading-5">{label}</div>
                        {row.email && row.name ? (
                          <div className="text-muted-foreground text-xs">{row.name}</div>
                        ) : null}
                      </td>
                      <td className="px-3">{ROLE_LABEL[row.role] ?? row.role}</td>
                      <td className="px-3">
                        <span className="inline-flex items-center gap-2">
                          <StatusDot tone={row.active ? "ok" : "bad"} />
                          {row.active ? "Active" : "Revoked"}
                        </span>
                      </td>
                      <td
                        className="px-3 text-muted-foreground text-xs"
                        title={row.revokedAt ?? row.grantedAt}
                      >
                        {row.active
                          ? `${relativeTime(row.grantedAt, now)} by ${row.grantedBy?.email ?? "bootstrap"}`
                          : `revoked ${relativeTime(row.revokedAt, now)}`}
                      </td>
                      <td className="max-w-64 truncate px-3 text-muted-foreground text-xs">
                        {row.note ?? "—"}
                      </td>
                      <td className="px-3 text-right">
                        {canWrite && row.active ? (
                          <RevokeStaffButton userId={row.userId} label={label} />
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p role="alert" className="px-4 py-4 text-destructive-strong text-sm">
            <span className="font-mono text-xs">{result.code}</span> · {result.message}
          </p>
        )}
      </Panel>
    </>
  );
}
