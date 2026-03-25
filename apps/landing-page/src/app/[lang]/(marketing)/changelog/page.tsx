import { getChangelogEntries } from "@nebutra/sanity/queries";
import { AnimateIn } from "@nebutra/ui/components";
import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { FooterMinimal, Navbar } from "@/components/landing";
import { type Locale, routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ lang: locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(routing.locales, lang)) return {};
  return {
    title: "Changelog — Nebutra",
    description: "Every release, shipped with obsessive attention to detail.",
    alternates: { canonical: `/${lang}/changelog` },
  };
}

const TAG_COLORS: Record<string, string> = {
  feature: "var(--cyan-9)",
  improvement: "var(--status-warning)",
  fix: "var(--status-success)",
  breaking: "var(--status-danger)",
  security: "var(--cyan-9)",
  platform: "var(--status-warning)",
  infrastructure: "var(--brand-tertiary)",
  major: "var(--blue-9)",
  foundation: "var(--status-success)",
};

// Static fallback data used when Sanity CMS has no entries yet
const STATIC_RELEASES = [
  {
    version: "0.10.0",
    date: "2026-03-13",
    tag: "Security",
    tagColor: "var(--cyan-9)",
    highlights: [
      "ExternalSecrets Operator — ClusterSecretStore + ExternalSecret CRDs for AWS Secrets Manager",
      "RBAC — ServiceAccounts + least-privilege Roles + RoleBindings for all 11 workloads",
      "Prisma migrate:deploy — production migration script + K8s init container on api-gateway",
      "Storybook component stories — Card, PageHeader, EmptyState, AnimateIn, LoadingState, ErrorState",
    ],
  },
  {
    version: "0.9.1",
    date: "2026-03-13",
    tag: "Platform",
    tagColor: "var(--status-warning)",
    highlights: [
      "Analytics dashboard — recharts AreaChart + BarChart for 30-day funnel and revenue trends",
      "Blog powered by Sanity CMS — index + post pages with ISR, OG metadata, prose rendering",
      "Feature flag React hooks — FeatureFlagProvider, useFeatureFlag, useFlags with SSR hydration",
    ],
  },
  {
    version: "0.9.0",
    date: "2026-03-13",
    tag: "Major",
    tagColor: "var(--blue-9)",
    highlights: [
      "ArgoCD GitOps — production deployments now auto-reconcile from main branch",
      "PgBouncer connection pooler (transaction mode, 1,000 client connections on 20 server connections)",
      "SLO burn-rate alerts — multi-window Google SRE methodology (14.4×/6×/3×)",
      "Grafana platform dashboard — 32 panels, SLO + HPA + resource usage",
    ],
  },
  {
    version: "0.8.0",
    date: "2026-03-03",
    tag: "Feature",
    tagColor: "var(--cyan-9)",
    highlights: [
      "Usage metering middleware — fire-and-forget Redis counters per tenant / billing period",
      "Sentry server-side + client-side error tracking with tenant context",
      "Transactional email package (Resend): welcome, API key creation, quota warnings, invites",
    ],
  },
  {
    version: "0.7.0",
    date: "2026-02-20",
    tag: "Feature",
    tagColor: "var(--cyan-9)",
    highlights: [
      "Settings pages: General, Team, API Keys (SHA-256 hashed, soft-delete), Billing, Security",
      "Idempotency middleware — UUID v4 validation, Redis SET NX, 24-hour response cache",
      "Pricing page — FREE / PRO / ENTERPRISE with gradient-border highlighted card",
    ],
  },
  {
    version: "0.6.0",
    date: "2026-02-08",
    tag: "Infrastructure",
    tagColor: "var(--brand-tertiary)",
    highlights: [
      "Prometheus ServiceMonitor + PrometheusRule for all Node.js and Python services",
      "ModSecurity WAF (DetectionOnly) + OWASP CRS on nginx-ingress with rate limiting",
      "Inter-service NetworkPolicies — zero-trust mesh for every service-to-service call",
    ],
  },
  {
    version: "0.5.0",
    date: "2026-01-25",
    tag: "Platform",
    tagColor: "var(--status-warning)",
    highlights: [
      "Multi-tenant auth — Clerk clerkMiddleware with org membership roles",
      "RBAC permission matrix — 17 typed scopes across OWNER/ADMIN/MEMBER/VIEWER",
      "AI service proxy routes (/api/v1/ai/chat, embeddings, models)",
    ],
  },
  {
    version: "0.4.0",
    date: "2026-01-10",
    tag: "Foundation",
    tagColor: "var(--status-success)",
    highlights: [
      "Turborepo monorepo — pnpm workspaces, 33 packages, Node 22",
      "Hono API gateway with OpenAPI, idiomatic middleware stack",
      "Prisma + Supabase (PostgreSQL + pgvector)",
    ],
  },
] as const;

