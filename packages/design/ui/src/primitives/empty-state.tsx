"use client";

import type * as React from "react";
import { cn } from "../utils/cn";

// =============================================================================
// Types
// =============================================================================

export interface EmptyStateRootProps {
  /** Short heading that names the empty state */
  title: string;
  /** Supporting text explaining the state or what to do next */
  description: string;
  /** Icon element — use <EmptyState.Icon icon={<YourIcon />} /> */
  icon?: React.ReactNode;
  /** Primary call-to-action (button or link) */
  action?: React.ReactNode;
  /** Secondary call-to-action (e.g. "Learn more" link) */
  link?: React.ReactNode;
  /** Additional CSS classes for the wrapper */
  className?: string;
}

export interface EmptyStateIconProps {
  /** The icon element to render (e.g. a Lucide / custom SVG icon) */
  icon: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// EmptyStateRoot
// =============================================================================

function EmptyStateRoot({
  title,
  description,
  icon,
  action,
  link,
  className,
}: EmptyStateRootProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-12 text-center",
        className,
      )}
    >
      {icon && <div className="mb-1">{icon}</div>}

      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="max-w-xs text-sm text-muted-foreground">{description}</p>
      </div>

      {(action || link) && (
        <div className="mt-1 flex flex-col items-center gap-2">
          {action}
          {link}
        </div>
      )}
    </div>
  );
}
EmptyStateRoot.displayName = "EmptyState";

// =============================================================================
// EmptyStateIcon
// =============================================================================

function EmptyStateIcon({ icon, className }: EmptyStateIconProps) {
  return (
    <div
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full",
        "bg-muted text-muted-foreground",
        className,
      )}
    >
      {icon}
    </div>
  );
}
EmptyStateIcon.displayName = "EmptyState.Icon";

// =============================================================================
// Compound export
// =============================================================================

export const EmptyState = {
  Root: EmptyStateRoot,
  Icon: EmptyStateIcon,
} as const;
