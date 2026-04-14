"use client";

import { ArrowRight, Layout, Sparkles, TerminalWindow } from "@nebutra/icons";
import { AnimatedGradientText, DitheringShader } from "@nebutra/ui/primitives";
import Link from "next/link";

export function IntroductionHero() {
  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-[var(--neutral-6)] bg-card shadow-sm mb-12 mt-6">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 opacity-[0.15] dark:opacity-40 mix-blend-screen mix-blend-plus-lighter pointer-events-none">
        <DitheringShader
          shape="swirl"
          type="4x4"
          colorBack="#220011"
          colorFront="#00ffff"
          pxSize={4}
          speed={0.9}
          className="absolute inset-0"
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 z-0 bg-[url('/grid.svg')] bg-repeat opacity-[0.03] dark:opacity-[0.05] pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-start gap-6 px-8 py-16 md:px-12 md:py-20 lg:py-24 max-w-4xl mx-auto text-center md:text-left md:mx-0">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--neutral-6)] bg-background/50 backdrop-blur-md px-3 py-1 text-sm font-medium text-muted-foreground shadow-sm">
          <span className="flex h-2 w-2 rounded-full bg-[var(--brand-cyan)] animate-pulse" />
          Version 2.0 (Next-Gen)
        </div>

        <h1 className="text-4xl md:text-5xl lg:text-7xl font-display font-bold tracking-tight text-foreground leading-[1.1]">
          The Definitive <br className="hidden md:block" />
          <AnimatedGradientText className="bg-clip-text text-transparent bg-[linear-gradient(135deg,#0033FE_0%,#0BF1C3_100%)]">
            Source of Truth
          </AnimatedGradientText>
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
          Nebutra Design System is a unified UI foundation extracted from production applications.
          Every specification, token, and component is deployable.
        </p>

        <div className="flex flex-wrap items-center gap-4 mt-4 w-full justify-center md:justify-start">
          <Link
            href="/docs/components/introduction"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[linear-gradient(135deg,#0033FE_0%,#0BF1C3_100%)] px-6 py-3 text-sm font-medium text-white shadow hover:opacity-90 transition-opacity !no-underline"
          >
            <Layout className="h-4 w-4" />
            Browse Components
          </Link>
          <Link
            href="/docs/foundations/brand-colors"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--neutral-6)] bg-background hover:bg-muted px-6 py-3 text-sm font-medium text-foreground transition-colors shadow-sm !no-underline"
          >
            <Sparkles className="h-4 w-4" />
            Design Foundations
          </Link>
          <Link
            href="https://github.com/Nebutra/Nebutra-Sailor"
            target="_blank"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent hover:bg-muted px-4 py-3 text-sm font-medium text-muted-foreground transition-colors !no-underline"
          >
            <TerminalWindow className="h-4 w-4" />
            Source Code <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
