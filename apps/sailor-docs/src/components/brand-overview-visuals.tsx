"use client";

import { LogomarkSVG, WordmarkEnSVG } from "@nebutra/brand";
import { MagicCard } from "@nebutra/ui/primitives";
import Image from "next/image";

export function LogoShowcase() {
  return (
    <div className="flex flex-col gap-10 my-8">
      {/* Primary Full Logos */}
      <div className="flex flex-col gap-4">
        <h4 className="text-lg font-semibold text-foreground border-b border-[var(--neutral-5)] pb-2">
          Primary Logos
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Color Logo */}
          <MagicCard
            className="p-0 rounded border-[var(--neutral-5)] flex flex-col overflow-hidden bg-[var(--neutral-1)]"
            gradientColor="var(--neutral-3)"
          >
            <div className="h-40 w-full flex items-center justify-center p-8 bg-zinc-50 dark:bg-black relative">
              <Image
                src="/logo/logo-color.svg"
                alt="Nebutra Color Logo"
                className="h-full w-full object-contain relative z-10 drop-shadow-sm"
                fill
                unoptimized
              />
            </div>
            <div className="p-3 border-t border-[var(--neutral-5)] flex justify-between items-center bg-card">
              <span className="text-sm font-medium text-foreground">Color (Default)</span>
              <code className="text-[10px] text-muted-foreground font-mono">/logo-color.svg</code>
            </div>
          </MagicCard>

          {/* Inverse Logo */}
          <MagicCard
            className="p-0 rounded border-zinc-800 flex flex-col overflow-hidden"
            gradientColor="#1a1a1a"
            gradientFrom="#0033FE"
            gradientTo="#0BF1C3"
          >
            <div className="h-40 w-full flex items-center justify-center p-8 bg-[#0a0a0a] relative">
              <Image
                src="/logo/logo-inverse.svg"
                alt="Nebutra Inverse Logo"
                className="h-full w-full object-contain relative z-10 drop-shadow-[0_0_15px_rgba(255,255,255,0.08)]"
                fill
                unoptimized
              />
            </div>
            <div className="p-3 border-t border-zinc-800 flex justify-between items-center bg-zinc-950">
              <span className="text-sm font-medium text-white">Inverse (Dark Mode)</span>
              <code className="text-[10px] text-zinc-500 font-mono">/logo-inverse.svg</code>
            </div>
          </MagicCard>

          {/* Mono Logo */}
          <MagicCard
            className="p-0 rounded border-[var(--neutral-5)] flex flex-col overflow-hidden bg-[var(--neutral-1)]"
            gradientColor="var(--neutral-3)"
          >
            <div className="h-40 w-full flex items-center justify-center p-8 bg-zinc-100 dark:bg-zinc-900 border-b border-[var(--neutral-5)]">
              <Image
                src="/logo/logo-mono.svg"
                alt="Nebutra Mono Logo"
                className="h-full w-full object-contain relative z-10 opacity-80"
                fill
                unoptimized
              />
            </div>
            <div className="p-3 bg-card border-t border-[var(--neutral-5)] flex justify-between items-center">
              <span className="text-sm font-medium text-foreground">Monochrome</span>
              <code className="text-[10px] text-muted-foreground font-mono">/logo-mono.svg</code>
            </div>
          </MagicCard>
        </div>
      </div>

      {/* Localized Full Logos */}
      <div className="flex flex-col gap-4">
        <h4 className="text-lg font-semibold text-foreground border-b border-[var(--neutral-5)] pb-2">
          Localized Logos (Logomark + Wordmark)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* EN */}
          <MagicCard
            className="p-0 rounded border-[var(--neutral-5)] flex flex-col overflow-hidden bg-[var(--neutral-1)]"
            gradientColor="var(--neutral-3)"
          >
            <div className="h-32 w-full flex items-center justify-center p-6 bg-card">
              <Image
                src="/logo/logo-en.svg"
                alt="Nebutra EN Logo"
                className="h-full w-full object-contain"
                fill
                unoptimized
              />
            </div>
            <div className="p-3 border-t border-[var(--neutral-5)] flex justify-between items-center bg-[var(--neutral-2)]">
              <span className="text-sm font-medium">English (Default)</span>
              <code className="text-[10px] text-muted-foreground font-mono">/logo-en.svg</code>
            </div>
          </MagicCard>

          {/* ZH */}
          <MagicCard
            className="p-0 rounded border-[var(--neutral-5)] flex flex-col overflow-hidden bg-[var(--neutral-1)]"
            gradientColor="var(--neutral-3)"
          >
            <div className="h-32 w-full flex items-center justify-center p-6 bg-card">
              <Image
                src="/logo/logo-zh.svg"
                alt="Nebutra ZH Logo"
                className="h-full w-full object-contain"
                fill
                unoptimized
              />
            </div>
            <div className="p-3 border-t border-[var(--neutral-5)] flex justify-between items-center bg-[var(--neutral-2)]">
              <span className="text-sm font-medium">Chinese</span>
              <code className="text-[10px] text-muted-foreground font-mono">/logo-zh.svg</code>
            </div>
          </MagicCard>

          {/* ZH-EN */}
          <MagicCard
            className="p-0 rounded border-[var(--neutral-5)] flex flex-col overflow-hidden bg-[var(--neutral-1)]"
            gradientColor="var(--neutral-3)"
          >
            <div className="h-32 w-full flex items-center justify-center p-6 bg-card">
              <Image
                src="/logo/logo-zh-en.svg"
                alt="Nebutra ZH-EN Logo"
                className="h-full w-full object-contain"
                fill
                unoptimized
              />
            </div>
            <div className="p-3 border-t border-[var(--neutral-5)] flex justify-between items-center bg-[var(--neutral-2)]">
              <span className="text-sm font-medium">Bilingual</span>
              <code className="text-[10px] text-muted-foreground font-mono">/logo-zh-en.svg</code>
            </div>
          </MagicCard>
        </div>
      </div>

      {/* Layout Variants */}
      <div className="flex flex-col gap-4">
        <h4 className="text-lg font-semibold text-foreground border-b border-[var(--neutral-5)] pb-2">
          Layout Variants
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Horizontal EN */}
          <MagicCard
            className="p-0 rounded border-[var(--neutral-5)] flex flex-col overflow-hidden bg-white dark:bg-black"
            gradientColor="var(--neutral-3)"
          >
            <div className="h-24 w-full flex items-center justify-center p-4">
              <Image
                src="/logo/logo-horizontal-en.svg"
                alt="Horizontal EN Logo"
                className="h-full w-[80%] object-contain"
                fill
                unoptimized
              />
            </div>
            <div className="p-3 border-t border-[var(--neutral-5)] flex justify-between items-center bg-[var(--neutral-1)]">
              <span className="text-xs font-medium text-foreground">Horizontal (EN)</span>
            </div>
          </MagicCard>

          {/* Horizontal ZH */}
          <MagicCard
            className="p-0 rounded border-[var(--neutral-5)] flex flex-col overflow-hidden bg-white dark:bg-black"
            gradientColor="var(--neutral-3)"
          >
            <div className="h-24 w-full flex items-center justify-center p-4">
              <Image
                src="/logo/logo-horizontal-zh.svg"
                alt="Horizontal ZH Logo"
                className="h-full w-[80%] object-contain"
                fill
                unoptimized
              />
            </div>
            <div className="p-3 border-t border-[var(--neutral-5)] flex justify-between items-center bg-[var(--neutral-1)]">
              <span className="text-xs font-medium text-foreground">Horizontal (ZH)</span>
            </div>
          </MagicCard>

          {/* Vertical EN */}
          <MagicCard
            className="p-0 rounded border-[var(--neutral-5)] flex flex-col overflow-hidden bg-white dark:bg-black"
            gradientColor="var(--neutral-3)"
          >
            <div className="h-32 w-full flex items-center justify-center p-4 border-b border-[var(--neutral-5)]">
              <Image
                src="/logo/logo-vertical-en.svg"
                alt="Vertical EN Logo"
                className="h-full w-[60%] object-contain"
                fill
                unoptimized
              />
            </div>
            <div className="p-3 flex justify-between items-center bg-[var(--neutral-1)]">
              <span className="text-xs font-medium text-foreground">Vertical (EN)</span>
            </div>
          </MagicCard>

          {/* Vertical ZH */}
          <MagicCard
            className="p-0 rounded border-[var(--neutral-5)] flex flex-col overflow-hidden bg-white dark:bg-black"
            gradientColor="var(--neutral-3)"
          >
            <div className="h-32 w-full flex items-center justify-center p-4 border-b border-[var(--neutral-5)]">
              <Image
                src="/logo/logo-vertical-zh.svg"
                alt="Vertical ZH Logo"
                className="h-full w-[60%] object-contain"
                fill
                unoptimized
              />
            </div>
            <div className="p-3 flex justify-between items-center bg-[var(--neutral-1)]">
              <span className="text-xs font-medium text-foreground">Vertical (ZH)</span>
            </div>
          </MagicCard>
        </div>
      </div>

      {/* Components */}
      <div className="flex flex-col gap-4">
        <h4 className="text-lg font-semibold text-foreground border-b border-[var(--neutral-5)] pb-2">
          Interactive SVG Components
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Logomark Only */}
          <MagicCard
            className="p-0 rounded border-[var(--neutral-5)] flex flex-col overflow-hidden bg-[var(--neutral-1)]"
            gradientColor="var(--neutral-3)"
          >
            <div className="h-40 flex flex-col items-center justify-center p-6 bg-card gap-6">
              <LogomarkSVG width={48} height={48} className="text-[#0033FE] dark:text-[#0BF1C3]" />
              <div className="flex items-center gap-4 opacity-60">
                <LogomarkSVG width={16} height={16} className="text-foreground" />
                <LogomarkSVG width={16} height={16} className="text-muted-foreground" />
                <LogomarkSVG width={16} height={16} className="text-[#0033FE]" />
                <LogomarkSVG width={16} height={16} className="text-[#0BF1C3]" />
              </div>
            </div>
            <div className="p-3 border-t border-[var(--neutral-5)] flex justify-between items-center bg-[var(--neutral-2)]">
              <span className="text-sm font-medium">Logomark (JSX Component)</span>
              <code className="text-[10px] text-muted-foreground font-mono">
                &lt;LogomarkSVG /&gt;
              </code>
            </div>
          </MagicCard>

          {/* Wordmark Only */}
          <MagicCard
            className="p-0 rounded border-[var(--neutral-5)] flex flex-col overflow-hidden bg-[var(--neutral-1)]"
            gradientColor="var(--neutral-3)"
          >
            <div className="h-40 flex items-center justify-center bg-card">
              <WordmarkEnSVG width={140} className="text-foreground" />
            </div>
            <div className="p-3 border-t border-[var(--neutral-5)] flex justify-between items-center bg-[var(--neutral-2)]">
              <span className="text-sm font-medium">Wordmark (JSX Component)</span>
              <code className="text-[10px] text-muted-foreground font-mono">
                &lt;WordmarkEnSVG /&gt;
              </code>
            </div>
          </MagicCard>
        </div>
      </div>
    </div>
  );
}

