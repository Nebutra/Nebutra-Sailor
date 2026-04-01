/**
 * Hero - Marketing Hero Section
 *
 * Primary above-the-fold section with headline, value proposition, CTAs,
 * and visual elements (gradients, particles, 3D, video).
 */

"use client";

import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { cn } from "@nebutra/ui/utils";
import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import type { HeroProps } from "./types";

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
  // Background renderer
  const renderBackground = () => {
    switch (backgroundType) {
      case "video":
        return (
          <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 bg-black">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover opacity-40 mix-blend-screen"
            >
              {/* Optional: Add video sourcce if supported globally */}
              <source src="/assets/hero-bg.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black opacity-80" />
          </div>
        );
      case "mesh":
      default:
        return (
          <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 flex items-center justify-center isolate">
            <div className="absolute inset-0 bg-[var(--brand-1)] dark:bg-[var(--neutral-1)]" />
            {/* Mesh gradient approximation */}
            <div className="absolute -top-1/4 -left-1/4 size-[50rem] rounded-full bg-[var(--brand-6)]/20 blur-[100px] opacity-70" />
            <div className="absolute top-1/2 -right-1/4 size-[40rem] rounded-full bg-[var(--brand-9)]/10 blur-[120px] opacity-50" />
            <div className="absolute bottom-0 left-1/3 size-[60rem] rounded-full bg-[var(--brand-5)]/10 blur-[150px] opacity-60" />
            {/* Subtle grid overlay */}
            <div className="absolute inset-0 bg-[url('/assets/grid-pattern.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
          </div>
        );
    }
  };

  return (
    <section
      id={id}
      className={cn(
        "relative w-full overflow-hidden min-h-[90vh] flex items-center pt-24 pb-16",
        variant === "centered" || variant === "default" ? "text-center" : "text-left",
        className,
      )}
    >
      {renderBackground()}

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
                    <span
                      style={{
                        background:
                          "var(--brand-gradient, linear-gradient(to right, var(--brand-9), var(--brand-7)))",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}
                    >
                      Agentic Precision
                    </span>
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
                  className="inline-flex h-12 items-center justify-center rounded-lg bg-[var(--brand-9)] px-8 text-base font-semibold text-white shadow-lg shadow-[var(--brand-9)]/20 hover:bg-[var(--brand-10)] transition-all hover:scale-105 active:scale-95 group"
                >
                  {primaryCTA?.text || "Start Free Trial"}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </a>

                <a
                  href={secondaryCTA?.href || "/demo"}
                  className="inline-flex h-12 items-center justify-center rounded-lg border border-[var(--neutral-6)] bg-white/50 dark:bg-black/50 backdrop-blur-sm px-8 text-base font-medium text-[var(--neutral-12)] shadow-sm hover:bg-[var(--neutral-3)] transition-all hover:scale-[1.02] active:scale-[0.98] group"
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
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
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
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full relative h-[400px] lg:h-[600px] rounded-2xl overflow-hidden shadow-2xl border border-[var(--neutral-4)] bg-[var(--neutral-2)]"
          >
            {media?.type === "video" ? (
              <video
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
                poster={media.src?.replace(".mp4", ".jpg")}
              >
                <source src={media.src} type="video/mp4" />
              </video>
            ) : media?.type === "image" ? (
              <img
                src={media.src}
                alt={media.alt || "Hero Media"}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[var(--neutral-3)] to-[var(--neutral-2)] flex items-center justify-center overflow-hidden">
                {/* 3D Placeholder or generic fallback */}
                <div className="w-3/4 h-3/4 bg-white/50 dark:bg-black/50 backdrop-blur border border-white/20 dark:border-white/10 rounded-xl shadow-[0_0_80px_rgba(0,0,0,0.1)] flex items-center justify-center -rotate-3 hover:rotate-0 transition-transform duration-700 cursor-pointer group">
                  <Play className="h-16 w-16 text-[var(--brand-9)] group-hover:scale-110 transition-transform" />
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden md:flex flex-col items-center gap-2"
      >
        <span className="text-xs font-medium text-[var(--neutral-10)] uppercase tracking-widest">
          Scroll
        </span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="w-px h-12 bg-gradient-to-b from-[var(--neutral-5)] to-transparent"
        />
      </motion.div>
    </section>
  );
}

Hero.displayName = "Hero";
