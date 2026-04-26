import { getChangelogEntries } from "@nebutra/sanity/queries";

// Static fallback data used when Sanity CMS has no entries
const STATIC_RELEASES = [
  {
    version: "0.10.0",
    date: "2026-03-13T00:00:00Z",
    type: "Security",
    highlights: [
      "ExternalSecrets Operator — ClusterSecretStore + ExternalSecret CRDs for AWS Secrets Manager",
      "RBAC — ServiceAccounts + least-privilege Roles + RoleBindings for all 11 workloads",
      "Prisma migrate:deploy — production migration script + K8s init container on api-gateway",
      "Storybook component stories — Card, PageHeader, EmptyState, AnimateIn, LoadingState, ErrorState",
    ],
  },
  {
    version: "0.9.1",
    date: "2026-03-13T00:00:00Z",
    type: "Platform",
    highlights: [
      "Analytics dashboard — recharts AreaChart + BarChart for 30-day funnel and revenue trends",
      "Blog powered by Sanity CMS — index + post pages with ISR, OG metadata, prose rendering",
      "Feature flag React hooks — FeatureFlagProvider, useFeatureFlag, useFlags with SSR hydration",
    ],
  },
  {
    version: "0.9.0",
    date: "2026-03-13T00:00:00Z",
    type: "Major",
    highlights: [
      "ArgoCD GitOps — production deployments now auto-reconcile from main branch",
      "PgBouncer connection pooler (transaction mode, 1,000 client connections on 20 server connections)",
      "SLO burn-rate alerts — multi-window Google SRE methodology (14.4×/6×/3×)",
      "Grafana platform dashboard — 32 panels, SLO + HPA + resource usage",
    ],
  },
  {
    version: "0.8.0",
    date: "2026-03-03T00:00:00Z",
    type: "Feature",
    highlights: [
      "Usage metering middleware — fire-and-forget Redis counters per tenant / billing period",
      "Sentry server-side + client-side error tracking with tenant context",
      "Transactional email package (Resend): welcome, API key creation, quota warnings, invites",
    ],
  },
  {
    version: "0.7.0",
    date: "2026-02-20T00:00:00Z",
    type: "Feature",
    highlights: [
      "Settings pages: General, Team, API Keys (SHA-256 hashed, soft-delete), Billing, Security",
      "Idempotency middleware — UUID v4 validation, Redis SET NX, 24-hour response cache",
      "Pricing page — FREE / PRO / ENTERPRISE with gradient-border highlighted card",
    ],
  },
  {
    version: "0.6.0",
    date: "2026-02-08T00:00:00Z",
    type: "Infrastructure",
    highlights: [
      "Prometheus ServiceMonitor + PrometheusRule for all Node.js and Python services",
      "ModSecurity WAF (DetectionOnly) + OWASP CRS on nginx-ingress with rate limiting",
      "Inter-service NetworkPolicies — zero-trust mesh for every service-to-service call",
    ],
  },
  {
    version: "0.5.0",
    date: "2026-01-25T00:00:00Z",
    type: "Platform",
    highlights: [
      "Multi-tenant auth — Clerk clerkMiddleware with org membership roles",
      "RBAC permission matrix — 17 typed scopes across OWNER/ADMIN/MEMBER/VIEWER",
      "AI service proxy routes (/api/v1/ai/chat, embeddings, models)",
    ],
  },
  {
    version: "0.4.0",
    date: "2026-01-10T00:00:00Z",
    type: "Foundation",
    highlights: [
      "Turborepo monorepo — pnpm workspaces, 33 packages, Node 22",
      "Hono API gateway with OpenAPI, idiomatic middleware stack",
      "Prisma + Supabase (PostgreSQL + pgvector)",
    ],
  },
];

interface ChangelogEntry {
  _id: string;
  version: string;
  title: string;
  publishedAt: string;
  type?: string;
  summary?: string;
}

function formatRfc2822(dateString: string): string {
  const date = new Date(dateString);
  return date.toUTCString();
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildDescription(highlights: string[]): string {
  const items = highlights.map((h) => `<li>${escapeXml(h)}</li>`).join("\n");
  return `<![CDATA[<ul>\n${items}\n</ul>]]>`;
}

function isNextPrerenderFetchCancellation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    (error as { digest?: unknown }).digest === "HANGING_PROMISE_REJECTION"
  );
}

function logFeedError(label: string, error: unknown) {
  if (!isNextPrerenderFetchCancellation(error)) {
    console.error(label, error);
  }
}

function buildRssXml(entries: (ChangelogEntry | (typeof STATIC_RELEASES)[0])[]): string {
  const items = entries
    .map((entry) => {
      const version = entry.version;
      const pubDate = formatRfc2822(
        "publishedAt" in entry ? (entry.publishedAt ?? "") : entry.date,
      );
      const type = entry.type || "Update";
      const highlights =
        "highlights" in entry
          ? entry.highlights
          : entry.summary
            ? entry.summary.split("\n").filter(Boolean)
            : [];

      return `  <item>
    <title>v${escapeXml(version)}: ${escapeXml(type)}</title>
    <link>https://nebutra.com/changelog/${escapeXml(version)}</link>
    <guid isPermaLink="true">https://nebutra.com/changelog/${escapeXml(version)}</guid>
    <pubDate>${pubDate}</pubDate>
    <category>${escapeXml(type)}</category>
    <description>${buildDescription(highlights)}</description>
  </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Nebutra Changelog</title>
    <link>https://nebutra.com/changelog</link>
    <description>Every release, shipped with obsessive attention to detail.</description>
    <language>en-us</language>
    <lastBuildDate>${formatRfc2822(new Date().toISOString())}</lastBuildDate>
    <ttl>3600</ttl>
${items}
  </channel>
</rss>`;
}

export async function GET() {
  try {
    const entries = await getChangelogEntries();
    const feedEntries = entries.length > 0 ? entries : STATIC_RELEASES;
    const rssXml = buildRssXml(feedEntries);

    return new Response(rssXml, {
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (error) {
    logFeedError("[RSS Feed Error]", error);
    // Fall back to static releases on error
    const rssXml = buildRssXml(STATIC_RELEASES);
    return new Response(rssXml, {
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  }
}
