"use client";

import { Anthropic, DeepSeek, Gemini, OpenAI } from "@nebutra/ui/icons";
import { AnimatedBeam } from "@nebutra/ui/primitives";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRef } from "react";
import { AnimateIn, AnimateInGroup } from "./AnimateIn";

type IconComponent = React.ComponentType<{ size?: number; className?: string }>;

interface Provider {
  icon: IconComponent & { Color?: IconComponent };
  name: string;
  ref: React.RefObject<HTMLDivElement | null>;
}

const TENANT_CODE_LINES = [
  { text: "const data = await prisma.post.findMany({", type: "code" as const },
  { text: "  where: {", type: "code" as const },
  { text: "    tenantId: ctx.tenant.id", type: "key" as const },
  { text: "  }", type: "code" as const },
  { text: "});", type: "code" as const },
  { text: "", type: "code" as const },
  { text: "// ✔ RLS enforced at database level", type: "comment" as const },
  { text: "// ✔ No cross-tenant data leaks", type: "comment" as const },
];

const PERMISSIONS = [
  { feature: "Posts", admin: true, member: true, guest: true },
  { feature: "Billing", admin: true, member: false, guest: false },
  { feature: "Settings", admin: true, member: false, guest: false },
  { feature: "API Keys", admin: true, member: true, guest: false },
];

const BILLING_METRICS = [
  { label: "MRR", value: "$12,400", delta: "+$1,204 today" },
  { label: "Active Seats", value: "847", delta: "+12 this week" },
  { label: "Churn", value: "2.3%", delta: "-0.4% vs last mo." },
];

const ROLES = ["Admin", "Member", "Guest"] as const;

