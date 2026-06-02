"use cache";

import { getChangelogEntries } from "@nebutra/sanity/queries";
import { AnimateIn } from "@nebutra/ui/components";
import { format as dateFnsFormat } from "date-fns";
import { zhCN } from "date-fns/locale";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { FooterMinimal, Navbar } from "@/components/landing";
import { type Locale, routing } from "@/i18n/routing";

// Static fallback changelog data — same 8 releases from main changelog page
const STATIC_RELEASES = [
  {
    version: "0.10.0",
    date: "2026-03-13",
    tag: "Security",
    tagColor: "var(--cyan-9)",
    title: "ExternalSecrets & RBAC Hardening",
    summary:
      "Production security audit — ExternalSecrets Operator with ClusterSecretStore for AWS Secrets Manager, comprehensive RBAC with least-privilege ServiceAccounts and RoleBindings, Prisma migration automation with K8s init container.",
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
    title: "Analytics Dashboard & Blog Launch",
    summary:
      "Customer insights at your fingertips — analytics dashboard with interactive charts, Sanity-powered blog engine with ISR, and React feature flags with SSR hydration.",
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
    title: "GitOps & SLO Observability",
    summary:
      "Enterprise-grade deployment automation and reliability — ArgoCD GitOps reconciliation, PgBouncer connection pooling, Google SRE burn-rate alerts, and Grafana platform dashboard.",
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
    title: "Usage Metering & Error Tracking",
    summary:
      "Billing-ready infrastructure — fire-and-forget usage metering with Redis counters, Sentry error tracking with tenant context, transactional email system via Resend.",
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
    title: "Settings & Idempotency",
    summary:
      "Self-service control panel — settings pages for team management, API key rotation, billing, and security. Idempotency middleware prevents duplicate charges.",
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
    title: "Observability & Zero-Trust Security",
    summary:
      "Production-hardened infrastructure — Prometheus monitoring, ModSecurity WAF, and zero-trust network policies. Every request traced.",
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
    title: "Multi-Tenant Auth & RBAC",
    summary:
      "Multi-tenant ready — Clerk authentication with organization roles, fine-grained RBAC with 17 typed scopes, AI service proxy routes.",
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
    title: "Turborepo Monorepo & Hono API",
    summary:
      "Foundation release — Turborepo-powered monorepo with 33 packages, Hono API gateway with OpenAPI support, PostgreSQL with pgvector for embeddings.",
    highlights: [
      "Turborepo monorepo — pnpm workspaces, 33 packages, Node 22",
      "Hono API gateway with OpenAPI, idiomatic middleware stack",
      "Prisma + Supabase (PostgreSQL + pgvector)",
    ],
  },
] as const;

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

interface PortableTextChild {
  _key?: string;
  text?: string;
}

interface PortableTextImageAsset {
  url?: string;
  metadata?: {
    dimensions?: {
      width?: number;
      height?: number;
    };
  };
}

type PortableTextBlock =
  | {
      _type?: "block";
      _key?: string;
      style?: "h2" | "h3" | "normal" | string;
      listItem?: "bullet" | "number" | string;
      children?: PortableTextChild[];
    }
  | {
      _type?: "image";
      _key?: string;
      alt?: string;
      asset?: PortableTextImageAsset;
    };

interface CmsEntry {
  _id: string;
  version: string;
  title: string;
  publishedAt: string;
  type?: string;
  summary?: string;
  body?: PortableTextBlock[];
}

/**
 * Simple Portable Text renderer — handles block and image types
 */
function PortableTextRenderer({ blocks }: { blocks: PortableTextBlock[] }) {
  if (!blocks || blocks.length === 0) return null;

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none space-y-4">
      {blocks.map((block, idx) => {
        const blockKey = block._key ?? `${block._type ?? "block"}-${idx}`;
        if (block._type === "block") {
          const text = block.children?.map((child) => child.text ?? "").join("") || "";
          if (block.style === "h2") {
            return (
              <h2 key={blockKey} className="text-lg font-semibold mt-6 mb-3">
                {text}
              </h2>
            );
          }
          if (block.style === "h3") {
            return (
              <h3 key={blockKey} className="text-base font-semibold mt-4 mb-2">
                {text}
              </h3>
            );
          }
          if (block.listItem === "bullet") {
            return (
              <li key={blockKey} className="list-disc ml-4">
                {text}
              </li>
            );
          }
          if (block.listItem === "number") {
            return (
              <li key={blockKey} className="list-decimal ml-4">
                {text}
              </li>
            );
          }
          return (
            <p key={blockKey} className="text-sm leading-relaxed">
              {text}
            </p>
          );
        }

        if (block._type === "image" && block.asset?.url) {
          const width = block.asset.metadata?.dimensions?.width ?? 960;
          const height = block.asset.metadata?.dimensions?.height ?? 540;

          return (
            <Image
              key={blockKey}
              src={block.asset.url}
              alt={block.alt || "Changelog image"}
              width={width}
              height={height}
              sizes="(min-width: 768px) 720px, 100vw"
              className="rounded-[var(--radius-lg)] max-w-full h-auto mt-4 mb-4"
            />
          );
        }

        return null;
      })}
    </div>
  );
}

