"use client";

import type React from "react";
import { cn } from "../utils";

export interface PageHeaderProps {
  /** Page title */
  title: string;
  /** Optional subtitle or description */
  description?: string;
  /** Optional action slot (e.g. a Button) */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * PageHeader — standardised top-of-page title + description + actions row.
 *
 * @status stable
 * @planned apps/web dashboard — every dashboard page top area (Settings, Billing, Team, Logs, etc.).
 *
 * @example
 * ```tsx
 * <PageHeader
 *   title="Team Settings"
 *   description="Manage your team members and permissions."
 *   actions={<button>Invite member</button>}
 * />
 * ```
 */
export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 pb-6 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="flex-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="mt-2 flex shrink-0 gap-2 sm:mt-0">{actions}</div>}
    </div>
  );
}
