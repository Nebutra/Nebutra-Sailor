import type { Metadata } from "next";
import { connection } from "next/server";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { FooterMinimal, Navbar } from "@/components/landing";
import type { Locale } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getStatusSnapshot, type ServiceState } from "@/lib/status-checks";

const stateCopy: Record<
  Exclude<ServiceState, "unknown">,
  { label: string; title: string; description: string }
> = {
  operational: {
    label: "All systems operational",
    title: "Nebutra systems are operating normally.",
    description: "Core public surfaces are responding inside their health budget.",
  },
  degraded: {
    label: "Degraded performance",
    title: "Some Nebutra systems need attention.",
    description:
      "At least one monitored surface is slow, partially healthy, or returning warnings.",
  },
  outage: {
    label: "Service disruption",
    title: "A Nebutra surface is currently unavailable.",
    description: "One or more monitored services failed a public health check.",
  },
};

/**
 * A public status badge is a signal the reader acts on, so these are semantic
 * tokens, not the decorative ramps. Foregrounds are the AA-safe steps in both
 * themes: --success 5.11 light / 6.14 dark, --warning-strong 5.40 / 8.08.
 * Outage text uses the registered red-900 ramp (5.32 light / 5.84 dark) rather
 * than `text-destructive`, because --destructive in dark mode is 2.36:1 — a
 * fill-only value. TODO: switch to `text-[hsl(var(--destructive-strong))]` once
 * that token lands in @nebutra/tokens (mirror of --warning-strong).
 */
const stateClassName: Record<ServiceState, string> = {
  operational: "bg-success/10 text-success ring-success/25",
  degraded: "bg-warning/12 text-[hsl(var(--warning-strong))] ring-warning/30",
  outage: "bg-destructive/10 text-[hsl(var(--destructive-strong))] ring-destructive/30",
  unknown: "bg-muted text-muted-foreground ring-[color:hsl(var(--border))]",
};

const dotClassName: Record<ServiceState, string> = {
  operational: "bg-success",
  degraded: "bg-warning",
  outage: "bg-destructive",
  unknown: "bg-[color:hsl(var(--muted-foreground))]",
};

const formatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "medium",
  timeZone: "UTC",
});