/**
 * Generate static parameters for all locales × all versions
 */
export async function generateStaticParams() {
  const params: Array<{ lang: string; version: string }> = [];

  // Get versions from CMS, fall back to static data
  const cmsEntries: CmsEntry[] = await getChangelogEntries().catch(() => []);
  const versions =
    cmsEntries.length > 0
      ? cmsEntries.map((e) => e.version)
      : STATIC_RELEASES.map((r) => r.version);

  // Generate params for each locale × version
  for (const locale of routing.locales) {
    for (const version of versions) {
      params.push({ lang: locale, version });
    }
  }

  return params;
}

/**
 * Generate dynamic metadata for each version page
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; version: string }>;
}): Promise<Metadata> {
  const { lang, version } = await params;

  if (!hasLocale(routing.locales, lang)) return {};

  // Try CMS first
  const cmsEntries: CmsEntry[] = await getChangelogEntries().catch(() => []);
  const cmsEntry = cmsEntries.find((e) => e.version === version);

  if (cmsEntry) {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nebutra.com";
    const canonicalUrl = lang === "en" ? `/changelog/${version}` : `/${lang}/changelog/${version}`;
    const title = `v${version}: ${cmsEntry.title} — Nebutra Changelog`;
    const description = cmsEntry.summary || cmsEntry.title;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `${baseUrl}${canonicalUrl}`,
        type: "article",
        publishedTime: cmsEntry.publishedAt,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
      },
      alternates: {
        canonical: canonicalUrl,
      },
    };
  }

  // Fall back to static data
  const staticRelease = STATIC_RELEASES.find((r) => r.version === version);
  if (staticRelease) {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nebutra.com";
    const canonicalUrl = lang === "en" ? `/changelog/${version}` : `/${lang}/changelog/${version}`;
    const title = `v${version}: ${staticRelease.title} — Nebutra Changelog`;
    const description = staticRelease.summary;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `${baseUrl}${canonicalUrl}`,
        type: "article",
        publishedTime: new Date(staticRelease.date).toISOString(),
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
      },
      alternates: {
        canonical: canonicalUrl,
      },
    };
  }

  return {};
}

/**
 * Individual changelog version page component
 */
