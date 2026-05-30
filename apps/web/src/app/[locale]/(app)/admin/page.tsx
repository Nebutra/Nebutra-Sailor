import "server-only";
import {
  ChartActivity as Activity,
  Dollar as DollarSign,
  External as ExternalLink,
  Sparkles,
} from "@nebutra/icons";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { Card } from "@nebutra/ui/layout";
import { AccessInviteIssuer } from "@/components/admin/access-invite-issuer";
import { listAdminDirectory } from "@/components/admin/admin-directory-data";
import { AdminDirectoryPanel } from "@/components/admin/admin-directory-panel";

/**
 * Minimal admin dashboard.
 *
 * This page is deliberately thin. Per Silicon Valley best practice, full
 * user/org CRUD and customer-support flows belong in Retool/Metabase wired
 * to the internal API, not in self-built UI. See docs/admin/retool-recipe.md.
 *
 * What lives here: high-leverage, at-a-glance product signals.
 *   - MRR / ARR
 *   - AI cost (last 7d)
 *   - Active users
 *
 * Wire real values via @nebutra/metering + @nebutra/billing aggregations.
 */

const STATS: ReadonlyArray<{
  label: string;
  hint: string;
  value: string;
  icon: typeof DollarSign;
}> = [
  {
    label: "MRR / ARR",
    hint: "Recurring revenue: wire from @nebutra/billing",
    value: "TBD",
    icon: DollarSign,
  },
  {
    label: "AI cost (last 7d)",
    hint: "Provider spend: wire from @nebutra/metering",
    value: "TBD",
    icon: Sparkles,
  },
  {
    label: "Active users (7d)",
    hint: "DAU/WAU: wire from session events",
    value: "TBD",
    icon: Activity,
  },
];

type AdminSearchParams = Promise<Record<string, string | string[] | undefined>>;

function readParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function RetoolBanner() {
  return (
    <div
      className="mb-6 rounded-[var(--radius-xl)] border p-4"
      style={{
        background: "var(--brand-gradient)",
      }}
    >
      <div className="rounded-[var(--radius-lg)] bg-[var(--neutral-1)] p-4">
        <div className="flex items-start gap-3">
          <ExternalLink
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-[color:var(--brand-primary)]"
          />
          <p className="text-sm text-neutral-12">
            This is a deliberately minimal admin. For user/org CRUD, customer support flows, and
            content ops, see{" "}
            <code className="rounded bg-neutral-3 px-1.5 py-0.5 font-mono text-neutral-12 text-xs">
              docs/admin/retool-recipe.md
            </code>{" "}
            Wire Retool to the internal API in 30 minutes.
          </p>
        </div>
      </div>
    </div>
  );
}

function ChartPlaceholder({ label }: { label: string }) {
  return (
    <div
      role="img"
      aria-label={`${label} chart placeholder`}
      className="mt-4 flex h-24 items-center justify-center rounded-[var(--radius-md)] border border-dashed border-neutral-7 bg-neutral-2 text-neutral-10 text-xs"
    >
      chart: wire real data
    </div>
  );
}

export default async function AdminPage({ searchParams }: { searchParams: AdminSearchParams }) {
  const params = await searchParams;
  const directory = await listAdminDirectory({
    query: readParam(params.q),
    page: readParam(params.page),
    pageSize: readParam(params.pageSize),
  });

  return (
    <>
      <RetoolBanner />

      <AnimateInGroup stagger="fast" className="grid gap-4 md:grid-cols-3">
        {STATS.map(({ label, hint, value, icon: Icon }) => (
          <AnimateIn key={label} preset="fadeUp">
            <Card className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-neutral-11">{label}</h3>
                <Icon className="size-4 text-[color:var(--brand-primary)]" />
              </div>
              <p className="mt-3 text-3xl font-semibold text-neutral-12">{value}</p>
              <p className="mt-1 text-neutral-10 text-xs">{hint}</p>
              <ChartPlaceholder label={label} />
            </Card>
          </AnimateIn>
        ))}
      </AnimateInGroup>

      <AnimateIn preset="fadeUp">
        <Card className="mt-6 p-4 sm:p-6">
          <h3 className="text-sm font-medium text-neutral-12">Escape hatches</h3>
          <p className="mt-1 text-neutral-10 text-xs">
            Debug-only utilities. Not a substitute for Retool flows.
          </p>
          <ul className="mt-3 space-y-1.5 text-neutral-11 text-sm">
            <li>
              <code className="font-mono text-xs">POST /api/admin/impersonate</code>
              {": "}
              start a session as another user (signed cookie, audited)
            </li>
          </ul>
        </Card>
      </AnimateIn>

      <AnimateIn preset="fadeUp">
        <AccessInviteIssuer />
      </AnimateIn>

      <AnimateIn preset="fadeUp">
        <AdminDirectoryPanel
          query={directory.query}
          page={directory.page}
          pageSize={directory.pageSize}
          users={directory.users}
          organizations={directory.organizations}
          totalUsers={directory.totalUsers}
          totalOrganizations={directory.totalOrganizations}
        />
      </AnimateIn>
    </>
  );
}
