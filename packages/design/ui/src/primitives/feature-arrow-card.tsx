"use client";

import { ArrowRight, type LucideIcon } from "lucide-react";
import type * as React from "react";
import { cn } from "../utils/cn";
import { Card } from "./card";

export interface FeatureArrowCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Feature icon */
  icon: LucideIcon;
  /** Feature title */
  title: string;
  /** Feature subtitle */
  subtitle: string;
  /** Feature description */
  description: string;
  /** Card content (displayed in bottom-right corner) */
  cardContent?: React.ReactNode;
  /** Click handler for the arrow button */
  onArrowClick?: () => void;
}

/**
 * FeatureArrowCard - Feature card with arrow action button
 *
 * Displays a feature with icon, title, subtitle, description,
 * and an interactive arrow button in the bottom-right corner.
 */
export function FeatureArrowCard({
  icon: Icon,
  title,
  subtitle,
  description,
  cardContent,
  onArrowClick,
  className,
  ...props
}: FeatureArrowCardProps) {
  return (
    <div
      className={cn("relative flex flex-col gap-3 border bg-background p-4 transition", className)}
      {...props}
    >
      <div className="flex items-center gap-4">
        <div>
          <span className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Icon className="size-4" />
            {title}
          </span>
          <h3 className="text-lg font-normal text-foreground">
            {subtitle} <span className="text-muted-foreground">{description}</span>
          </h3>
        </div>
      </div>

      {/* Card pinned to bottom right */}
      <Card className="absolute bottom-0 right-0 h-20 w-24 overflow-hidden rounded-bl-none rounded-br-none rounded-tl-xl rounded-tr-none border-8 border-b-0 border-r-0 sm:h-28 sm:w-32 md:h-32 md:w-40">
        {cardContent}
      </Card>

      {/* Arrow button */}
      <button
        type="button"
        onClick={onArrowClick}
        className="absolute bottom-2 right-2 z-10 flex items-center gap-2 rounded-full border bg-background p-3 transition hover:-rotate-45"
        aria-label="Go to feature"
      >
        <ArrowRight className="size-4 text-primary" />
      </button>
    </div>
  );
}

FeatureArrowCard.displayName = "FeatureArrowCard";
