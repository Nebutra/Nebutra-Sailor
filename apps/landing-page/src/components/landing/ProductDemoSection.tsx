"use client";

import { AnimatedSpan, TypingAnimation } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function ProductDemoSection() {
  const t = useTranslations("microLanding.productDemo");

  const DEMO_STATES = [
    {
      id: "analytics",
      label: t("analytics.label"),
      desc: t("analytics.desc"),
      terminal: (
        <div
          key="analytics-term"
          className="font-mono text-sm sm:text-base leading-relaxed flex flex-col gap-2"
        >
          <TypingAnimation delay={100} className="text-muted-foreground/80 dark:text-zinc-400">
            &gt; nebutra telemetry --live
          </TypingAnimation>
          <AnimatedSpan delay={1500} className="text-cyan-600 dark:text-cyan-400">
            ⚡ Connecting to real-time stream...
          </AnimatedSpan>
          <AnimatedSpan delay={2200} className="text-emerald-600 dark:text-emerald-400">
            ✔ [200 OK] Connected. Ingesting telemetry.
          </AnimatedSpan>
          <AnimatedSpan delay={3000} className="text-foreground mt-4">
            Active Tenants: 1,432
          </AnimatedSpan>
          <AnimatedSpan delay={3500} className="text-foreground">
            Events/sec: 14K
          </AnimatedSpan>
          <AnimatedSpan delay={4200} className="text-foreground">
            MRR Velocity: +$1,204.00 (Last 24h)
          </AnimatedSpan>
          <AnimatedSpan
            delay={5000}
            className="text-muted-foreground/60 dark:text-zinc-500 mt-4 italic"
          >
            Live tracking active. Press Ctrl+C to exit.
          </AnimatedSpan>
        </div>
      ),
    },
    {
      id: "billing",
      label: t("billing.label"),
      desc: t("billing.desc"),
      terminal: (
        <div
          key="billing-term"
          className="font-mono text-sm sm:text-base leading-relaxed flex flex-col gap-2"
        >
          <TypingAnimation delay={100} className="text-muted-foreground/80 dark:text-zinc-400">
            &gt; stripe listen --forward-to localhost
          </TypingAnimation>
          <AnimatedSpan delay={1200} className="text-amber-600 dark:text-amber-400">
            ⚠ Ready! Waiting for events...
          </AnimatedSpan>
          <AnimatedSpan delay={2500} className="text-blue-600 dark:text-blue-400 mt-4">
            ↳ [Webhook] customer.subscription.created - cus_9173x
          </AnimatedSpan>
          <AnimatedSpan delay={3200} className="text-emerald-600 dark:text-emerald-400">
            {" "}
            ✔ Successfully provisioned 'Enterprise' seat limits.
          </AnimatedSpan>
          <AnimatedSpan delay={4000} className="text-blue-600 dark:text-blue-400 mt-2">
            ↳ [Webhook] invoice.paid - inv_12x - $4,200.00
          </AnimatedSpan>
          <AnimatedSpan delay={4800} className="text-emerald-600 dark:text-emerald-400">
            {" "}
            ✔ Payment recorded in Postgres. Emitting internal event.
          </AnimatedSpan>
        </div>
      ),
    },
    {
      id: "workspaces",
      label: t("workspaces.label"),
      desc: t("workspaces.desc"),
      terminal: (
        <div
          key="workspaces-term"
          className="font-mono text-sm sm:text-base leading-relaxed flex flex-col gap-2"
        >
          <TypingAnimation delay={100} className="text-muted-foreground/80 dark:text-zinc-400">
            &gt; nebutra workspace generate "Acme Corp"
          </TypingAnimation>
          <AnimatedSpan delay={1000} className="text-purple-600 dark:text-purple-400">
            Allocating isolated database schema [schema_id: acme_992]...
          </AnimatedSpan>
          <AnimatedSpan delay={2000} className="text-emerald-600 dark:text-emerald-400">
            ✔ Postgres RLS policies enforced.
          </AnimatedSpan>
          <AnimatedSpan delay={2800} className="text-foreground/80 dark:text-zinc-200 mt-2">
            Generating wildcard domain: acme.nebutra.app...
          </AnimatedSpan>
          <AnimatedSpan delay={3600} className="text-emerald-600 dark:text-emerald-400">
            ✔ Vercel routing attached.
          </AnimatedSpan>
          <AnimatedSpan delay={4500} className="text-cyan-600 dark:text-cyan-400 mt-2">
            Sending invite to admin@acme.com...
          </AnimatedSpan>
          <AnimatedSpan
            delay={5200}
            className="text-emerald-600 dark:text-emerald-400 font-medium mt-2"
          >
            ✨ Workspace fully initialized in 4.2s.
          </AnimatedSpan>
        </div>
      ),
    },
  ];

  const [activeId, setActiveId] = useState(DEMO_STATES[0].id);

  return (
    <section id="product" className="relative w-full overflow-hidden bg-background py-24 md:py-32">
      {/* Decorative Background Blur */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="container mx-auto px-4 max-w-[1400px] relative z-10">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-20 md:mb-28">
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 mb-8">
            <span className="text-sm font-semibold text-primary tracking-wide uppercase">
              {t("badge")}
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-balance text-foreground mb-6 max-w-4xl">
            {t("title")}
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground text-balance max-w-2xl leading-relaxed">
            {t("description")}
          </p>
        </div>

        {/* Interactive Split Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center max-w-[1400px] mx-auto">
          {/* Left: Navigation Cards */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            {DEMO_STATES.map((state) => {
              const isActive = activeId === state.id;
              return (
                <button
                  key={state.id}
                  onClick={() => setActiveId(state.id)}
                  className={`group relative text-left p-6 md:p-8 rounded-[1.5rem] transition-all duration-400 overflow-hidden outline-none ${
                    isActive
                      ? "bg-background shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] ring-1 ring-border/50 scale-[1.01] z-10"
                      : "bg-transparent hover:bg-muted/40 ring-1 ring-transparent hover:ring-border/30 hover:scale-[1.005]"
                  }`}
                >
                  {/* Subtle Active Indicator Line */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-primary rounded-r-full shadow-[0_0_12px_rgba(var(--primary),0.6)]" />
                  )}

                  <h3
                    className={`text-xl md:text-2xl font-bold mb-2 md:mb-3 tracking-tight transition-colors duration-400 ${
                      isActive
                        ? "text-foreground"
                        : "text-muted-foreground group-hover:text-foreground/80"
                    }`}
                  >
                    {state.label}
                  </h3>
                  <p
                    className={`text-sm md:text-base leading-relaxed transition-colors duration-400 ${
                      isActive
                        ? "text-foreground/80"
                        : "text-muted-foreground/60 group-hover:text-muted-foreground/80"
                    }`}
                  >
                    {state.desc}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Right: Premium Faux-Terminal Render */}
          <div className="lg:col-span-7 w-full h-[450px] md:h-[500px]">
            <div className="h-full w-full rounded-[2rem] overflow-hidden border border-border/40 bg-background/50 dark:bg-zinc-950/60 backdrop-blur-3xl shadow-[0_20px_60px_rgba(0,0,0,0.06)] dark:shadow-[0_40px_80px_rgba(0,0,0,0.3)] ring-1 ring-black/5 dark:ring-white/10 flex flex-col transition-all duration-700">
              {/* macOS Control Header */}
              <div className="flex flex-none items-center px-4 h-14 border-b border-border/50 bg-muted/40 dark:bg-zinc-900/40 backdrop-blur-md">
                <div className="flex gap-2.5">
                  <div className="w-3.5 h-3.5 rounded-full bg-border/80 dark:bg-zinc-700/80 shadow-sm border border-black/5 dark:border-white/5"></div>
                  <div className="w-3.5 h-3.5 rounded-full bg-border/80 dark:bg-zinc-700/80 shadow-sm border border-black/5 dark:border-white/5"></div>
                  <div className="w-3.5 h-3.5 rounded-full bg-border/80 dark:bg-zinc-700/80 shadow-sm border border-black/5 dark:border-white/5"></div>
                </div>
                <div className="ml-5 flex-1 text-center pr-12">
                  <span className="text-xs font-mono font-medium text-muted-foreground tracking-wider">
                    operator@nebutra-sailor: ~
                  </span>
                </div>
              </div>

              {/* Terminal Content Area */}
              <div className="flex-1 p-6 sm:p-8 overflow-y-auto w-full bg-gradient-to-br from-background/40 via-background/20 to-muted/20 dark:from-zinc-950 dark:to-[#0a0a0a]">
                {DEMO_STATES.find((s) => s.id === activeId)?.terminal}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

ProductDemoSection.displayName = "ProductDemoSection";
