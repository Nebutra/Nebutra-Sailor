"use client";

import type React from "react";
import { cn } from "../utils";

export interface PageHeaderProps {
  /** Primary page heading rendered as an h1 at either visual size. */
  title: string;
  /** Optional subtitle or description (text, or rich text with inline links). */
  description?: React.ReactNode;
  /** Action controls shown beside the title on wider screens and below it on phones. */
  actions?: React.ReactNode;
  /**
   * Trail above the title (a breadcrumb `<nav>`, or a back link). Rendered as
   * given — the caller owns the links and their labels.
   */
  breadcrumbs?: React.ReactNode;
  /** A row under the description for status chips, owners, timestamps. */
  meta?: React.ReactNode;
  /**
   * `page` (default) is the 30px title that opens a destination; `section`
   * is the 24px title of a sub-page inside one (a settings section), so the
   * parent's name is not repeated at full size on every child.
   */
  size?: "page" | "section";
  /** Draw a hairline under the header (pages whose body starts with a table or tabs). */
  divider?: boolean;
  /** Classes applied to the outer header layout wrapper. */
  className?: string;
}

/**
 * PageHeader — standardised top-of-page title + description + actions row.
 *
 * Breadcrumb trail above, title in display weight with tight tracking, lead
 * in the secondary ink, actions bottom-aligned on the right (ElevenLabs,
 * Vercel). On a phone the actions drop under the lead.
 *
 * @status stable
 * @planned apps/web dashboard — every dashboard page top area (Settings, Billing, Team, Logs, etc.).
 *
 * @example
 * ```tsx
 * <PageHeader
 *   breadcrumbs={<Breadcrumbs />}
 *   title="Team Settings"
 *   description="Manage your team members and permissions."
 *   actions={<button>Invite member</button>}
 * />
 * ```
 */
export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  meta,
  size = "page",
  divider = false,
  className,
}: PageHeaderProps) {
  return (
    <div
      data-slot="page-header"
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        divider ? "mb-8 border-b border-border pb-6" : size === "section" ? "pb-6" : "pb-8",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {breadcrumbs ? <div className="mb-3 min-w-0">{breadcrumbs}</div> : null}
        <h1
          className={cn(
            "text-balance tracking-tight text-foreground",
            size === "section" ? "text-2xl" : "text-3xl",
          )}
        >
          {title}
        </h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-neutral-11">{description}</p>}
        {meta ? (
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-neutral-11">
            {meta}
          </div>
        ) : null}
      </div>
      {actions && <div className="mt-2 flex shrink-0 gap-2 sm:mt-0">{actions}</div>}
    </div>
  );
}
