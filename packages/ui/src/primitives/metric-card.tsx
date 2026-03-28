"use client";

/**
 * MetricCard Component
 *
 * Modern SaaS-style metric display
 * Inspired by Linear, Vercel, and Supabase dashboards
 */

import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import type * as React from "react";
import { cn } from "../utils/cn";

// ============================================================
// Types
// ============================================================

export interface MetricCardProps {
  /** Label for the metric */
  label: string;
  /** The metric value */
  value: number | string | never;
  /** Optional trend direction */
  trend?: "up" | "down" | "neutral";
  /** Optional trend value (e.g., "+12%") */
  trendValue?: string;
  /** Optional description text */
  description?: string;
  /** Size variant */
  size?: "sm" | "default" | "lg";
  /** Optional icon */
  icon?: React.ReactNode;
  /** Optional className */
  className?: string;
}

// ============================================================
// Component
// ============================================================

export function MetricCard({
  label,
  value,
  trend,
  trendValue,
  description,
  size = "default",
  icon,
  className,
}: MetricCardProps) {
  const sizeClasses = {
    sm: {
      label: "text-xs",
      value: "text-lg",
      trend: "text-xs",
    },
    default: {
      label: "text-xs",
      value: "text-2xl",
      trend: "text-xs",
    },
    lg: {
      label: "text-sm",
      value: "text-3xl",
      trend: "text-sm",
    },
  };

  const trendColors = {
    up: "text-emerald-600 dark:text-emerald-400",
    down: "text-red-600 dark:text-red-400",
    neutral: "text-muted-foreground",
  };

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  return (
    <div className={cn("space-y-1", className)}>
      {/* Label */}
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-muted-foreground [&>svg]:size-3.5">{icon}</span>}
        <p className={cn("text-muted-foreground font-medium", sizeClasses[size].label)}>{label}</p>
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-2">
        <p className={cn("font-semibold tabular-nums tracking-tight", sizeClasses[size].value)}>
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>

        {/* Trend */}
        {trend && (
          <div
            className={cn("flex items-center gap-0.5", trendColors[trend], sizeClasses[size].trend)}
          >
            <TrendIcon className="size-3" />
            {trendValue && <span>{trendValue}</span>}
          </div>
        )}
      </div>

      {/* Description */}
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}

// ============================================================
// MetricGrid - For displaying multiple metrics
// ============================================================

export interface MetricGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function MetricGrid({ children, columns = 3, className }: MetricGridProps) {
  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
  };

  return <div className={cn("grid gap-4", gridCols[columns], className)}>{children}</div>;
}

// ============================================================
// MetricCardBordered - With border for emphasis
// ============================================================

export function MetricCardBordered({ className, ...props }: MetricCardProps) {
  return (
    <div className={cn("rounded-lg border bg-card p-4", className)}>
      <MetricCard {...props} />
    </div>
  );
}

// ============================================================
// StatItem - Compact inline stat
// ============================================================

export interface StatItemProps {
  label: string;
  value: number | string | never;
  color?: "success" | "warning" | "error" | "info" | "neutral";
  className?: string;
}

export function StatItem({ label, value, color = "neutral", className }: StatItemProps) {
  const colorClasses = {
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    error: "bg-red-500",
    info: "bg-blue-500",
    neutral: "bg-muted-foreground",
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className={cn("size-2 rounded-full shrink-0", colorClasses[color])} />
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium tabular-nums">
        {typeof value === "number" ? value.toLocaleString() : value}
      </span>
    </div>
  );
}
