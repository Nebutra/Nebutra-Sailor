import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { CheckCircle, Circle, Clock } from "lucide-react";
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
    title: "Meta-Unicorn Rollout — Nebutra",
    description: "The five evolutionary phases of the Nebutra Creator Engine ecosystem.",
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
    vision: "Establishing the rigid, uncompromising systems required to construct Meta-Unicorns.",
    milestones: [
      { label: "Monorepo topology — Turborepo, 33 interconnected packages" },
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
      "Transcend typical boilerplates. Arming OPCs with 50+ enterprise modules, cutting infrastructure setup from months to a week.",
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
    name: "Sleptons Router",
    versions: "v1.0",
    funding: "Algorithmic Seed",
    status: "active",
    vision:
      "Abolishing traditional hiring. Matchmaking top digital talent purely via absolute Proof of Work and semantic compatibility.",
    milestones: [
      { label: "Sleptons Community Launch — Proof-of-Work visual verification" },
      { label: "OPC Free License — Automated AGPL commercial exclusion routing" },
      { label: "Github PR/Commit graph topological analysis integration" },
      { label: "Nebutra Ecosystem Live Pipeline" },
      { label: "First 100 Meta-Unicorn Founder nodes established" },
    ],
  },
  {
    number: 3,
    name: "The Launchpad",
    versions: "v1.x",
    funding: "Execution Scaling",
    status: "upcoming",
    vision:
      "Replacing paid acquisition with algorithmic distribution. Exposing new MVPs to a ruthless, high-signal feedback pool.",
    milestones: [
      { label: "Algorithmic distribution engine — recommendation feed for OPC products" },
      { label: "Consumption-based API metering & automated Stripe reconciliation" },
      { label: "Drag-and-drop Agent orchestration workflows" },
      { label: "Integrations marketplace — Slack, Notion, GitHub, Linear" },
      { label: "Cross-platform unified dashboard" },
    ],
  },
  {
    number: 4,
    name: "Algorithmic Capital",
    versions: "v2.0",
    funding: "End-Game Ecosystem",
    status: "upcoming",
    vision:
      "Dismantling elite VC networks. Capital routes seamlessly into builder ecosystems based entirely on verified MRR velocity and codebase execution speed.",
    milestones: [
      { label: "Automated MRR tracking and algorithmic funding injections" },
      { label: "White-label enterprise OEM solutions — Custom domains & IP encapsulation" },
      { label: "Enterprise SSO enforcement — SAML, Active Directory" },
      { label: "Global Edge acceleration — Multi-region failover" },
      { label: "Absolute SLA guarantees with 100% Agent-driven operations support" },
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
    <main id="main-content" className="min-h-screen bg-[var(--neutral-1)]">
      <Navbar />

      {/* Hero */}
      <section className="mx-auto max-w-[1400px] px-4 pt-32 pb-16 md:px-6 text-center">
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
          <h1 className="mt-4 text-5xl font-black tracking-tight text-[var(--neutral-12)] md:text-7xl">
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
            Executing the 4 pillars of the Meta-Unicorn Whitepaper. Fusing code, talent, and
            capital.
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
                      className="flex h-14 w-14 items-center justify-center rounded-full border-2 text-sm font-black"
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
                    className="flex-1 rounded-2xl border p-6"
                    style={{
                      borderColor: phase.status === "active" ? "var(--blue-6)" : "var(--neutral-5)",
                      background: phase.status === "active" ? cfg.bg : "var(--neutral-1)",
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
                        <h2 className="text-2xl font-black text-[var(--neutral-12)]">
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
            className="mt-8 rounded-2xl border p-8 text-center"
            style={{ borderColor: "var(--neutral-5)", background: "var(--neutral-2)" }}
          >
            <p className="mb-2 text-sm font-semibold text-[var(--neutral-12)]">
              Shaping the future
            </p>
            <p className="mb-6 text-sm text-[var(--neutral-11)]">
              OPC members get early access to the Sleptons router and directly shape algorithmic
              consensus.
            </p>
            <a
              href={`/${lang}/get-license`}
              className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white"
              style={{ background: "var(--brand-gradient)" }}
            >
              Enter the Ecosystem →
            </a>
          </div>
        </AnimateIn>
      </section>

      <FooterMinimal />
    </main>
  );
}
