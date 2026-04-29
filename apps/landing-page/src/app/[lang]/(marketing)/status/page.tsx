import type { Metadata } from "next";
import { connection } from "next/server";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { FooterMinimal, Navbar } from "@/components/landing";
import type { Locale } from "@/i18n/routing";
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

const stateClassName: Record<ServiceState, string> = {
  operational: "bg-[color:var(--green-3)] text-[color:var(--green-11)] ring-[color:var(--green-7)]",
  degraded: "bg-[color:var(--amber-3)] text-[color:var(--amber-11)] ring-[color:var(--amber-7)]",
  outage: "bg-[color:var(--red-3)] text-[color:var(--red-11)] ring-[color:var(--red-7)]",
  unknown:
    "bg-[color:var(--neutral-3)] text-[color:var(--neutral-11)] ring-[color:var(--neutral-7)]",
};

const dotClassName: Record<ServiceState, string> = {
  operational: "bg-[color:var(--green-9)]",
  degraded: "bg-[color:var(--amber-9)]",
  outage: "bg-[color:var(--red-9)]",
  unknown: "bg-[color:var(--neutral-9)]",
};

const formatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "medium",
  timeZone: "UTC",
});

export function generateMetadata(): Metadata {
  return {
    title: "Nebutra Status",
    description: "Live operational status for Nebutra public services.",
    alternates: {
      canonical: "https://status.nebutra.com",
    },
    robots: {
      index: true,
      follow: true,
    },
  };
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
      className="min-h-screen overflow-hidden bg-[color:var(--neutral-1)] text-[color:var(--neutral-12)] dark:bg-black dark:text-white"
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
        className="absolute left-1/2 top-28 -z-10 h-[620px] w-[620px] -translate-x-1/2 rounded-full border border-[color:var(--neutral-5)] opacity-50 dark:border-white/10"
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

            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--neutral-9)] dark:text-white/45">
              Nebutra status
            </p>
            <h1 className="max-w-3xl text-balance text-5xl font-black tracking-[-0.06em] md:text-7xl">
              {overall.title}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[color:var(--neutral-10)] dark:text-white/58">
              {overall.description}
            </p>
          </div>

          <div className="rounded-[2rem] border border-[color:var(--neutral-5)] bg-white/75 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--neutral-9)] dark:text-white/40">
                  Last checked
                </p>
                <p className="mt-2 text-sm font-medium text-[color:var(--neutral-12)] dark:text-white">
                  {formatCheckedAt(snapshot.checkedAt)}
                </p>
              </div>
              <a
                href="/status.json"
                className="rounded-full border border-[color:var(--neutral-5)] px-4 py-2 text-sm font-semibold text-[color:var(--neutral-11)] transition hover:border-[color:var(--neutral-8)] hover:text-[color:var(--neutral-12)] dark:border-white/10 dark:text-white/60 dark:hover:border-white/25 dark:hover:text-white"
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
              className="rounded-[1.5rem] border border-[color:var(--neutral-5)] bg-white/70 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-white/[0.035]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold tracking-[-0.03em]">{service.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--neutral-10)] dark:text-white/55">
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
              <p className="mt-4 text-sm text-[color:var(--neutral-10)] dark:text-white/50">
                {service.note}
              </p>
            </article>
          ))}
        </div>

        <section className="mt-12 rounded-[2rem] border border-[color:var(--neutral-5)] bg-[color:var(--neutral-2)] p-6 dark:border-white/10 dark:bg-white/[0.03]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--neutral-9)] dark:text-white/40">
            Incident history
          </p>
          <div className="mt-5 flex items-start gap-4">
            <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[color:var(--green-9)]" />
            <div>
              <h2 className="text-lg font-bold tracking-[-0.03em]">No active incident record.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--neutral-10)] dark:text-white/55">
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
        <div className="h-[420px] animate-pulse rounded-[2rem] border border-[color:var(--neutral-5)] bg-[color:var(--neutral-2)] dark:border-white/10 dark:bg-white/[0.04]" />
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--neutral-4)] bg-[color:var(--neutral-1)] p-4 dark:border-white/10 dark:bg-black/30">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--neutral-9)] dark:text-white/35">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black tracking-[-0.05em]">{value}</p>
    </div>
  );
}

function StatusDatum({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[color:var(--neutral-2)] p-3 dark:bg-white/[0.04]">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--neutral-9)] dark:text-white/35">
        {label}
      </dt>
      <dd className="mt-1 font-semibold text-[color:var(--neutral-12)] dark:text-white">{value}</dd>
    </div>
  );
}
