"use client";

import type React from "react";

export interface EmptyStateProps {
  /** Icon or illustration to display */
  icon?: React.ReactNode;
  /** Primary message */
  title: string;
  /** Supporting description */
  description?: string;
  /** Call-to-action slot */
  action?: React.ReactNode;
}

/**
 * EmptyState — placeholder shown when a list or view has no content.
 *
 * @status stable
 * @planned apps/web dashboard — projects list (0 items), logs view, team invites pending.
 *
 * @example
 * ```tsx
 * <EmptyState
 *   title="No projects yet"
 *   description="Create your first project to get started."
 *   action={<button>New project</button>}
 * />
 * ```
 */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
      {icon && <div className="mb-3 text-[color:var(--neutral-10)] dark:text-white/60">{icon}</div>}
      <h3 className="text-lg font-semibold text-[color:var(--neutral-12)] dark:text-white">
        {title}
      </h3>
      {description && (
        <p className="mt-1 max-w-xs text-sm text-[color:var(--neutral-11)] dark:text-white/70">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
