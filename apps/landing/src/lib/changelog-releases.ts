/**
 * Static changelog inventory — the offline SSOT for the release family.
 *
 * Real entries come from Sanity (`getChangelogEntries`). This list is what the
 * product ships when the CMS is empty or unreachable, and it is read by all
 * three surfaces that need to agree on which versions exist:
 *
 *   - `/changelog`            — the index, which links each version
 *   - `/changelog/[version]`  — the detail page, which 404s an unknown version
 *   - `src/app/sitemap.ts`    — the `/changelog/*` sitemap family
 *
 * They used to hold three divergent copies: the index listed 1.7 / 1.5 / 1.0,
 * the detail page served 0.10.0 … 0.4.0, and the sitemap published nothing at
 * all when the CMS blipped. Every index link 404'd offline, the eight versions
 * that did resolve were linked from nowhere, and a CMS timeout silently deleted
 * live URLs from the sitemap. One list removes the possibility.
 *
 * Ordered newest-first by `date`, which is also the order the detail page's
 * previous/next navigation walks.
 */
export type StaticChangelogRelease = {
  readonly version: string;
  /** ISO date, `YYYY-MM` or `YYYY-MM-DD`. */
  readonly date: string;
  readonly tag: string;
  /** Design token expression — never a raw hex value. */
  readonly tagColor: string;
  readonly title: string;
  readonly summary: string;
  readonly highlights: readonly string[];
};

const RELEASES: readonly StaticChangelogRelease[] = [
  {
    version: "1.7",
    date: "2026-05-12",
    tag: "Refactor",
    tagColor: "var(--brand-accent)",
    title: "TS-by-Default Backends & Dark Border Tokens",
    summary:
      "The Python fleet collapses to _shared + ai under ADR 2026-05-10, a pure-neutral dark border token system lands under ADR 2026-05-11, and the marketing copy passes an honesty audit.",
    highlights: [
      "TS-by-default backend audit — Python fleet collapsed to _shared + ai; event-ingest migrated in-process; ecommerce/recsys/content/third-party/web3 removed (ADR 2026-05-10)",
      "Dark border token system — pure-neutral nebutra-gray palette + token-aware * wildcard rule fixes high-saturation borders across all surfaces (ADR 2026-05-11)",
      "Marketing copy honesty audit — fictional testimonials, fabricated developer counts, hallucinated AI model names, and unenforced pricing claims all corrected",
    ],
  },
  {
    version: "1.5",
    date: "2026-04",
    tag: "Feat",
    tagColor: "var(--brand-accent)",
    title: "Categorized Monorepo & Multi-Provider Auth/Billing",
    summary:
      "Packages regroup by domain, and both auth and billing move behind provider abstractions so a deployment can pick its own stack.",
    highlights: [
      "Categorized monorepo layout — packages grouped by domain (design / iam / commerce / integrations / platform / ops / ai)",
      "Multi-provider auth — Clerk, Better Auth, NextAuth via @nebutra/auth provider abstraction",
      "Multi-provider billing — Stripe, Polar, LemonSqueezy, ChinaPay, Manual via @nebutra/billing",
    ],
  },
  {
    version: "0.10.0",
    date: "2026-03-13",
    tag: "Security",
    tagColor: "var(--brand-accent)",
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
    tagColor: "hsl(var(--primary))",
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
    tagColor: "var(--brand-accent)",
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
    tagColor: "var(--brand-accent)",
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
    version: "1.0",
    date: "2026-02",
    tag: "Feat",
    tagColor: "var(--brand-accent)",
    title: "Hono Gateway & Multi-Tenant Primitives",
    summary:
      "The Hono API gateway lands with OpenAPI, oRPC and tRPC, on the Prisma + Supabase foundation, alongside the multi-tenant primitives the rest of the platform builds on.",
    highlights: [
      "Hono API gateway — OpenAPI, oRPC, tRPC with middleware composition",
      "Prisma + Supabase foundation (PostgreSQL + pgvector)",
      "Multi-tenant primitives — @nebutra/tenant (AsyncLocalStorage + RLS), @nebutra/permissions (CASL + OpenFGA)",
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
];

/** Newest first. Sorted here so no consumer has to re-derive the ordering. */
export const STATIC_CHANGELOG_RELEASES: readonly StaticChangelogRelease[] = [...RELEASES].sort(
  (a, b) => releaseTime(b) - releaseTime(a),
);

export function findStaticChangelogRelease(version: string): StaticChangelogRelease | undefined {
  return STATIC_CHANGELOG_RELEASES.find((release) => release.version === version);
}

export function staticChangelogVersions(): readonly string[] {
  return STATIC_CHANGELOG_RELEASES.map((release) => release.version);
}

/** `YYYY-MM` widens to the first of the month so both shapes are comparable. */
function releaseTime(release: StaticChangelogRelease): number {
  const normalized = /^\d{4}-\d{2}$/.test(release.date) ? `${release.date}-01` : release.date;
  const time = new Date(normalized).getTime();
  return Number.isNaN(time) ? 0 : time;
}