interface CmsEntry {
  _id: string;
  version: string;
  title: string;
  publishedAt: string;
  type?: string;
  summary?: string;
}

export default async function ChangelogPage({ params }: { params: Promise<{ lang: string }> }) {
  "use cache";
  cacheLife("hours");

  const { lang } = await params;
  setRequestLocale(lang as Locale);

  // Try CMS first, fall back to static data
  const cmsEntries: CmsEntry[] = await getChangelogEntries();
  const useCms = cmsEntries.length > 0;

  const releases = useCms
    ? cmsEntries.map((entry) => {
        const type = entry.type ?? "feature";
        return {
          version: entry.version,
          date: entry.publishedAt?.split("T")[0] ?? "",
          tag: type.charAt(0).toUpperCase() + type.slice(1),
          tagColor: TAG_COLORS[type] ?? "var(--blue-9)",
          highlights: entry.summary ? entry.summary.split("\n").filter(Boolean) : [entry.title],
        };
      })
    : STATIC_RELEASES;

  return (
    <main id="main-content" className="min-h-screen bg-white dark:bg-black">
      <Navbar />

      <section className="mx-auto max-w-3xl px-4 py-24 sm:px-6 lg:px-8">
        {/* Header */}
        <AnimateIn preset="emerge" inView>
          <div className="mb-16">
            <h1
              className="text-4xl font-bold tracking-tight"
              style={{
                background: "var(--brand-gradient)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Changelog
            </h1>
            <p className="mt-4 text-[var(--neutral-11)]">
              Every release, shipped with obsessive attention to detail.
            </p>
          </div>
        </AnimateIn>

        {/* Timeline */}
        <div className="relative">
          <div
            className="absolute left-[11px] top-2 h-full w-0.5"
            style={{ background: "var(--neutral-7)" }}
            aria-hidden
          />

          <ol className="space-y-12">
            {releases.map((release) => (
              <AnimateIn key={release.version} preset="fadeUp" inView>
                <li className="relative pl-8">
                  <div
                    className="absolute left-0 top-1.5 h-[22px] w-[22px] rounded-full border-2 border-white dark:border-black"
                    style={{ background: "var(--brand-gradient)" }}
                    aria-hidden
                  />

                  <div className="flex flex-wrap items-baseline gap-3">
                    <h2 className="text-lg font-bold text-[var(--neutral-12)]">
                      v{release.version}
                    </h2>
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                      style={{ background: release.tagColor }}
                    >
                      {release.tag}
                    </span>
                    {release.date && (
                      <time dateTime={release.date} className="text-sm text-[var(--neutral-11)]">
                        {new Date(release.date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </time>
                    )}
                  </div>

                  <ul className="mt-4 space-y-2">
                    {release.highlights.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2 text-sm text-[var(--neutral-11)]"
                      >
                        <span
                          className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ background: "var(--blue-9)" }}
                          aria-hidden
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </li>
              </AnimateIn>
            ))}
          </ol>
        </div>

        <AnimateIn preset="fade" inView>
          <p className="mt-16 text-center text-sm text-[var(--neutral-11)]">
            Subscribe to release notes via{" "}
            <a
              href="/api/changelog.rss"
              className="font-medium text-[var(--blue-9)] underline-offset-4 hover:underline"
            >
              RSS
            </a>{" "}
            or follow{" "}
            <a
              href="https://x.com/nebutra_ai"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[var(--blue-9)] underline-offset-4 hover:underline"
            >
              @nebutra_ai
            </a>
            .
          </p>
        </AnimateIn>
      </section>

      <FooterMinimal />
    </main>
  );
}
