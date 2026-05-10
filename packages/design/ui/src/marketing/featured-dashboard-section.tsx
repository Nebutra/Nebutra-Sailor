"use client";

import type { LucideIcon } from "lucide-react";
import type * as React from "react";
import { cn } from "../utils/cn";

export interface FeaturedDashboardSectionProps {
  /** Top-left slot content */
  topLeft?: React.ReactNode;
  /** Top-right slot content */
  topRight?: React.ReactNode;
  /** Bottom-left slot content */
  bottomLeft?: React.ReactNode;
  /** Bottom-right slot content */
  bottomRight?: React.ReactNode;
  /** Additional className */
  className?: string;
}

/**
 * FeaturedDashboardSection - 2x2 grid layout for featured content
 *
 * Flexible grid layout with 4 slots for composing dashboard-style
 * featured sections. Use with maps, charts, cards, etc.
 */
export function FeaturedDashboardSection({
  topLeft,
  topRight,
  bottomLeft,
  bottomRight,
  className,
}: FeaturedDashboardSectionProps) {
  return (
    <section className={cn("bg-background py-24", className)}>
      <div className="mx-auto grid max-w-7xl grid-cols-1 px-6 md:grid-cols-2 md:grid-rows-2">
        {/* Top Left */}
        <div className="overflow-hidden rounded-none border bg-muted p-4">{topLeft}</div>

        {/* Top Right */}
        <div className="flex flex-col justify-between gap-4 rounded-none border bg-card p-6">
          {topRight}
        </div>

        {/* Bottom Left */}
        <div className="space-y-4 rounded-none border bg-muted p-6">{bottomLeft}</div>

        {/* Bottom Right */}
        <div className="grid rounded-none bg-card sm:grid-cols-2">{bottomRight}</div>
      </div>
    </section>
  );
}

FeaturedDashboardSection.displayName = "FeaturedDashboardSection";

export interface DashboardPanelHeaderProps {
  /** Panel icon */
  icon: LucideIcon;
  /** Panel label */
  label: string;
  /** Panel title */
  title: string;
  /** Panel subtitle/description */
  subtitle?: string;
  /** Additional className */
  className?: string;
}

/**
 * DashboardPanelHeader - Header for dashboard panels
 */
export function DashboardPanelHeader({
  icon: Icon,
  label,
  title,
  subtitle,
  className,
}: DashboardPanelHeaderProps) {
  return (
    <div className={className}>
      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="size-4" />
        {label}
      </div>
      <h3 className="text-xl font-normal text-foreground">
        {title} {subtitle && <span className="text-muted-foreground">{subtitle}</span>}
      </h3>
    </div>
  );
}

DashboardPanelHeader.displayName = "DashboardPanelHeader";