import { Code, Lightning, Moon, Sparkles } from "@nebutra/icons";

export function BrandPhilosophyVisual() {
  return (
    <div className="my-16 flex flex-col gap-8">
      {/* Header section */}
      <div className="flex flex-col gap-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--neutral-6)] bg-background/50 backdrop-blur-md px-3 py-1 text-sm font-medium text-muted-foreground w-fit shadow-sm">
          <LogomarkSVG width={14} height={14} className="text-foreground" />
          Visual Philosophy
        </div>
        <h3 className="text-3xl md:text-5xl font-display font-bold tracking-tight text-foreground">
          Self-Referential Intelligence
        </h3>
        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-3xl">
          The Nebutra visual identity is rooted in the hexagon — the most efficient tessellation
          found in nature. It represents structured intelligence emerging from interconnected nodes,
          built for absolute precision and scale.
        </p>
      </div>

      {/* Bento Grid Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Dark-first */}
        <MagicCard
          className="p-8 md:p-10 rounded-2xl border-[var(--neutral-5)] bg-[var(--neutral-1)] flex flex-col gap-4 overflow-hidden"
          gradientColor="var(--neutral-3)"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-[var(--neutral-5)] bg-card shadow-sm mb-2">
            <Moon className="h-6 w-6 text-foreground" />
          </div>
          <h4 className="text-xl font-semibold text-foreground">Dark-first</h4>
          <p className="text-muted-foreground leading-relaxed text-base">
            Our interfaces are designed for deep focus. Dark mode is our native state, with light
            mode acting as a deliberate adaptation for highly illuminated environments.
          </p>
        </MagicCard>

        {/* Gradient Sign */}
        <MagicCard
          className="p-8 md:p-10 rounded-2xl border-[var(--neutral-5)] bg-[var(--neutral-1)] flex flex-col gap-4 overflow-hidden relative"
          gradientColor="var(--neutral-3)"
        >
          {/* Subtle gradient orb */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-[linear-gradient(135deg,#0033FE_0%,#0BF1C3_100%)] opacity-10 dark:opacity-20 blur-[50px] rounded-full pointer-events-none" />

          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-[#0033FE]/20 bg-[#0033FE]/5 shadow-sm mb-2 relative z-10">
            <Sparkles className="h-6 w-6 text-[#0033FE] dark:text-[#0BF1C3]" />
          </div>
          <h4 className="text-xl font-semibold text-foreground relative z-10">Gradient Sign</h4>
          <p className="text-muted-foreground leading-relaxed text-base relative z-10">
            We use a precise Blue-to-Cyan gradient sparingly to indicate high-value actions, brand
            moments, and critical AI interventions.
          </p>
        </MagicCard>

        {/* Intentional Motion */}
        <MagicCard
          className="p-8 md:p-10 rounded-2xl border-[var(--neutral-5)] bg-[var(--neutral-1)] flex flex-col gap-4 overflow-hidden"
          gradientColor="var(--neutral-3)"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-[var(--neutral-5)] bg-card shadow-sm mb-2">
            <Lightning className="h-6 w-6 text-foreground" />
          </div>
          <h4 className="text-xl font-semibold text-foreground">Intentional Motion</h4>
          <p className="text-muted-foreground leading-relaxed text-base">
            Animation is never decorative. Motion represents state changes, data processing, and
            system intelligence. It is sharp, fast, and decisive.
          </p>
        </MagicCard>

        {/* Precision */}
        <MagicCard
          className="p-8 md:p-10 rounded-2xl border-[var(--neutral-5)] bg-[var(--neutral-1)] flex flex-col gap-4 overflow-hidden"
          gradientColor="var(--neutral-3)"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-[var(--neutral-5)] bg-card shadow-sm mb-2">
            <Code className="h-6 w-6 text-foreground" />
          </div>
          <h4 className="text-xl font-semibold text-foreground">Precision</h4>
          <p className="text-muted-foreground leading-relaxed text-base">
            Every spacing, color, and typography decision is tokenized. The brand is shipped as
            code, ensuring absolute consistency across all touchpoints.
          </p>
        </MagicCard>
      </div>
    </div>
  );
}
