import { AnimateIn } from "@nebutra/ui/components";
import { AuroraBackground, Button } from "@nebutra/ui/primitives";
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { FooterMinimal, Navbar } from "@/components/landing";
import { RoadmapTimeline } from "@/components/landing/RoadmapTimeline";
import { type Locale, routing } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo/metadata";

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
  return buildPageMetadata({
    title: "Platform Roadmap — Nebutra",
    description: "The capability roadmap for Nebutra's governed AI platform.",
    path: "/roadmap",
    locale: lang as Locale,
  });
}

type PhaseStatus = "done" | "active" | "upcoming";

interface Milestone {
  label: string;
}

interface Phase {
  number: number;
  name: string;
  versions: string;
  funding?: string;
  status: PhaseStatus;
  milestones: Milestone[];
  vision: string;
}

const PHASES: Phase[] = [
  {
    number: 0,
    name: "Foundation: The Kernel",
    versions: "v0.1 – v0.4",
    status: "done",
    vision:
      "Establish the governed baseline: shared packages, typed contracts, auth, data, and operational primitives.",
    milestones: [
      {
        label:
          "Categorized monorepo — Turborepo with packages grouped by domain (design / iam / commerce / integrations / platform / ops / ai)",
      },
      { label: "Hono API Gateway — OpenAPI, oRPC, tRPC with middleware composition" },
      { label: "Database foundation — Prisma + Supabase (PostgreSQL + pgvector)" },
      { label: "Absolute Identity — Multi-tenant auth with Clerk + org membership" },
      { label: "Permission matrix — 17 typed RBAC scopes" },
    ],
  },
  {
    number: 1,
    name: "The Builder Core",
    versions: "v0.5 – v0.10",
    status: "done",
    vision:
      "Turn repeated product setup into a reusable platform baseline teams can ship against immediately.",
    milestones: [
      { label: "Complete Settings schema — Team, API Keys, Security configurations" },
      { label: "Monetization engine — FREE / PRO / ENTERPRISE tier tracking" },
      { label: "Transactional ops — Resend email integrations" },
      { label: "Telemetry & Observability — Sentry, Analytics, 30-day funnels" },
      { label: "CMS integration — Sanity v5 powered blog & changelogs" },
    ],
  },
  {
    number: 2,
    name: "Verified Delivery",
    versions: "v1.0",
    funding: "Current Focus",
    status: "active",
    vision:
      "Make scaffolding, release, and adoption verifiable through trusted artifacts, reproducible flows, and safer defaults.",
    milestones: [
      { label: "Trusted publishing and provenance for public packages" },
      { label: "Immutable template bundles with checksum verification" },
      { label: "Scaffold smoke validation against fresh installs" },
      { label: "Governed onboarding flows and safer defaults" },
      { label: "Operator-facing release and adoption guardrails" },
    ],
  },
  {
    number: 3,
    name: "Extension Registry",
    versions: "v1.x",
    funding: "Next",
    status: "upcoming",
    vision:
      "Add capabilities safely through a remote registry with compatibility checks, migrations, and governed application of changes.",
    milestones: [
      { label: "Registry-backed nebutra add flows for platform capabilities" },
      { label: "Compatibility ranges, migrations, and rollback metadata" },
      { label: "Provider-aware integration bundles and diagnostics" },
      { label: "Integrations marketplace — Slack, Notion, GitHub, Linear" },
      { label: "Cross-project upgrade guidance and health checks" },
    ],
  },
  {
    number: 4,
    name: "Harness Runtime",
    versions: "v2.0",
    funding: "Longer Horizon",
    status: "upcoming",
    vision:
      "Ship first-class agent, MCP, and workflow primitives so teams can run AI-native operations on the same governed platform surface.",
    milestones: [
      { label: "Project-scoped harness diagnostics and runtime contracts" },
      { label: "Workflow orchestration for agents, tools, and approvals" },
      { label: "Enterprise controls — SSO, audit routing, governed operations" },
      { label: "Global deployment resilience and runtime policy enforcement" },
      { label: "Operational feedback loops across product, infra, and AI systems" },
    ],
  },
];

export default async function RoadmapPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang as Locale);

  return (
    <main id="main-content" className="min-h-screen bg-[var(--neutral-1)] relative overflow-hidden">
      <Navbar />

      {/* Hero */}
      <section className="relative mx-auto max-w-[1400px] px-4 pt-20 pb-16 md:px-6 text-center">
        <AuroraBackground variant="vivid" position="top" intensity={0.5} />
        <AnimateIn preset="fade">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-[color:var(--blue-6)] bg-[color:var(--blue-9)]/[0.06] px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[color:var(--blue-9)]">
            Ecosystem Rollout
          </span>
        </AnimateIn>

        <AnimateIn preset="emerge">
          <h1
            className="mt-4 text-4xl sm:text-5xl md:text-5xl lg:text-6xl font-semibold text-[var(--neutral-12)] text-balance"
            style={{
              letterSpacing: "var(--tracking-display)",
              lineHeight: "var(--leading-display)",
            }}
          >
            Where we&apos;re{" "}
            <span
              style={{
                background: "var(--brand-gradient)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              going
            </span>
          </h1>
        </AnimateIn>

        <AnimateIn preset="fade">
          <p className="mx-auto mt-6 max-w-2xl text-lg text-[var(--neutral-11)]">
            The capability roadmap behind Nebutra&apos;s governed AI platform, from baseline
            scaffolding to registry-driven upgrades and harness runtime primitives.
          </p>
        </AnimateIn>
      </section>

      {/* Phase Timeline — scroll-driven beam (adapted Aceternity pattern) */}
      <section className="mx-auto px-4 pb-24 md:px-6">
        <RoadmapTimeline data={PHASES} />

        {/* Footer CTA */}
        <AnimateIn preset="fade" inView>
          <div className="mx-auto mt-12 max-w-[1100px] rounded-[var(--radius-card)] bg-[var(--neutral-2)] p-8 text-center">
            <p className="mb-2 text-sm font-semibold text-[var(--neutral-12)]">
              Build on the current baseline
            </p>
            <p className="mb-6 text-sm text-[var(--neutral-11)]">
              Start with the governed platform today, then adopt new capabilities through verified
              upgrades instead of one-off rewrites.
            </p>
            <Button asChild variant="ink" size="lg">
              <a href={`/${lang}/get-license`}>Explore licensing →</a>
            </Button>
          </div>
        </AnimateIn>
      </section>

      <FooterMinimal />
    </main>
  );
}
