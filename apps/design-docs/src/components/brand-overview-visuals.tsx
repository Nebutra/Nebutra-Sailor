"use client";

import { LogomarkSVG, WordmarkEnSVG } from "@nebutra/brand";
import { Code, Lightning, Moon, Sparkles } from "@nebutra/icons";
import { MagicCard } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import Image from "next/image";
import type { ReactNode } from "react";

type LogoAssetCardProps = {
  title: string;
  src: string;
  alt: string;
  filename?: string;
  tone?: "light" | "dark" | "muted";
  previewClassName?: string;
  imageFrameClassName?: string;
  imageClassName?: string;
};

type LogoComponentCardProps = {
  title: string;
  code: string;
  children: ReactNode;
};

const logoPreviewTone = {
  light: "bg-background",
  dark: "bg-[#0a0a0a]",
  muted: "bg-muted",
} as const;

function LogoAssetCard({
  title,
  src,
  alt,
  filename,
  tone = "light",
  previewClassName,
  imageFrameClassName,
  imageClassName,
}: LogoAssetCardProps) {
  return (
    <figure className="m-0 flex min-w-0 flex-col overflow-hidden rounded border border-border bg-background">
      <div
        className={cn(
          "flex min-h-44 w-full items-center justify-center overflow-hidden p-8",
          logoPreviewTone[tone],
          previewClassName,
        )}
      >
        <div className={cn("relative min-w-0 shrink-0", imageFrameClassName)}>
          <Image
            src={src}
            alt={alt}
            className={cn("object-contain", imageClassName)}
            fill
            sizes="(min-width: 1280px) 280px, (min-width: 768px) 45vw, 80vw"
            unoptimized
          />
        </div>
      </div>
      <figcaption
        className={cn(
          "flex min-h-14 min-w-0 flex-col gap-1 border-t px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between",
          tone === "dark"
            ? "border-zinc-800 bg-zinc-950 text-white"
            : "border-border bg-card text-foreground",
        )}
      >
        <span className="min-w-0 text-sm font-medium leading-5">{title}</span>
        {filename ? (
          <code
            className={cn(
              "w-fit max-w-full truncate rounded border px-1.5 py-1 font-mono text-[10px] leading-none",
              tone === "dark"
                ? "border-white/10 bg-white/5 text-zinc-400"
                : "border-border bg-muted text-muted-foreground",
            )}
          >
            {filename}
          </code>
        ) : null}
      </figcaption>
    </figure>
  );
}

function LogoComponentCard({ title, code, children }: LogoComponentCardProps) {
  return (
    <figure className="m-0 flex min-w-0 flex-col overflow-hidden rounded border border-border bg-background">
      <div className="flex min-h-44 items-center justify-center bg-card p-6">{children}</div>
      <figcaption className="flex min-h-14 min-w-0 flex-col gap-1 border-t border-border bg-muted px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <span className="min-w-0 text-sm font-medium leading-5">{title}</span>
        <code className="w-fit max-w-full truncate rounded border border-border bg-card px-1.5 py-1 font-mono text-[10px] leading-none text-muted-foreground">
          {code}
        </code>
      </figcaption>
    </figure>
  );
}

