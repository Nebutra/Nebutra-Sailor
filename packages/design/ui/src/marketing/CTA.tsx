"use client";

import { Check } from "@nebutra/icons";
import { cva } from "class-variance-authority";
import { AnimateIn, AnimateInGroup } from "../primitives/animate-in";
import { cn } from "../utils/cn";
import type { CTAProps } from "./types";

const ctaVariants = cva("relative overflow-hidden w-full rounded-[var(--radius-3xl)]", {
  variants: {
    variant: {
      simple: "flex flex-col md:flex-row items-center justify-between p-8 md:p-12",
      split: "grid md:grid-cols-2 gap-12 items-center p-8 md:p-16 text-left",
      centered: "flex flex-col items-center text-center p-12 md:p-24",
      gradient: "flex flex-col items-center text-center p-12 md:p-24",
    },
    backgroundType: {
      gradient: "bg-[var(--brand-gradient)] text-white",
      solid: "bg-[var(--neutral-2)] border border-[var(--neutral-6)] text-[var(--neutral-12)]",
      image: "bg-[var(--neutral-12)] text-[var(--neutral-1)]", // Default dark background for image
    },
    density: {
      compact: "my-8",
      normal: "my-16",
      spacious: "my-24",
    },
  },
  defaultVariants: {
    variant: "centered",
    backgroundType: "gradient",
    density: "normal",
  },
});

export function CTA({
  locale: _locale = "en",
  variant = "centered",
  headline,
  subheadline,
  primaryCTA,
  secondaryCTA,
  showTrust = true,
  backgroundType = "gradient",
  className,
  id,
  density = "normal",
}: CTAProps) {
  // Determine if Text should be forced strictly white (e.g. for dark backdrops)
  const isDarkCanvas = backgroundType === "gradient" || backgroundType === "image";
  const textColor = isDarkCanvas ? "text-white" : "text-[var(--neutral-12)]";
  const subtextColor = isDarkCanvas ? "text-white/80" : "text-[var(--neutral-11)]";

  return (
    <section
      id={id}
      className={cn(className, "w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8")}
      data-density={density}
    >
      <AnimateIn preset="scale">
        <div className={cn(ctaVariants({ variant, backgroundType, density }))}>
          {/* Optional Ambient Background Layer */}
          {backgroundType === "image" && (
            <div className="absolute inset-0 z-0 bg-[var(--neutral-12)]/40 pointer-events-none dark:bg-[var(--neutral-1)]/60" />
          )}
          {variant === "gradient" && (
            <div className="absolute inset-0 bg-white/10 [mask-image:linear-gradient(to_bottom,white,transparent)] z-0 pointer-events-none" />
          )}

          <div
            className={cn(
              "relative z-10 flex flex-col gap-6",
              variant === "simple" ? "items-start text-left" : "",
            )}
          >
            <AnimateInGroup stagger="normal">
              {headline && (
                <AnimateIn preset="fadeUp">
                  <h2
                    className={cn(
                      "text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight",
                      textColor,
                    )}
                  >
                    {headline}
                  </h2>
                </AnimateIn>
              )}

              {subheadline && (
                <AnimateIn preset="fadeUp">
                  <p className={cn("text-lg max-w-2xl", subtextColor)}>{subheadline}</p>
                </AnimateIn>
              )}

              <AnimateIn preset="fadeUp">
                <div
                  className={cn(
                    "flex flex-col sm:flex-row gap-4 mt-6",
                    variant === "centered" || variant === "gradient"
                      ? "justify-center"
                      : "justify-start",
                  )}
                >
                  {primaryCTA && (
                    <a
                      href={primaryCTA.href}
                      className={cn(
                        "inline-flex items-center justify-center px-8 py-3.5 rounded-full font-medium transition-[background-color,box-shadow,color,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                        isDarkCanvas
                          ? "bg-[var(--neutral-1)] text-[var(--neutral-12)] hover:bg-[var(--neutral-2)] focus-visible:ring-white"
                          : "bg-[var(--neutral-12)] text-[var(--neutral-1)] hover:bg-[var(--neutral-11)] focus-visible:ring-[var(--neutral-12)]",
                      )}
                      data-analytics="footer-cta-primary"
                    >
                      {primaryCTA.text}
                    </a>
                  )}
                  {secondaryCTA && (
                    <a
                      href={secondaryCTA.href}
                      className={cn(
                        "inline-flex items-center justify-center px-8 py-3.5 rounded-full font-medium border transition-[background-color,border-color,box-shadow,color,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                        isDarkCanvas
                          ? "border-white/20 text-white hover:bg-white/10 focus-visible:ring-white"
                          : "border-[var(--neutral-6)] text-[var(--neutral-12)] hover:bg-[var(--neutral-3)] focus-visible:ring-[var(--neutral-12)]",
                      )}
                      data-analytics="footer-cta-secondary"
                    >
                      {secondaryCTA.text}
                    </a>
                  )}
                </div>
              </AnimateIn>

              {showTrust && (
                <AnimateIn preset="fadeUp">
                  <div
                    className={cn(
                      "flex flex-col sm:flex-row items-center gap-2 mt-8 text-sm",
                      subtextColor,
                      variant === "centered" || variant === "gradient"
                        ? "justify-center"
                        : "justify-start",
                    )}
                  >
                    <div className="flex">
                      <div className="w-6 h-6 rounded-full bg-[var(--neutral-6)] border-2 border-white/10" />
                      <div className="-ml-2 w-6 h-6 rounded-full bg-[var(--neutral-7)] border-2 border-white/10" />
                      <div className="-ml-2 w-6 h-6 rounded-full bg-[var(--neutral-8)] border-2 border-white/10" />
                    </div>
                    <p className="ml-2 flex items-center gap-1.5 opacity-90">
                      <Check className="h-[15px] w-[15px] opacity-70" aria-hidden="true" />
                      No credit card required &bull; 14-day free trial
                    </p>
                  </div>
                </AnimateIn>
              )}
            </AnimateInGroup>
          </div>
        </div>
      </AnimateIn>
    </section>
  );
}

CTA.displayName = "CTA";
