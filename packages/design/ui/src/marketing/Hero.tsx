/**
 * Hero - Marketing Hero Section
 *
 * Primary above-the-fold section with headline, value proposition, CTAs,
 * and visual elements (gradients, particles, 3D, video).
 */

"use client";

import { ArrowRight, Play } from "@nebutra/icons";
import Image from "next/image";
import { AnimateIn, AnimateInGroup } from "../primitives/animate-in";
import { domAnimation, LazyMotion, m } from "../shared/animation/motion";
import { cn } from "../utils";
import { GridPattern } from "./grid-pattern";
import type { HeroProps } from "./types";

const TRUST_BADGE_IDS = ["runtime", "policy", "deploy", "audit", "ops"] as const;

function HeroBackground({ backgroundType }: { backgroundType: HeroProps["backgroundType"] }) {
  switch (backgroundType) {
    case "video":
      return (
        <div className="absolute inset-0 -z-10 overflow-hidden bg-[var(--neutral-12)] pointer-events-none dark:bg-[var(--neutral-1)]">
          <video
            autoPlay
            loop
            muted
            playsInline
            aria-label="Decorative hero background video"
            className="h-full w-full object-cover opacity-40 mix-blend-screen"
          >
            <source src="/assets/hero-bg.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--neutral-12)] via-transparent to-[var(--neutral-12)] opacity-80 dark:from-[var(--neutral-1)] dark:to-[var(--neutral-1)]" />
        </div>
      );
    default:
      return (
        <div className="pointer-events-none absolute inset-0 -z-10 isolate flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-[var(--brand-1)] dark:bg-[var(--neutral-1)]" />
          {/* Mesh gradient approximation */}
          <div className="absolute -top-1/4 -left-1/4 size-[50rem] rounded-full bg-[var(--brand-6)]/20 blur-[100px] opacity-70" />
          <div className="absolute top-1/2 -right-1/4 size-[40rem] rounded-full bg-[var(--brand-9)]/10 blur-[120px] opacity-50" />
          <div className="absolute bottom-0 left-1/3 size-[60rem] rounded-full bg-[var(--brand-5)]/10 blur-[150px] opacity-60" />
          <GridPattern className="[mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
        </div>
      );
  }
}