/**
 * `/status` is registered `ui`, so the sitemap publishes it as a distinct
 * localized document in every route locale. The previous cross-origin canonical
 * to status.nebutra.com contradicted that outright: 34 published URLs all
 * declaring a different host as their canonical, and — because setting the
 * `alternates` key replaces the layout's wholesale — no hreflang at all. This
 * page renders its own live snapshot from `getStatusSnapshot`, so it is its own
 * document; the external status host is linked from the body, not canonicalized
 * to. Locale now comes from params, which a no-arg generateMetadata could not
 * see.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  return buildPageMetadata({
    title: "Nebutra Status",
    description: "Live operational status for Nebutra public services.",
    path: "/status",
    locale: lang as Locale,
  });
}

function formatCheckedAt(value: string): string {
  return `${formatter.format(new Date(value))} UTC`;
}

export default async function StatusPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang as Locale);

  return (
    <main
      id="main-content"
      className="min-h-screen overflow-hidden bg-background text-foreground dark:bg-black"
    >
      <Navbar />

      <Suspense fallback={<StatusPageSkeleton />}>
        <StatusPageContent />
      </Suspense>

      <FooterMinimal />
    </main>
  );
}

async function StatusPageContent() {
  await connection();
  const snapshot = await getStatusSnapshot();
  const overall = stateCopy[snapshot.overall];

  return (
    <section className="relative isolate px-6 pb-20 pt-32 md:pb-28 md:pt-40">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-16 -z-10 h-[420px] bg-[radial-gradient(circle_at_50%_0%,color-mix(in_srgb,var(--cyan-9)_16%,transparent),transparent_62%)]"
      />
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-28 -z-10 h-[620px] w-[620px] -translate-x-1/2 rounded-full border border-[color:hsl(var(--border))]/40 opacity-50"
      />

      <div className="mx-auto max-w-[1120px]">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)] lg:items-end">
          <div>
            <div
              className={`mb-8 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${stateClassName[snapshot.overall]}`}
            >
              <span
                aria-hidden="true"
                className={`h-1.5 w-1.5 rounded-full ${dotClassName[snapshot.overall]}`}
              />
              {overall.label}
            </div>

            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-[color:hsl(var(--muted-foreground))]">
              Nebutra status
            </p>
            <h1
              className="max-w-3xl text-balance text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold"
              style={{
                letterSpacing: "var(--tracking-display)",
                lineHeight: "var(--leading-display)",
              }}
            >
              {overall.title}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              {overall.description}
            </p>
          </div>

          <div className="rounded-[2rem] border border-[color:hsl(var(--border))] bg-white/75 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:hsl(var(--muted-foreground))]">
                  Last checked
                </p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {formatCheckedAt(snapshot.checkedAt)}
                </p>
              </div>
              <a
                href="/status.json"
                className="rounded-full border border-[color:hsl(var(--border))] px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:border-border hover:text-foreground"
              >
                JSON
              </a>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3">
              <Metric label="Monitors" value={String(snapshot.services.length)} />
              <Metric
                label="Healthy"
                value={String(snapshot.services.filter((s) => s.state === "operational").length)}
              />
              <Metric
                label="Issues"
                value={String(snapshot.services.filter((s) => s.state !== "operational").length)}
              />
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {snapshot.services.map((service) => (
            <article
              key={service.id}
              className="rounded-[1.5rem] border border-[color:hsl(var(--border))] bg-white/70 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold tracking-[-0.03em]">{service.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {service.description}
                  </p>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${stateClassName[service.state]}`}
                >
                  <span
                    aria-hidden="true"
                    className={`h-1.5 w-1.5 rounded-full ${dotClassName[service.state]}`}
                  />
                  {service.state}
                </span>
              </div>
              <dl className="mt-6 grid grid-cols-3 gap-3 text-sm">
                <StatusDatum label="HTTP" value={service.statusCode?.toString() ?? "n/a"} />
                <StatusDatum label="Latency" value={`${service.latencyMs ?? 0} ms`} />
                <StatusDatum label="Checked" value="live" />
              </dl>
              <p className="mt-4 text-sm text-muted-foreground">{service.note}</p>
            </article>
          ))}
        </div>

        <section className="mt-12 rounded-[2rem] border border-[color:hsl(var(--border))] bg-muted p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:hsl(var(--muted-foreground))]">
            Incident history
          </p>
          <div className="mt-5 flex items-start gap-4">
            <span className="mt-1 h-2.5 w-2.5 rounded-full bg-success" />
            <div>
              <h2 className="text-lg font-bold tracking-[-0.03em]">No active incident record.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                This page reports live checks from the public edge. Formal incident posts can be
                added here when maintenance windows or degraded events need customer-facing notes.
              </p>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}

function StatusPageSkeleton() {
  return (
    <section className="px-6 pb-20 pt-32 md:pb-28 md:pt-40">
      <div className="mx-auto max-w-[1120px]">
        <div className="h-[420px] animate-pulse rounded-[2rem] border border-[color:hsl(var(--border))] bg-muted/[0.04]" />
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-2xl)] border border-[color:hsl(var(--muted))] bg-background p-4 dark:bg-black/30">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:hsl(var(--muted-foreground))]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold" style={{ letterSpacing: "var(--tracking-tight)" }}>
        {value}
      </p>
    </div>
  );
}

function StatusDatum({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-2xl)] bg-muted p-3">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:hsl(var(--muted-foreground))]">
        {label}
      </dt>
      <dd className="mt-1 font-semibold text-foreground">{value}</dd>
    </div>
  );
}
