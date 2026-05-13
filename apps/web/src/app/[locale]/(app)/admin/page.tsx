import "server-only";
import {
  ChartActivity as Activity,
  Dollar as DollarSign,
  External as ExternalLink,
  Sparkles,
} from "@nebutra/icons";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { Card } from "@nebutra/ui/layout";

/**
 * Minimal admin dashboard.
 *
 * This page is deliberately thin. Per Silicon Valley best practice, full
 * user/org CRUD and customer-support flows belong in Retool/Metabase wired
 * to the internal API — not in self-built UI. See docs/admin/retool-recipe.md.
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
    hint: "Recurring revenue — wire from @nebutra/billing",
    value: "—",
    icon: DollarSign,
  },
  {
    label: "AI cost (last 7d)",
    hint: "Provider spend — wire from @nebutra/metering",
    value: "—",
    icon: Sparkles,
  },
  {
    label: "Active users (7d)",
    hint: "DAU/WAU — wire from session events",
    value: "—",
    icon: Activity,
  },
];

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
            className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--brand-primary)]"
          />
          <p className="text-sm text-neutral-12 dark:text-white">
            This is a deliberately minimal admin. For user/org CRUD, customer support flows, and
            content ops, see{" "}
            <code className="rounded bg-neutral-3 px-1.5 py-0.5 font-mono text-xs text-neutral-12 dark:bg-white/10 dark:text-white">
              docs/admin/retool-recipe.md
            </code>{" "}
            — wire Retool to the internal API in 30 minutes.
          </p>
        </div>
      </div>
    </div>
  );
}

function ChartPlaceholder({ label }: { label: string }) {
  return (
    <div
      aria-label={`${label} chart placeholder`}
      className="mt-4 flex h-24 items-center justify-center rounded-md border border-dashed border-neutral-7 bg-neutral-2 text-xs text-neutral-10 dark:border-white/10 dark:bg-white/5 dark:text-white/40"
    >
      chart — wire real data
    </div>
  );
}

export default function AdminPage() {
  return (
    <>
      <RetoolBanner />

      <AnimateInGroup stagger="fast" className="grid gap-4 md:grid-cols-3">
        {STATS.map(({ label, hint, value, icon: Icon }) => (
          <AnimateIn key={label} preset="fadeUp">
            <Card className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-neutral-11 dark:text-white/70">{label}</h3>
                <Icon className="h-4 w-4 text-[color:var(--brand-primary)]" />
              </div>
              <p className="mt-3 text-3xl font-semibold text-neutral-12 dark:text-white">{value}</p>
              <p className="mt-1 text-xs text-neutral-10 dark:text-white/50">{hint}</p>
              <ChartPlaceholder label={label} />
            </Card>
          </AnimateIn>
        ))}
      </AnimateInGroup>

      <AnimateIn preset="fadeUp">
        <Card className="mt-6 p-4 sm:p-6">
          <h3 className="text-sm font-medium text-neutral-12 dark:text-white">Escape hatches</h3>
          <p className="mt-1 text-xs text-neutral-10 dark:text-white/60">
            Debug-only utilities. Not a substitute for Retool flows.
          </p>
          <ul className="mt-3 space-y-1.5 text-sm text-neutral-11 dark:text-white/70">
            <li>
              <code className="font-mono text-xs">POST /api/admin/impersonate</code>
              {" — "}
              start a session as another user (signed cookie, audited)
            </li>
          </ul>
        </Card>
      </AnimateIn>
    </>
  );
}
