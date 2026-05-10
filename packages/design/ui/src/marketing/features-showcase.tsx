"use client";

import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import { FeatureIconItem } from "../primitives/feature-icon-item";
import { cn } from "../utils/cn";

export interface ShowcaseFeature {
  /** Feature icon */
  icon: LucideIcon;
  /** Feature title */
  title: string;
  /** Feature description */
  description: string;
}

export interface FeaturesShowcaseProps {
  /** Section title */
  title: string;
  /** Section description */
  description?: string;
  /** Image sources for the showcase */
  images?: {
    /** Foreground/overlay image */
    foreground?: string;
    /** Background image for dark mode */
    backgroundDark?: string;
    /** Background image for light mode */
    backgroundLight?: string;
  };
  /** Alt text for images */
  imageAlt?: string;
  /** List of features */
  features: ShowcaseFeature[];
  /** Additional className */
  className?: string;
}

/**
 * FeaturesShowcase - Features section with image showcase
 *
 * Two-row layout with header, large image showcase area,
 * and a grid of feature items below.
 */
export function FeaturesShowcase({
  title,
  description,
  images,
  imageAlt = "Feature showcase",
  features,
  className,
}: FeaturesShowcaseProps) {
  return (
    <section className={cn("py-16 md:py-32", className)}>
      <div className="mx-auto max-w-5xl space-y-12 px-6">
        {/* Header */}
        <div className="relative z-10 grid items-center gap-4 md:grid-cols-2 md:gap-12">
          <h2 className="text-4xl font-semibold">{title}</h2>
          {description && (
            <p className="max-w-sm text-muted-foreground sm:ml-auto">{description}</p>
          )}
        </div>

        {/* Image Showcase */}
        {images && (
          <div className="relative rounded-[var(--radius-3xl)] p-3 md:-mx-8 lg:col-span-3">
            <div className="aspect-[88/36] relative">
              <div className="absolute inset-0 z-[1] bg-gradient-to-t from-background to-transparent" />
              {images.foreground && (
                <Image
                  src={images.foreground}
                  className="absolute inset-0 z-10"
                  alt={imageAlt}
                  fill
                />
              )}
              {images.backgroundDark && (
                <Image
                  src={images.backgroundDark}
                  className="hidden dark:block"
                  alt={`${imageAlt} (dark)`}
                  width={400}
                  height={400}
                />
              )}
              {images.backgroundLight && (
                <Image
                  src={images.backgroundLight}
                  className="dark:hidden"
                  alt={`${imageAlt} (light)`}
                  width={400}
                  height={400}
                />
              )}
            </div>
          </div>
        )}

        {/* Features Grid */}
        {features.length > 0 && (
          <div className="relative mx-auto grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-8 lg:grid-cols-4">
            {features.map((feature, index) => (
              <FeatureIconItem
                key={index}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

FeaturesShowcase.displayName = "FeaturesShowcase";
