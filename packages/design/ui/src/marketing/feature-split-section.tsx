"use client";

import type { LucideIcon } from "lucide-react";
import type * as React from "react";
import { Badge } from "../primitives/badge";
import { FeatureCheckItem } from "../primitives/feature-check-item";
import { cn } from "../utils/cn";

export interface FeatureSplitItem {
  /** Feature title */
  title: string;
  /** Feature description */
  description?: string;
}

export interface FeatureSplitSectionProps {
  /** Badge label (optional) */
  badge?: string;
  /** Section title */
  title: string;
  /** Section description */
  description?: string;
  /** List of features */
  features: FeatureSplitItem[];
  /** Custom icon for feature items */
  featureIcon?: LucideIcon;
  /** Media content (image, video, or custom component) */
  media?: React.ReactNode;
  /** Media position */
  mediaPosition?: "left" | "right";
  /** Additional className */
  className?: string;
  /** Container className */
  containerClassName?: string;
}

/**
 * FeatureSplitSection - Split layout feature section
 *
 * Two-column layout with features on one side and media on the other.
 * Commonly used for product showcases and feature highlights.
 */
export function FeatureSplitSection({
  badge,
  title,
  description,
  features,
  featureIcon,
  media,
  mediaPosition = "right",
  className,
  containerClassName,
}: FeatureSplitSectionProps) {
  const contentSection = (
    <div className="flex gap-10 flex-col">
      <div className="flex gap-4 flex-col">
        {badge && (
          <div>
            <Badge variant="outline">{badge}</Badge>
          </div>
        )}
        <div className="flex gap-2 flex-col">
          <h2 className="text-3xl lg:text-5xl tracking-tighter max-w-xl text-left font-regular">
            {title}
          </h2>
          {description && (
            <p className="text-lg leading-relaxed tracking-tight text-muted-foreground max-w-xl text-left">
              {description}
            </p>
          )}
        </div>
      </div>
      {features.length > 0 && (
        <div className="grid lg:pl-6 grid-cols-1 sm:grid-cols-3 items-start lg:grid-cols-1 gap-6">
          {features.map((feature, index) => (
            <FeatureCheckItem
              key={index}
              title={feature.title}
              description={feature.description}
              icon={featureIcon}
            />
          ))}
        </div>
      )}
    </div>
  );

  const mediaSection = (
    <div className="bg-muted rounded-[var(--radius-md)] aspect-square">{media}</div>
  );

  return (
    <div className={cn("w-full py-20 lg:py-40", className)}>
      <div className={cn("container mx-auto", containerClassName)}>
        <div className="grid border rounded-[var(--radius-lg)] container p-8 grid-cols-1 gap-8 items-center lg:grid-cols-2">
          {mediaPosition === "left" ? (
            <>
              {mediaSection}
              {contentSection}
            </>
          ) : (
            <>
              {contentSection}
              {mediaSection}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

FeatureSplitSection.displayName = "FeatureSplitSection";
