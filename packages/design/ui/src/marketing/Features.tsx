"use client";

import { cva } from "class-variance-authority";
import { AnimateIn, AnimateInGroup } from "../primitives/animate-in";
import { cn } from "../utils/cn";
import type { Feature, FeaturesProps } from "./types";

const EMPTY_FEATURES: Feature[] = [];

const featuresVariants = cva("w-full mx-auto", {
  variants: {
    layout: {
      grid: "grid gap-6 md:gap-8",
      bento: "grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6",
      alternating: "flex flex-col gap-16 md:gap-24",
      tabs: "grid gap-6",
    },
    columns: {
      2: "md:grid-cols-2",
      3: "md:grid-cols-3",
      4: "md:grid-cols-4",
    },
    density: {
      compact: "py-8",
      normal: "py-16 md:py-24",
      spacious: "py-24 md:py-32",
    },
  },
  defaultVariants: {
    layout: "grid",
    columns: 3,
    density: "normal",
  },
});

export function Features({
  locale: _locale = "en",
  layout = "grid",
  columns = 3,
  showIcons = true,
  features = EMPTY_FEATURES,
  title,
  subtitle,
  className,
  id,
  density = "normal",
}: FeaturesProps) {
  return (
    <section
      id={id}
      className={cn(className, "w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8")}
      data-density={density}
    >
      {(title || subtitle) && (
        <AnimateIn preset="fadeUp">
          <div className="mb-12 flex flex-col items-center gap-4 text-center md:mb-16">
            {title && (
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-[var(--neutral-12)]">
                {title}
              </h2>
            )}
            {subtitle && <p className="text-lg text-[var(--neutral-11)] max-w-2xl">{subtitle}</p>}
          </div>
        </AnimateIn>
      )}

      <AnimateInGroup stagger="normal">
        <div
          className={cn(
            featuresVariants({ layout, columns: layout === "grid" ? columns : undefined, density }),
          )}
        >
          {features.map((feature, index) => {
            // Bento logic: make the first item span 2 columns if in bento mode
            const isBentoLarge = layout === "bento" && index === 0;

            return (
              <AnimateIn key={feature.id} preset="fadeUp">
                <div
                  className={cn(
                    "group relative flex flex-col justify-between overflow-hidden rounded-[var(--radius-3xl)] bg-[var(--neutral-2)] p-6 sm:p-8 border border-[var(--neutral-6)] transition-colors hover:border-[var(--neutral-7)] hover:bg-[var(--neutral-3)]",
                    layout === "alternating" ? "md:flex-row md:items-center md:gap-12" : "h-full",
                    layout === "alternating" && index % 2 === 1 ? "md:flex-row-reverse" : "",
                    isBentoLarge ? "md:col-span-2 md:row-span-2 bg-[var(--neutral-3)]" : "",
                  )}
                >
                  <div
                    className={cn(
                      "flex flex-col flex-1",
                      layout === "alternating" ? "md:w-1/2" : "",
                    )}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      {showIcons && feature.icon && (
                        <div className="flex items-center justify-center w-10 h-10 rounded-[var(--radius-xl)] bg-[var(--neutral-4)] text-[var(--neutral-12)] border border-[var(--neutral-6)]">
                          {/* Fallback to text if icon string, ideally mapped to icons component */}
                          <span className="text-sm font-semibold">
                            {feature.icon.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      {feature.badge && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--neutral-12)] text-[var(--neutral-1)] shadow-sm">
                          {feature.badge}
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl font-semibold text-[var(--neutral-12)] mb-2 group-hover:text-[var(--neutral-12)] transition-colors">
                      {feature.title}
                    </h3>

                    <p className="text-[var(--neutral-11)] leading-relaxed mb-6">
                      {feature.description}
                    </p>

                    {feature.href && (
                      <div className="mt-auto pt-4">
                        <a
                          href={feature.href}
                          className="inline-flex items-center text-sm font-medium text-[var(--neutral-12)] hover:text-[var(--neutral-11)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--neutral-7)] rounded-[var(--radius-md)]"
                        >
                          Learn more
                          <span className="ml-1 transition-transform group-hover:translate-x-1">
                            →
                          </span>
                        </a>
                      </div>
                    )}
                  </div>

                  {feature.image && (
                    <div
                      className={cn(
                        "relative rounded-[var(--radius-2xl)] overflow-hidden bg-[var(--neutral-4)] border border-[var(--neutral-6)]",
                        layout === "alternating"
                          ? "md:w-1/2 mt-8 md:mt-0 aspect-video"
                          : "mt-8 aspect-[4/3]",
                      )}
                    >
                      {/* Placeholder for actual optimized image */}
                      <div className="absolute inset-0 flex items-center justify-center text-[var(--neutral-8)] text-sm">
                        [Image: {feature.image}]
                      </div>
                    </div>
                  )}
                </div>
              </AnimateIn>
            );
          })}
        </div>
      </AnimateInGroup>
    </section>
  );
}

Features.displayName = "Features";
