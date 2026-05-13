import { CheckCircle, Status as Circle, Clock } from "@nebutra/icons";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { AuroraBackground, Button } from "@nebutra/ui/primitives";
import type { Metadata } from "next";
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
  return {
    title: "Platform Roadmap — Nebutra",
    description: "The capability roadmap for Nebutra's governed AI platform.",
    alternates: { canonical: `/${lang}/roadmap` },
  };
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

const STATUS_CONFIG: Record<
  PhaseStatus,
  { icon: typeof CheckCircle; label: string; color: string; bg: string; border: string }
> = {
  done: {
    icon: CheckCircle,
    label: "Complete",
    color: "var(--status-success)",
    bg: "rgba(16,185,129,0.08)",
    border: "rgba(16,185,129,0.25)",
  },
  active: {
    icon: Clock,
    label: "In Progress",
    color: "var(--blue-9)",
    bg: "rgba(0,51,254,0.06)",
    border: "rgba(0,51,254,0.2)",
  },
  upcoming: {
    icon: Circle,
    label: "Planned",
    color: "var(--neutral-9)",
    bg: "transparent",
    border: "var(--neutral-6)",
  },
};

export default async function RoadmapPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang as Locale);

  return (
    <main id="main-content" className="min-h-screen bg-[var(--neutral-1)] relative overflow-hidden">
      <Navbar />

      {/* Hero */}
      <section className="relative mx-auto max-w-[1400px] px-4 pt-32 pb-16 md:px-6 text-center">
        <AuroraBackground variant="vivid" position="top" intensity={0.5} />
        <AnimateIn preset="fade">
          <span
            className="mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-widest"
            style={{
              borderColor: "var(--blue-6)",
              color: "var(--blue-9)",
              background: "rgba(0,51,254,0.06)",
            }}
          >
            Ecosystem Rollout
          </span>
        </AnimateIn>

        <AnimateIn preset="emerge">
          <h1
            className="mt-4 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold text-[var(--neutral-12)]"
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

      {/* Phase Timeline */}
      <section className="mx-auto max-w-4xl px-4 pb-24 md:px-6">
        <AnimateInGroup stagger="normal" className="relative flex flex-col gap-0">
          {/* Vertical connector line */}
          <div
            className="absolute left-[27px] top-10 bottom-10 w-px md:left-[35px]"
            style={{ background: "var(--neutral-5)" }}
          />

          {PHASES.map((phase) => {
            const cfg = STATUS_CONFIG[phase.status];
            const Icon = cfg.icon;

            return (
              <AnimateIn key={phase.number} preset="fadeUp">
                <div className="relative flex gap-6 md:gap-8 pb-10">
                  {/* Phase icon */}
                  <div className="relative z-10 flex-shrink-0">
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-full border-2 text-sm font-semibold"
                      style={{
                        background: cfg.bg || "var(--neutral-2)",
                        borderColor: cfg.border,
                        color: cfg.color,
                      }}
                    >
                      {phase.status === "done" ? (
                        <Icon className="h-6 w-6" />
                      ) : (
                        <span style={{ color: cfg.color }}>{phase.number}</span>
                      )}
                    </div>
                  </div>

                  {/* Phase card */}
                  <div
                    className="flex-1 rounded-[var(--radius-card)] border p-6"
                    style={{
                      borderColor: phase.status === "active" ? "var(--blue-6)" : "var(--neutral-6)",
                      background: phase.status === "active" ? cfg.bg : "var(--neutral-1)",
                      boxShadow: "var(--ring-hairline)",
                    }}
                  >
                    {/* Header */}
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold uppercase tracking-widest text-[var(--neutral-10)]">
                            Phase {phase.number}
                          </span>
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
                            style={{
                              background: cfg.bg,
                              color: cfg.color,
                              border: `1px solid ${cfg.border}`,
                            }}
                          >
                            <Icon className="h-3 w-3" />
                            {cfg.label}
                          </span>
                        </div>
                        <h2
                          className="text-2xl md:text-3xl font-semibold text-[var(--neutral-12)]"
                          style={{
                            letterSpacing: "var(--tracking-heading)",
                            lineHeight: "var(--leading-heading)",
                          }}
                        >
                          {phase.name}
                        </h2>
                      </div>

                      <div className="flex flex-col items-end gap-1 text-right">
                        <span
                          className="rounded-full px-3 py-1 text-xs font-bold font-mono"
                          style={{
                            background: "var(--neutral-3)",
                            color: "var(--neutral-11)",
                          }}
                        >
                          {phase.versions}
                        </span>
                        {phase.funding && (
                          <span
                            className="rounded-full px-3 py-1 text-xs font-bold"
                            style={{
                              background: "var(--brand-gradient)",
                              color: "white",
                            }}
                          >
                            {phase.funding}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Vision */}
                    <p className="mb-5 text-sm leading-relaxed text-[var(--neutral-11)]">
                      {phase.vision}
                    </p>

                    {/* Milestones */}
                    <ul className="space-y-2">
                      {phase.milestones.map((m) => (
                        <li
                          key={m.label}
                          className="flex items-start gap-2 text-sm text-[var(--neutral-11)]"
                        >
                          <CheckCircle
                            className="mt-0.5 h-4 w-4 flex-shrink-0"
                            style={{
                              color:
                                phase.status === "done"
                                  ? "var(--status-success)"
                                  : phase.status === "active"
                                    ? "var(--blue-9)"
                                    : "var(--neutral-7)",
                            }}
                          />
                          <span
                            style={{
                              opacity: phase.status === "upcoming" ? 0.6 : 1,
                            }}
                          >
                            {m.label}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </AnimateIn>
            );
          })}
        </AnimateInGroup>

        {/* Footer CTA */}
        <AnimateIn preset="fade" inView>
          <div
            className="mt-8 rounded-[var(--radius-card)] border p-8 text-center"
            style={{
              borderColor: "var(--neutral-6)",
              background: "var(--neutral-2)",
              boxShadow: "var(--ring-hairline)",
            }}
          >
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
