import "server-only";
import {
  ChartActivity as Activity,
  Dollar as DollarSign,
  External as ExternalLink,
  Sparkles,
} from "@nebutra/icons";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { Card } from "@nebutra/ui/layout";
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

const DIRECTORY_USERS = [
  {
    id: "user_demo_admin",
    name: "Ada Lovelace",
    email: "ada@nebutra.example",
    organizationName: "Nebutra Labs",
  },
  {
    id: "user_demo_support",
    name: "Grace Hopper",
    email: "grace@compiler.example",
    organizationName: "Compiler Labs",
  },
  {
    id: "user_demo_billing",
    name: "Katherine Johnson",
    email: "katherine@orbit.example",
    organizationName: "Orbit Systems",
  },
] as const;

const DIRECTORY_ORGANIZATIONS = [
  {
    id: "org_demo_nebutra",
    name: "Nebutra Labs",
    slug: "nebutra-labs",
    planName: "Enterprise",
  },
  {
    id: "org_demo_compiler",
    name: "Compiler Labs",
    slug: "compiler-labs",
    planName: "Pro",
  },
  {
    id: "org_demo_orbit",
    name: "Orbit Systems",
    slug: "orbit-systems",
    planName: "Free",
  },
] as const;

type AdminSearchParams = Promise<Record<string, string | string[] | undefined>>;

function readParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function matchesQuery(query: string, values: readonly (string | null | undefined)[]) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return values.some((value) => value?.toLowerCase().includes(needle));
}

function RetoolBanner() {
  return (
    <div
      className="mb-6 rounded-xl border p-4"
      style={{
        background: "var(--brand-gradient)",
      }}
    >
      <div className="rounded-lg bg-[var(--neutral-1)] p-4 dark:bg-neutral-12">
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
      className="mt-4 flex h-24 items-center justify-center rounded-md border border-dashed border-neutral-7 bg-neutral-2 text-neutral-10 text-xs"
    >
      chart: wire real data
    </div>
  );
}

export default async function AdminPage({ searchParams }: { searchParams: AdminSearchParams }) {
  const params = await searchParams;
  const query = readParam(params.q);
  const page = Number.parseInt(readParam(params.page), 10) || 1;
  const users = DIRECTORY_USERS.filter((user) =>
    matchesQuery(query, [user.name, user.email, user.organizationName]),
  );
  const organizations = DIRECTORY_ORGANIZATIONS.filter((organization) =>
    matchesQuery(query, [organization.name, organization.slug, organization.planName]),
  );

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
        <AdminDirectoryPanel
          query={query}
          page={page}
          users={users}
          organizations={organizations}
          totalUsers={users.length}
          totalOrganizations={organizations.length}
        />
      </AnimateIn>
    </>
  );
}
