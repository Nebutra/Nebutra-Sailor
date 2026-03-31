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
    title: "Roadmap — Nebutra",
    description:
      "From infrastructure foundation to enterprise scale — our product phases, version milestones, and funding vision.",
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
    name: "Foundation",
    versions: "v0.1 – v0.4",
    status: "done",
    vision:
      "Monorepo, API gateway, database, and auth wired together. Every future feature builds on this.",
    milestones: [
      { label: "Turborepo monorepo — pnpm workspaces, 33 packages, Node 22" },
      { label: "Hono API gateway with OpenAPI + idiomatic middleware" },
      { label: "Prisma + Supabase (PostgreSQL + pgvector)" },
      { label: "Multi-tenant auth — Clerk with org membership roles" },
      { label: "RBAC permission matrix — 17 typed scopes" },
    ],
  },
  {
    number: 1,
    name: "Platform",
    versions: "v0.5 – v0.10",
    status: "done",
    vision:
      "Feature-complete SaaS scaffold. Settings, billing, AI routes, email, analytics, and observability in one box.",
    milestones: [
      { label: "Settings pages — General, Team, API Keys, Billing, Security" },
      { label: "Pricing page — FREE / PRO / ENTERPRISE tiers" },
      { label: "Transactional email (Resend) — welcome, quota warnings, invites" },
      { label: "Analytics dashboard — 30-day funnel and revenue charts" },
      { label: "Blog powered by Sanity CMS with ISR + OG metadata" },
      { label: "Feature flag hooks — SSR-safe with tenant context" },
      { label: "Security hardening — RBAC, secrets management, WAF" },
    ],
  },
  {
    number: 2,
    name: "Launch",
    versions: "v1.0",
    funding: "Pre-Seed",
    status: "active",
    vision:
      "Public beta. Real users, real feedback. OPC community goes live. First paying customers.",
    milestones: [
      { label: "OPC Free License — one-click activation flow" },
      { label: "Sleptons community gallery — member profiles + welcome overlay" },
      { label: "License wizard — persona, team size, use-case onboarding" },
      { label: "Nebutra.com public launch + product docs" },
      { label: "First 100 OPC members" },
    ],
  },
  {
    number: 3,
    name: "Traction",
    versions: "v1.x",
    funding: "Seed Round",
    status: "upcoming",
    vision:
      "From free users to paying customers. AI workflows, usage billing, and marketplace integrations ship here.",
    milestones: [
      { label: "AI workflow builder — drag-and-drop agent pipelines" },
      { label: "Consumption-based billing — metered API usage + Stripe" },
      { label: "Marketplace integrations — Slack, Notion, GitHub, Linear" },
      { label: "Team collaboration — shared workspaces, roles, audit log" },
      { label: "Mobile-responsive dashboard" },
    ],
  },
  {
    number: 4,
    name: "Scale",
    versions: "v2.0",
    funding: "Series A",
    status: "upcoming",
    vision:
      "Enterprise-grade. White-label licensing, global edge, SLA guarantees. Nebutra becomes the infrastructure layer for AI-native SaaS.",
    milestones: [
      { label: "White-label OEM — custom domain, brand, pricing" },
      { label: "Enterprise SSO — SAML, SCIM, Active Directory" },
      { label: "Global edge deployment — multi-region with <100ms p99" },
      { label: "SLA-backed uptime guarantees" },
      { label: "Dedicated enterprise support + SLAs" },
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
            Product Roadmap
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
            From infrastructure foundation to enterprise scale — five phases, clear milestones, and
            the funding vision behind each one.
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
              Shaping the roadmap
            </p>
            <p className="mb-6 text-sm text-[var(--neutral-11)]">
              OPC members get early access to upcoming features and direct input on priorities.
            </p>
            <a
              href="/en/get-license"
              className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white"
              style={{ background: "var(--brand-gradient)" }}
            >
              Get your free OPC license →
            </a>
          </div>
        </AnimateIn>
      </section>

      <FooterMinimal />
    </main>
  );
}
