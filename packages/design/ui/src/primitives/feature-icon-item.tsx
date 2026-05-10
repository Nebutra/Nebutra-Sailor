"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "../utils/cn";

export interface FeatureIconItemProps {
  /** Feature icon */
  icon: LucideIcon;
  /** Feature title */
  title: string;
  /** Feature description */
  description?: string;
  /** Icon className */
  iconClassName?: string;
  /** Additional className */
  className?: string;
}

/**
 * FeatureIconItem - Atomic feature item with icon
 *
 * Displays a feature with an icon, title, and optional description.
 * Used in feature grids and lists.
 */
export function FeatureIconItem({
  icon: Icon,
  title,
  description,
  iconClassName,
  className,
}: FeatureIconItemProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <Icon className={cn("size-4", iconClassName)} />
        <h3 className="text-sm font-medium">{title}</h3>
      </div>
      {description && <p className="text-muted-foreground text-sm">{description}</p>}
    </div>
  );
}

FeatureIconItem.displayName = "FeatureIconItem";
