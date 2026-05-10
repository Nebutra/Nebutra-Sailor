/**
 * Nebutra-Sailor — Product Positioning DNA
 *
 * Source of truth for product identity, use-case copy, and ICP definition.
 * Consumed by GitHub README, About pages, and marketing copy.
 *
 * Principle: Every claim here is substantiated by code in this monorepo.
 * Do not add aspirational copy without backing infrastructure.
 */

// ── Core identity ─────────────────────────────────────────────────────────────

export const positioning = {
  /**
   * One-liner for README, og:description, pitch decks.
   * Audience: AI founders, SaaS engineering teams (1–10 engineers).
   */
  tagline: "Ship AI products, not boilerplate.",

  /**
   * Two-sentence elevator pitch.
   */
  description:
    "Nebutra-Sailor is a production-ready Next.js monorepo template for AI SaaS products. " +
    "Auth, billing, multi-tenancy, AI services, design system, and enterprise infrastructure — " +
    "pre-configured so you ship on day one.",

  /**
   * GitHub repository description (160 chars max).
   */
  repoDescription:
    "AI-native SaaS monorepo: Next.js 16 + Hono + Python services · Clerk · Stripe · multi-tenancy · K8s · OTel · design system",

  // ── Target audience ──────────────────────────────────────────────────────────

  icp: {
    primary: "AI founders building SaaS products with small engineering teams (1–10 people)",
    secondary: "SaaS engineering teams adopting AI features into existing products",
    antiTarget:
      "Large enterprise teams with dedicated platform engineering — this template makes opinionated choices they will override",
  },

  // ── What ships out of the box ─────────────────────────────────────────────

  /**
   * Capability pillars — each backed by actual packages/apps in this repo.
   * Update when underlying packages change.
   */
  pillars: [
    {
      id: "ai-native",
      title: "AI-Native Architecture",
      headline: "AI capabilities built in, not bolted on.",
      bullets: [
        "Python FastAPI AI service with OpenAI / Anthropic client patterns",
        "Streaming responses and embeddings pipelines",
        "RecommendationSystem (recsys) service for personalization",
        "Event ingestion pipeline for AI training data collection",
      ],
      packages: ["backends/python/ai", "backends/python/recsys", "backends/python/event-ingest"],
    },
    {
      id: "saas-complete",
      title: "SaaS-Complete Infrastructure",
      headline: "Every SaaS primitive, wired together.",
      bullets: [
        "Clerk authentication with multi-tenant org support",
        "Stripe subscriptions, usage billing, and credits via @nebutra/billing",
        "Entitlement system for feature gating",
        "RBAC-ready tenant context propagated through the API gateway",
      ],
      packages: ["packages/billing", "backends/gateway", "packages/preset"],
    },
    {
      id: "design-system",
      title: "Production Design System",
      headline: "Ship polished UI from day one.",
      bullets: [
        "541 Geist icons as tree-shakable TSX components",
        "Radix UI + Lobe UI component library with brand tokens",
        "Multi-theme engine: 6 oklch themes via CSS data-attributes",
        "Storybook 8 with auto-generated docs and visual regression via Chromatic",
      ],
      packages: ["packages/ui", "packages/tokens", "packages/icons", "apps/storybook"],
    },
    {
      id: "polyglot-monorepo",
      title: "Polyglot Monorepo",
      headline: "Right tool for each service, one unified repo.",
      bullets: [
        "Next.js 16 apps (web dashboard, landing page, design docs)",
        "Hono API gateway with OpenAPI spec and type-safe routes",
        "Python FastAPI microservices for AI, billing, content, e-commerce, web3",
        "Turborepo with affected-only builds and remote caching",
      ],
      packages: ["apps/web", "backends/gateway", "backends/python/*"],
    },
    {
      id: "enterprise-infra",
      title: "Enterprise-Grade Infrastructure",
      headline: "Production patterns, not prototyping shortcuts.",
      bullets: [
        "OpenTelemetry distributed tracing via @nebutra/logger (Pino + OTLP)",
        "Kubernetes with NetworkPolicy, PDB, HPA, and hardened security contexts",
        "Supply chain security: SHA-pinned Docker images and GitHub Actions",
        "CSP nonce-based headers, rate limiting, and structured error handling",
      ],
      packages: ["packages/logger", "packages/rate-limit", "infra/iac/k8s"],
    },
  ],

  // ── Use cases ─────────────────────────────────────────────────────────────

  /**
   * Three genuine use cases with corresponding apps/packages in this repo.
   * These are templates for what you build ON TOP of Nebutra-Sailor,
   * not features of the template itself.
   */
  useCases: [
    {
      id: "ai-saas",
      title: "AI SaaS Product",
      description:
        "Build a multi-tenant AI SaaS product from MVP to production. " +
        "Auth, billing, AI services, and dashboard are pre-wired.",
      examples: ["AI writing tools", "AI data analysis", "AI copilots", "AI workflow automation"],
      starterCommand: "pnpm dev:ai-saas",
    },
    {
      id: "marketing-landing",
      title: "SaaS Marketing & Landing Pages",
      description:
        "Launch performance-optimized marketing sites with built-in SEO, " +
        "Lighthouse CI gates, and analytics.",
      examples: ["Product landing pages", "Pricing pages", "Blog + SEO content"],
      starterCommand: "pnpm dev:marketing",
    },
    {
      id: "design-system-standalone",
      title: "AI Product Design System",
      description:
        "Use @nebutra/ui and @nebutra/tokens as the design system foundation " +
        "for your AI product team.",
      examples: ["Internal component libraries", "Multi-product design systems"],
      starterCommand: "pnpm dev:design",
    },
  ],

  // ── Benchmark positioning ─────────────────────────────────────────────────

  /**
   * Honest competitive context. Not claims, just positioning anchors.
   */
  benchmarks: {
    template: "t3-app, create-t3-turbo — adds AI services, Python backend, design system",
    infra: "Vercel templates — adds Kubernetes, multi-service, enterprise security",
    aiFramework: "LangChain templates — adds full SaaS commercialization layer",
  },
} as const;

export type Positioning = typeof positioning;
export type ProductPillar = (typeof positioning.pillars)[number];
export type UseCase = (typeof positioning.useCases)[number];
