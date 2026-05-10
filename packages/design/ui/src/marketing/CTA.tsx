"use client";

import { cva } from "class-variance-authority";
import * as React from "react";
import { AnimateIn, AnimateInGroup } from "../primitives/animate-in";
import { cn } from "../utils/cn";
import type { CTAProps } from "./types";

const ctaVariants = cva("relative overflow-hidden w-full rounded-3xl", {
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
            <div className="absolute inset-0 bg-black/40 z-0 pointer-events-none" />
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
                        "inline-flex items-center justify-center px-8 py-3.5 rounded-full font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                        isDarkCanvas
                          ? "bg-white text-black hover:bg-white/90 focus-visible:ring-white"
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
                        "inline-flex items-center justify-center px-8 py-3.5 rounded-full font-medium border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
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
                    <div className="flex -space-x-2">
                      <div className="w-6 h-6 rounded-full bg-[var(--neutral-6)] border-2 border-white/10" />
                      <div className="w-6 h-6 rounded-full bg-[var(--neutral-7)] border-2 border-white/10" />
                      <div className="w-6 h-6 rounded-full bg-[var(--neutral-8)] border-2 border-white/10" />
                    </div>
                    <p className="ml-2 flex items-center gap-1.5 opacity-90">
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 15 15"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="currentColor opacity-70"
                      >
                        <path
                          d="M7.49991 0.876892C3.84222 0.876892 0.877075 3.84204 0.877075 7.49972C0.877075 11.1574 3.84222 14.1226 7.49991 14.1226C11.1576 14.1226 14.1227 11.1574 14.1227 7.49972C14.1227 3.84204 11.1576 0.876892 7.49991 0.876892ZM1.82707 7.49972C1.82707 4.36671 4.36689 1.82689 7.49991 1.82689C10.6329 1.82689 13.1727 4.36671 13.1727 7.49972C13.1727 10.6327 10.6329 13.1726 7.49991 13.1726C4.36689 13.1726 1.82707 10.6327 1.82707 7.49972ZM10.6067 4.35334L6.15177 9.87321L4.17065 7.9103C3.89664 7.63878 3.4542 7.64062 3.18267 7.91463C2.91114 8.18864 2.91299 8.63108 3.187 8.90261L5.687 11.3793C5.83416 11.5252 6.03927 11.6026 6.25 11.5973C6.46074 11.592 6.66014 11.5049 6.79974 11.332L11.7997 5.13845C12.0463 4.83296 11.9986 4.38531 11.6931 4.13876C11.3876 3.8922 10.9399 3.93988 10.6934 4.24543L10.6067 4.35334Z"
                          fill="currentColor"
                          fillRule="evenodd"
                          clipRule="evenodd"
                        ></path>
                      </svg>
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