export default async function ChangelogVersionPage({
  params,
}: {
  params: Promise<{ lang: string; version: string }>;
}) {
  const { lang, version } = await params;

  if (!hasLocale(routing.locales, lang)) {
    notFound();
  }

  setRequestLocale(lang as Locale);

  // Try CMS first
  const cmsEntries: CmsEntry[] = await getChangelogEntries().catch(() => []);
  const cmsEntry = cmsEntries.find((e) => e.version === version);

  if (cmsEntry) {
    const date = new Date(cmsEntry.publishedAt);
    const isZh = lang === "zh";
    const formattedDate = Number.isNaN(date.getTime())
      ? cmsEntry.publishedAt
      : dateFnsFormat(
          date,
          isZh ? "yyyy年M月d日" : "MMMM d, yyyy",
          isZh ? { locale: zhCN } : undefined,
        );

    return (
      <main
        id="main-content"
        className="min-h-screen bg-[var(--neutral-1)] text-[var(--neutral-12)]"
      >
        <Navbar />

        <article className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
          <AnimateIn preset="fadeUp">
            {/* Back link */}
            <div className="mb-8">
              <Link
                href="/changelog"
                className="inline-flex items-center text-sm font-medium text-[var(--blue-9)] hover:underline"
              >
                ← All releases
              </Link>
            </div>

            {/* Version header */}
            <header className="mb-8">
              <div className="mb-4 flex items-center gap-3">
                <span
                  className="inline-block rounded-full px-3 py-1 text-xs font-semibold text-white"
                  style={{
                    backgroundColor: TAG_COLORS[cmsEntry.type || "feature"] || TAG_COLORS.feature,
                  }}
                >
                  {cmsEntry.type || "Feature"}
                </span>
                <time className="text-sm text-[var(--neutral-11)]">{formattedDate}</time>
              </div>

              <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
                v{version}: {cmsEntry.title}
              </h1>

              {cmsEntry.summary && (
                <p className="mt-4 text-lg text-[var(--neutral-11)]">{cmsEntry.summary}</p>
              )}
            </header>

            {/* Body content */}
            {cmsEntry.body ? (
              <PortableTextRenderer blocks={cmsEntry.body} />
            ) : cmsEntry.summary ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ul className="list-disc space-y-2 pl-4">
                  {cmsEntry.summary
                    .split("\n")
                    .filter(Boolean)
                    .map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                </ul>
              </div>
            ) : null}

            {/* Version navigation */}
            <nav className="mt-12 flex justify-between border-t border-[var(--neutral-7)] pt-8">
              {/* Previous version */}
              {(() => {
                const currentIdx = cmsEntries.findIndex((e) => e.version === version);
                const prevEntry = currentIdx > 0 ? cmsEntries[currentIdx - 1] : null;
                return prevEntry ? (
                  <Link
                    href={`/changelog/${prevEntry.version}`}
                    className="text-sm font-medium text-[var(--blue-9)] hover:underline"
                  >
                    ← v{prevEntry.version}
                  </Link>
                ) : (
                  <div />
                );
              })()}

              {/* Next version */}
              {(() => {
                const currentIdx = cmsEntries.findIndex((e) => e.version === version);
                const nextEntry =
                  currentIdx >= 0 && currentIdx < cmsEntries.length - 1
                    ? cmsEntries[currentIdx + 1]
                    : null;
                return nextEntry ? (
                  <Link
                    href={`/changelog/${nextEntry.version}`}
                    className="text-sm font-medium text-[var(--blue-9)] hover:underline"
                  >
                    v{nextEntry.version} →
                  </Link>
                ) : (
                  <div />
                );
              })()}
            </nav>
          </AnimateIn>
        </article>

        <FooterMinimal />
      </main>
    );
  }

  // Fall back to static data
  const staticRelease = STATIC_RELEASES.find((r) => r.version === version);

  if (!staticRelease) {
    notFound();
  }

  const date = new Date(staticRelease.date);
  const isZhStatic = lang === "zh";
  const formattedDate = Number.isNaN(date.getTime())
    ? staticRelease.date
    : dateFnsFormat(
        date,
        isZhStatic ? "yyyy年M月d日" : "MMMM d, yyyy",
        isZhStatic ? { locale: zhCN } : undefined,
      );

  // Find previous and next in static releases
  const currentIdx = STATIC_RELEASES.findIndex((r) => r.version === version);
  const prevRelease = currentIdx > 0 ? STATIC_RELEASES[currentIdx - 1] : null;
  const nextRelease =
    currentIdx >= 0 && currentIdx < STATIC_RELEASES.length - 1
      ? STATIC_RELEASES[currentIdx + 1]
      : null;

  return (
    <main id="main-content" className="min-h-screen bg-[var(--neutral-1)] text-[var(--neutral-12)]">
      <Navbar />

      <article className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
        <AnimateIn preset="fadeUp">
          {/* Back link */}
          <div className="mb-8">
            <Link
              href="/changelog"
              className="inline-flex items-center text-sm font-medium text-[var(--blue-9)] hover:underline"
            >
              ← All releases
            </Link>
          </div>

          {/* Version header */}
          <header className="mb-8">
            <div className="mb-4 flex items-center gap-3">
              <span
                className="inline-block rounded-full px-3 py-1 text-xs font-semibold text-white"
                style={{ backgroundColor: staticRelease.tagColor }}
              >
                {staticRelease.tag}
              </span>
              <time className="text-sm text-[var(--neutral-11)]">{formattedDate}</time>
            </div>

            <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
              v{version}: {staticRelease.title}
            </h1>

            {staticRelease.summary && (
              <p className="mt-4 text-lg text-[var(--neutral-11)]">{staticRelease.summary}</p>
            )}
          </header>

          {/* Highlights as bullet list */}
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ul className="list-disc space-y-3 pl-4">
              {staticRelease.highlights.map((highlight) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>
          </div>

          {/* Version navigation */}
          <nav className="mt-12 flex justify-between border-t border-[var(--neutral-7)] pt-8">
            {prevRelease ? (
              <Link
                href={`/changelog/${prevRelease.version}`}
                className="text-sm font-medium text-[var(--blue-9)] hover:underline"
              >
                ← v{prevRelease.version}
              </Link>
            ) : (
              <div />
            )}

            {nextRelease ? (
              <Link
                href={`/changelog/${nextRelease.version}`}
                className="text-sm font-medium text-[var(--blue-9)] hover:underline"
              >
                v{nextRelease.version} →
              </Link>
            ) : (
              <div />
            )}
          </nav>
        </AnimateIn>
      </article>

      <FooterMinimal />
    </main>
  );
}