export function CapabilityMatrixSection() {
  const t = useTranslations("microLanding.capability");

  // Refs for AnimatedBeam
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<HTMLDivElement>(null);
  const openaiRef = useRef<HTMLDivElement>(null);
  const anthropicRef = useRef<HTMLDivElement>(null);
  const geminiRef = useRef<HTMLDivElement>(null);
  const deepseekRef = useRef<HTMLDivElement>(null);

  const providers: Provider[] = [
    { icon: OpenAI, name: "OpenAI", ref: openaiRef },
    { icon: Anthropic, name: "Anthropic", ref: anthropicRef },
    { icon: Gemini, name: "Gemini", ref: geminiRef },
    { icon: DeepSeek, name: "DeepSeek", ref: deepseekRef },
  ];

  const curvatures = [-30, -10, 10, 30];
  const beamDelays = [0, 0.6, 1.2, 1.8];

  return (
    <section
      id="capabilities"
      className="w-full bg-background py-24 md:py-32 relative overflow-hidden"
    >
      {/* Subtle Glows */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 md:px-6 relative z-10">
        {/* Section header */}
        <AnimateIn preset="emerge" inView className="mx-auto max-w-3xl text-center mb-16 md:mb-24">
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 mb-6">
            <span className="text-sm font-semibold text-primary tracking-wide uppercase">
              {t("badge")}
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-foreground text-balance">
            {t("title")}
          </h2>
        </AnimateIn>

        {/* 2×2 Capability Bento */}
        <AnimateInGroup inView stagger="normal" className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* 1. Multi-Tenant Engine */}
          <AnimateIn preset="fadeUp" className="h-full">
            <article className="group flex h-full flex-col rounded-[2.5rem] border border-border/50 bg-background/60 dark:bg-zinc-950/40 backdrop-blur-2xl p-8 md:p-10 transition-all duration-500 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)] hover:border-primary/30">
              <div className="flex items-center mb-4">
                <span className="text-xl text-primary mr-3">◈</span>
                <h3 className="text-xl font-bold tracking-tight text-foreground">
                  {t("multiTenant.title")}
                </h3>
              </div>
              <p className="text-base text-muted-foreground mb-8 leading-relaxed">
                {t("multiTenant.desc")}
              </p>

              {/* High-Fidelity Code Window */}
              <div className="mt-auto flex-1 overflow-hidden rounded-2xl border border-border/50 bg-muted/30 dark:bg-zinc-950/60 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
                {/* Header Dots */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/50 dark:bg-zinc-900/40">
                  <div className="w-2.5 h-2.5 rounded-full bg-border/80 dark:bg-zinc-700/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-border/80 dark:bg-zinc-700/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-border/80 dark:bg-zinc-700/80"></div>
                </div>
                <div className="p-5 sm:p-6 bg-gradient-to-br from-background/40 to-muted/20 dark:from-zinc-950 dark:to-[#0a0a0a]">
                  <pre className="font-mono text-[13px] sm:text-sm leading-relaxed">
                    {TENANT_CODE_LINES.map((line, i) => (
                      <span
                        key={i}
                        className={`block ${
                          line.type === "comment"
                            ? "text-muted-foreground/60 dark:text-zinc-500 italic"
                            : line.type === "key"
                              ? "text-emerald-600 dark:text-emerald-400 font-medium"
                              : line.text.includes("await") || line.text.includes("const")
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-foreground/80 dark:text-zinc-300"
                        }`}
                      >
                        {line.text || "\u00a0"}
                      </span>
                    ))}
                  </pre>
                </div>
              </div>

              <Link
                href="/docs/multi-tenancy"
                className="mt-8 font-semibold inline-flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
              >
                {t("multiTenant.cta")}{" "}
                <span className="text-primary transition-transform group-hover:translate-x-1">
                  →
                </span>
              </Link>
            </article>
          </AnimateIn>

          {/* 2. AI Provider Gateway */}
          <AnimateIn preset="fadeUp" className="h-full">
            <article className="group flex h-full flex-col rounded-[2.5rem] border border-border/50 bg-background/60 dark:bg-zinc-950/40 backdrop-blur-2xl p-8 md:p-10 transition-all duration-500 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)] hover:border-primary/30">
              <div className="flex items-center mb-4">
                <span className="text-xl text-primary mr-3">◈</span>
                <h3 className="text-xl font-bold tracking-tight text-foreground">
                  {t("aiGateway.title")}
                </h3>
              </div>
              <p className="text-base text-muted-foreground mb-8 leading-relaxed">
                {t("aiGateway.desc")}
              </p>

              {/* AnimatedBeam Visualization Wrapper */}
              <div className="mt-auto flex-1 overflow-hidden rounded-2xl border border-border/50 bg-muted/30 dark:bg-zinc-950/60 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] relative">
                <div
                  ref={containerRef}
                  className="w-full h-full relative flex items-center justify-between gap-4 min-h-[220px] px-6 sm:px-10 py-8 bg-gradient-to-br from-background/40 to-muted/20 dark:from-zinc-950 dark:to-[#0a0a0a]"
                >
                  {/* Source Node */}
                  <div
                    ref={appRef}
                    className="flex-shrink-0 flex flex-col items-center justify-center w-20 h-20 rounded-2xl bg-background border border-border/60 shadow-lg dark:bg-zinc-900 dark:border-zinc-700 z-10"
                  >
                    <span className="text-xs font-bold text-foreground/80 dark:text-zinc-300 leading-tight text-center">
                      Your
                      <br />
                      SaaS
                    </span>
                  </div>

                  {/* External Providers */}
                  <div className="flex flex-col gap-3.5 z-10">
                    {providers.map((provider) => {
                      const Icon = provider.icon.Color ?? provider.icon;
                      return (
                        <div
                          key={provider.name}
                          ref={provider.ref}
                          className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/80 dark:bg-zinc-900 dark:border-zinc-800 shadow-sm dark:shadow-md px-4 py-2 backdrop-blur-sm"
                        >
                          <Icon size={18} className="h-4.5 w-4.5 shrink-0" />
                          <span className="text-xs font-semibold text-foreground/80 dark:text-zinc-300">
                            {provider.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Rendering the connection lines */}
                  {providers.map((provider, i) => (
                    <AnimatedBeam
                      key={provider.name}
                      containerRef={containerRef}
                      fromRef={appRef}
                      toRef={provider.ref}
                      curvature={curvatures[i]}
                      delay={beamDelays[i]}
                      duration={4.5}
                      pathColor="var(--color-border, rgba(156,163,175,0.4))"
                      pathWidth={1.5}
                      pathOpacity={0.6}
                      gradientStartColor="var(--color-primary, #0033FE)"
                      gradientStopColor="#0BF1C3"
                    />
                  ))}
                </div>
              </div>

              <Link
                href="/docs/ai-integrations"
                className="mt-8 font-semibold inline-flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
              >
                {t("aiGateway.cta")}{" "}
                <span className="text-primary transition-transform group-hover:translate-x-1">
                  →
                </span>
              </Link>
            </article>
          </AnimateIn>

          {/* 3. Auth & RBAC Matrix */}
          <AnimateIn preset="fadeUp" className="h-full">
            <article className="group flex h-full flex-col rounded-[2.5rem] border border-border/50 bg-background/60 dark:bg-zinc-950/40 backdrop-blur-2xl p-8 md:p-10 transition-all duration-500 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)] hover:border-primary/30">
              <div className="flex items-center mb-4">
                <span className="text-xl text-primary mr-3">◈</span>
                <h3 className="text-xl font-bold tracking-tight text-foreground">
                  {t("rbac.title")}
                </h3>
              </div>
              <p className="text-base text-muted-foreground mb-8 leading-relaxed">
                {t("rbac.desc")}
              </p>

              {/* High-Fidelity Matrix Table */}
              <div className="mt-auto flex-1 overflow-hidden rounded-2xl border border-border/50 bg-muted/30 dark:bg-zinc-950/60 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] flex flex-col">
                <table className="w-full text-sm text-left flex-1 border-collapse">
                  <thead className="bg-muted/50 dark:bg-zinc-900/40">
                    <tr className="border-b border-border/50">
                      <th className="py-4 px-5 text-xs font-bold text-muted-foreground/80 dark:text-zinc-500 uppercase tracking-widest w-1/3">
                        Feature
                      </th>
                      {ROLES.map((role) => (
                        <th
                          key={role}
                          className="py-4 px-2 text-center text-xs font-bold text-muted-foreground/80 dark:text-zinc-500 uppercase tracking-widest"
                        >
                          {role}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-gradient-to-br from-background/40 to-muted/20 dark:from-zinc-950 dark:to-[#0a0a0a]">
                    {PERMISSIONS.map((row, i) => (
                      <tr
                        key={row.feature}
                        className={`transition-colors hover:bg-muted/40 dark:hover:bg-zinc-900/30 ${
                          i < PERMISSIONS.length - 1
                            ? "border-b border-border/40 dark:border-zinc-800/60"
                            : ""
                        }`}
                      >
                        <td className="py-4 px-5 text-sm font-semibold text-foreground/80 dark:text-zinc-300">
                          {row.feature}
                        </td>
                        {([row.admin, row.member, row.guest] as const).map((allowed, j) => (
                          <td key={j} className="py-4 text-center">
                            <span
                              className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${
                                allowed
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-lg"
                                  : "text-muted-foreground/40 dark:text-zinc-700 font-bold"
                              }`}
                            >
                              {allowed ? "✓" : "—"}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Link
                href="/docs/authentication"
                className="mt-8 font-semibold inline-flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
              >
                {t("rbac.cta")}{" "}
                <span className="text-primary transition-transform group-hover:translate-x-1">
                  →
                </span>
              </Link>
            </article>
          </AnimateIn>

          {/* 4. Billing & Revenue Engine */}
          <AnimateIn preset="fadeUp" className="h-full">
            <article className="group flex h-full flex-col rounded-[2.5rem] border border-border/50 bg-background/60 dark:bg-zinc-950/40 backdrop-blur-2xl p-8 md:p-10 transition-all duration-500 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)] hover:border-primary/30">
              <div className="flex items-center mb-4">
                <span className="text-xl text-primary mr-3">◈</span>
                <h3 className="text-xl font-bold tracking-tight text-foreground">
                  {t("billing.title")}
                </h3>
              </div>
              <p className="text-base text-muted-foreground mb-8 leading-relaxed">
                {t("billing.desc")}
              </p>

              {/* Sleek Dashboard Widgets */}
              <div className="mt-auto flex-1 flex flex-col justify-center gap-4 px-1 pb-1">
                {BILLING_METRICS.map((metric, i) => (
                  <div
                    key={metric.label}
                    className="flex items-center justify-between rounded-2xl border border-border/50 bg-background/50 dark:bg-zinc-950 px-6 py-5 shadow-[0_8px_20px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_20px_rgb(0,0,0,0.12)] transition-transform hover:scale-[1.02] backdrop-blur-sm"
                  >
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80 dark:text-zinc-500 mb-1.5">
                        {metric.label}
                      </p>
                      <p className="text-3xl font-black text-foreground dark:text-zinc-100 tabular-nums tracking-tighter">
                        {metric.value}
                      </p>
                    </div>
                    {/* Glowing pill badge for metrics */}
                    <span className="text-xs font-bold whitespace-nowrap text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 dark:text-emerald-400 dark:border-emerald-400/20 px-3 py-1.5 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.05)] dark:shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                      {metric.delta}
                    </span>
                  </div>
                ))}
              </div>

              <Link
                href="/docs/billing"
                className="mt-8 font-semibold inline-flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
              >
                {t("billing.cta")}{" "}
                <span className="text-primary transition-transform group-hover:translate-x-1">
                  →
                </span>
              </Link>
            </article>
          </AnimateIn>
        </AnimateInGroup>
      </div>
    </section>
  );
}

CapabilityMatrixSection.displayName = "CapabilityMatrixSection";