export function LogoShowcase() {
  return (
    <div className="flex flex-col gap-10 my-8">
      <div className="flex flex-col gap-4">
        <h4 className="text-lg font-semibold text-foreground border-b border-border pb-2">
          Primary Logos
        </h4>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <LogoAssetCard
            title="Color (Default)"
            src="/logo/logo-color.svg"
            alt="Nebutra color logo"
            filename="/logo-color.svg"
            tone="muted"
            imageFrameClassName="h-36 w-[82%]"
            imageClassName="drop-shadow-sm"
          />
          <LogoAssetCard
            title="Inverse (Dark Mode)"
            src="/logo/logo-inverse.svg"
            alt="Nebutra inverse logo"
            filename="/logo-inverse.svg"
            tone="dark"
            imageFrameClassName="h-36 w-[82%]"
            imageClassName="drop-shadow-[0_0_15px_rgba(255,255,255,0.08)]"
          />
          <LogoAssetCard
            title="Monochrome"
            src="/logo/logo-mono.svg"
            alt="Nebutra monochrome logo"
            filename="/logo-mono.svg"
            tone="muted"
            imageFrameClassName="h-36 w-[82%]"
            imageClassName="opacity-80"
          />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h4 className="text-lg font-semibold text-foreground border-b border-border pb-2">
          Localized Logos (Logomark + Wordmark)
        </h4>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          <LogoAssetCard
            title="English (Default)"
            src="/logo/logo-en.svg"
            alt="Nebutra English localized logo"
            filename="/logo-en.svg"
            previewClassName="min-h-48"
            imageFrameClassName="h-24 w-[90%]"
          />
          <LogoAssetCard
            title="Chinese"
            src="/logo/logo-zh.svg"
            alt="Nebutra Chinese localized logo"
            filename="/logo-zh.svg"
            previewClassName="min-h-48"
            imageFrameClassName="h-32 w-[92%]"
          />
          <LogoAssetCard
            title="Bilingual"
            src="/logo/logo-zh-en.svg"
            alt="Nebutra bilingual localized logo"
            filename="/logo-zh-en.svg"
            previewClassName="min-h-48"
            imageFrameClassName="h-36 w-[92%]"
          />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h4 className="text-lg font-semibold text-foreground border-b border-border pb-2">
          Layout Variants
        </h4>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <LogoAssetCard
            title="Horizontal (EN)"
            src="/logo/logo-horizontal-en.svg"
            alt="Horizontal English logo"
            previewClassName="min-h-36 p-6"
            imageFrameClassName="h-16 w-[92%]"
          />
          <LogoAssetCard
            title="Horizontal (ZH)"
            src="/logo/logo-horizontal-zh.svg"
            alt="Horizontal Chinese logo"
            previewClassName="min-h-36 p-6"
            imageFrameClassName="h-16 w-[92%]"
          />
          <LogoAssetCard
            title="Vertical (EN)"
            src="/logo/logo-vertical-en.svg"
            alt="Vertical English logo"
            previewClassName="min-h-56 p-6"
            imageFrameClassName="h-44 w-[86%]"
          />
          <LogoAssetCard
            title="Vertical (ZH)"
            src="/logo/logo-vertical-zh.svg"
            alt="Vertical Chinese logo"
            previewClassName="min-h-56 p-6"
            imageFrameClassName="h-44 w-[86%]"
          />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h4 className="text-lg font-semibold text-foreground border-b border-border pb-2">
          Interactive SVG Components
        </h4>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <LogoComponentCard title="Logomark (JSX Component)" code="<LogomarkSVG />">
            <div className="flex flex-col items-center justify-center gap-6">
              <LogomarkSVG
                width={48}
                height={48}
                className="text-[hsl(var(--primary))] dark:text-[var(--brand-accent)]"
                aria-label="Nebutra logomark"
              />
              <div className="flex items-center gap-4 opacity-60">
                <LogomarkSVG
                  width={16}
                  height={16}
                  className="text-foreground"
                  aria-label="Foreground Nebutra logomark"
                />
                <LogomarkSVG
                  width={16}
                  height={16}
                  className="text-muted-foreground"
                  aria-label="Muted Nebutra logomark"
                />
                <LogomarkSVG
                  width={16}
                  height={16}
                  className="text-[hsl(var(--primary))]"
                  aria-label="Blue Nebutra logomark"
                />
                <LogomarkSVG
                  width={16}
                  height={16}
                  className="text-[var(--brand-accent)]"
                  aria-label="Cyan Nebutra logomark"
                />
              </div>
            </div>
          </LogoComponentCard>
          <LogoComponentCard title="Wordmark (JSX Component)" code="<WordmarkEnSVG />">
            <WordmarkEnSVG
              width={180}
              height={34}
              className="max-w-[80%] text-foreground"
              aria-label="Nebutra wordmark"
            />
          </LogoComponentCard>
        </div>
      </div>
    </div>
  );
}

export function BrandPhilosophyVisual() {
  return (
    <div className="my-16 flex flex-col gap-8">
      {/* Header section */}
      <div className="flex flex-col gap-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/50 backdrop-blur-md px-3 py-1 text-sm font-medium text-muted-foreground w-fit shadow-sm">
          <LogomarkSVG
            width={14}
            height={14}
            className="text-foreground"
            aria-label="Nebutra visual philosophy"
          />
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
          className="p-8 md:p-10 rounded-2xl border-border bg-background flex flex-col gap-4 overflow-hidden"
          gradientColor="hsl(var(--muted))"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-card shadow-sm mb-2">
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
          className="p-8 md:p-10 rounded-2xl border-border bg-background flex flex-col gap-4 overflow-hidden relative"
          gradientColor="hsl(var(--muted))"
        >
          {/* Subtle gradient orb */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-[image:var(--brand-gradient-logo)] opacity-10 dark:opacity-20 blur-[50px] rounded-full pointer-events-none" />

          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-[hsl(var(--primary))]/20 bg-[hsl(var(--primary))]/5 shadow-sm mb-2 relative z-10">
            <Sparkles className="h-6 w-6 text-[hsl(var(--primary))] dark:text-[var(--brand-accent)]" />
          </div>
          <h4 className="text-xl font-semibold text-foreground relative z-10">Gradient Sign</h4>
          <p className="text-muted-foreground leading-relaxed text-base relative z-10">
            We use a precise Blue-to-Cyan gradient sparingly to indicate high-value actions, brand
            moments, and critical AI interventions.
          </p>
        </MagicCard>

        {/* Intentional Motion */}
        <MagicCard
          className="p-8 md:p-10 rounded-2xl border-border bg-background flex flex-col gap-4 overflow-hidden"
          gradientColor="hsl(var(--muted))"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-card shadow-sm mb-2">
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
          className="p-8 md:p-10 rounded-2xl border-border bg-background flex flex-col gap-4 overflow-hidden"
          gradientColor="hsl(var(--muted))"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-card shadow-sm mb-2">
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
