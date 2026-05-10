"use client";

import { Check, type LucideIcon } from "lucide-react";
import { cn } from "../utils/cn";

export interface FeatureCheckItemProps {
  /** Feature title */
  title: string;
  /** Feature description */
  description?: string;
  /** Custom icon component (defaults to Check) */
  icon?: LucideIcon;
  /** Icon className */
  iconClassName?: string;
  /** Additional className for container */
  className?: string;
}

/**
 * FeatureCheckItem - Atomic feature item with icon
 *
 * Displays a single feature with an icon, title, and optional description.
 * Commonly used in feature lists and comparison tables.
 */
export function FeatureCheckItem({
  title,
  description,
  icon: Icon = Check,
  iconClassName,
  className,
}: FeatureCheckItemProps) {
  return (
    <div className={cn("flex flex-row gap-6 items-start", className)}>
      <Icon className={cn("w-4 h-4 mt-2 text-primary shrink-0", iconClassName)} />
      <div className="flex flex-col gap-1">
        <p className="font-medium">{title}</p>
        {description && <p className="text-muted-foreground text-sm">{description}</p>}
      </div>
    </div>
  );
}

FeatureCheckItem.displayName = "FeatureCheckItem";
