"use client";

import { cva, type VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";
import type * as React from "react";
import { cn } from "../utils/cn";

// =============================================================================
// Variants
// =============================================================================

const statusBadgeVariants = cva(
  "inline-flex items-center gap-x-2.5 rounded-full bg-background px-2.5 py-1.5 text-xs border",
  {
    variants: {
      status: {
        success: "",
        error: "",
        warning: "",
        info: "",
        default: "",
      },
    },
    defaultVariants: {
      status: "default",
    },
  },
);

// =============================================================================
// Types
// =============================================================================

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  /** Icon displayed before left label */
  leftIcon?: LucideIcon;
  /** Icon displayed before right label */
  rightIcon?: LucideIcon;
  /** Primary label text */
  leftLabel: string;
  /** Secondary label text */
  rightLabel: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * StatusBadge - Two-part status indicator badge
 *
 * @description
 * A badge component that displays two labels separated by a divider,
 * with optional icons and status-based coloring.
 *
 * @example Basic usage
 * ```tsx
 * import { ShieldCheck, XCircle } from "lucide-react";
 *
 * <StatusBadge
 *   leftIcon={ShieldCheck}
 *   rightIcon={XCircle}
 *   leftLabel="Protection"
 *   rightLabel="SSO disabled"
 *   status="success"
 * />
 * ```
 *
 * @example Multiple badges
 * ```tsx
 * <div className="flex gap-2">
 *   <StatusBadge
 *     leftIcon={CheckCircle2}
 *     leftLabel="Live"
 *     rightLabel="v2.1.0"
 *     status="success"
 *   />
 *   <StatusBadge
 *     leftIcon={AlertCircle}
 *     leftLabel="Degraded"
 *     rightLabel="3 incidents"
 *     status="warning"
 *   />
 * </div>
 * ```
 */
export function StatusBadge({
  className,
  status,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  leftLabel,
  rightLabel,
  ...props
}: StatusBadgeProps) {
  const iconColorClasses = {
    success: "text-emerald-600 dark:text-emerald-500",
    error: "text-red-600 dark:text-red-500",
    warning: "text-amber-600 dark:text-amber-500",
    info: "text-blue-600 dark:text-blue-500",
    default: "text-muted-foreground",
  };

  return (
    <span className={cn(statusBadgeVariants({ status }), className)} {...props}>
      <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
        {LeftIcon && (
          <LeftIcon
            className={cn("-ml-0.5 size-4 shrink-0", iconColorClasses[status || "default"])}
            aria-hidden="true"
          />
        )}
        {leftLabel}
      </span>
      <span className="h-4 w-px bg-border" aria-hidden="true" />
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        {RightIcon && <RightIcon className="-ml-0.5 size-4 shrink-0" aria-hidden="true" />}
        {rightLabel}
      </span>
    </span>
  );
}

export { statusBadgeVariants };