export function Hero({
  locale: _locale = "en",
  variant = "default",
  backgroundType = "gradient",
  headline,
  subheadline,
  primaryCTA,
  secondaryCTA,
  showTrustBadges = true,
  media,
  className,
  id,
}: HeroProps) {
  return (
    <LazyMotion features={domAnimation}>
      <section
        id={id}
        className={cn(
          "relative flex min-h-[90vh] w-full items-center overflow-hidden pt-24 pb-16",
          variant === "centered" || variant === "default" ? "text-center" : "text-left",
          className,
        )}
      >
        <HeroBackground backgroundType={backgroundType} />

        <div
          className={cn(
            "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 w-full",
            variant === "split"
              ? "grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center"
              : "flex flex-col items-center",
          )}
        >
          {/* Content Layer */}
          <div
            className={cn(
              "flex flex-col",
              variant === "split" ? "max-w-xl" : "items-center max-w-3xl mx-auto",
            )}
          >
            <AnimateInGroup stagger="fast">
              {/* Headline */}
              <AnimateIn preset="fadeUp">
                <h1
                  className={cn(
                    "text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-[var(--neutral-12)]",
                    variant === "split" ? "mb-6" : "mb-8 text-center",
                  )}
                >
                  {headline || (
                    <span>
                      Build faster with{" "}
                      <span className="text-[var(--brand-11)]">Agentic Precision</span>
                    </span>
                  )}
                </h1>
              </AnimateIn>

              {/* Subheadline */}
              <AnimateIn preset="fadeUp">
                <p
                  className={cn(
                    "text-lg sm:text-xl md:text-2xl text-[var(--neutral-11)] leading-relaxed lg:leading-relaxed",
                    variant === "split" ? "mb-8" : "mb-10 text-center max-w-2xl mx-auto",
                  )}
                >
                  {subheadline ||
                    "The unified multi-agent operating system scaling next-generation SaaS businesses autonomously."}
                </p>
              </AnimateIn>

              {/* CTA Buttons */}
              <AnimateIn preset="fadeUp">
                <div
                  className={cn(
                    "flex flex-col sm:flex-row gap-4",
                    variant === "split" ? "" : "justify-center",
                  )}
                >
                  <a
                    href={primaryCTA?.href || "/signup"}
                    className="inline-flex h-12 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--brand-9)] px-8 text-base font-semibold text-white shadow-lg shadow-[var(--brand-9)]/20 hover:bg-[var(--brand-10)] transition-[background-color,box-shadow,transform] hover:scale-105 active:scale-95 motion-reduce:hover:scale-100 motion-reduce:active:scale-100 group"
                  >
                    {primaryCTA?.text || "Start Free Trial"}
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </a>

                  <a
                    href={secondaryCTA?.href || "/demo"}
                    className="inline-flex h-12 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--neutral-6)] bg-white/50 px-8 text-base font-medium text-[var(--neutral-12)] shadow-sm backdrop-blur-sm transition-[background-color,border-color,box-shadow,transform] hover:scale-[1.02] hover:bg-[var(--neutral-3)] active:scale-[0.98] motion-reduce:hover:scale-100 motion-reduce:active:scale-100 dark:bg-[var(--neutral-1)]/70 group"
                  >
                    <Play className="mr-2 h-4 w-4 text-[var(--neutral-11)] group-hover:text-[var(--neutral-12)] transition-colors" />
                    {secondaryCTA?.text || "Watch Demo"}
                  </a>
                </div>
              </AnimateIn>

              {/* Trust Badges */}
              {showTrustBadges && (
                <AnimateIn preset="fade">
                  <div
                    className={cn("mt-12 sm:mt-16", variant === "split" ? "w-full" : "text-center")}
                  >
                    <p className="text-sm font-medium text-[var(--neutral-10)] uppercase tracking-wider mb-6">
                      Trusted by innovative engineering teams
                    </p>
                    <div
                      className={cn(
                        "flex flex-wrap items-center gap-6 sm:gap-10",
                        variant === "split" ? "justify-start" : "justify-center",
                      )}
                    >
                      {/* Placeholder logos - real logos will be mapped from props later */}
                      {TRUST_BADGE_IDS.map((badgeId) => (
                        <div
                          key={badgeId}
                          className="h-8 w-24 rounded bg-[var(--neutral-4)] dark:bg-[var(--neutral-3)] opacity-60 animate-pulse mix-blend-luminosity"
                        />
                      ))}
                    </div>
                  </div>
                </AnimateIn>
              )}
            </AnimateInGroup>
          </div>

          {/* Media Layer (for split variant) */}
          {variant === "split" && (
            <m.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-full relative h-[400px] lg:h-[600px] rounded-[var(--radius-2xl)] overflow-hidden shadow-2xl border border-[var(--neutral-4)] bg-[var(--neutral-2)]"
            >
              {media?.type === "video" ? (
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  aria-label={media.alt || "Hero video"}
                  className="w-full h-full object-cover"
                  poster={media.src?.replace(".mp4", ".jpg")}
                >
                  <source src={media.src} type="video/mp4" />
                </video>
              ) : media?.type === "image" ? (
                <Image
                  src={media.src}
                  alt={media.alt || "Hero Media"}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[var(--neutral-3)] to-[var(--neutral-2)] flex items-center justify-center overflow-hidden">
                  {/* 3D Placeholder or generic fallback */}
                  <div className="w-3/4 h-3/4 bg-white/50 dark:bg-[var(--neutral-1)]/70 backdrop-blur border border-white/20 rounded-[var(--radius-xl)] shadow-[0_0_80px_rgba(0,0,0,0.1)] flex items-center justify-center -rotate-3 hover:rotate-0 transition-transform duration-700 cursor-pointer group">
                    <Play className="h-16 w-16 text-[var(--brand-9)] group-hover:scale-110 transition-transform" />
                  </div>
                </div>
              )}
            </m.div>
          )}
        </div>

        {/* Scroll Indicator */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden md:flex flex-col items-center gap-2"
        >
          <span className="text-xs font-medium text-[var(--neutral-10)] uppercase tracking-widest">
            Scroll
          </span>
          <m.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="w-px h-12 bg-gradient-to-b from-[var(--neutral-5)] to-transparent"
          />
        </m.div>
      </section>
    </LazyMotion>
  );
}

Hero.displayName = "Hero";
