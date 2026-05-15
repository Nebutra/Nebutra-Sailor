"use client";

import { forwardRef, type ReactNode } from "react";
import { cn } from "../utils/cn";

/* -------------------------------------------------------------------------- *\
 *  ProjectBanner — full-width, non-dismissible banner for project-wide states
 *  that require resolution (billing overdue, rollback in progress, attack
 *  mitigation, expiring trial).
 *
 *  Pick the right surface:
 *    - ProjectBanner  → project-wide state needing a resolver action
 *    - Alert / Note   → inline contextual message tied to one field or card
 *    - Toast          → transient acknowledgement
 *    - Modal          → blocking confirmation
 *
 *  Behavior rules (these are intentional — do not "add a close button"):
 *    - Non-dismissible. If it can be dismissed without resolving the state,
 *      it isn't banner-worthy. Move to a Note.
 *    - One banner at a time. Stacking drowns the most urgent state.
 *    - `callToAction` is required for an actionable variant — a banner
 *      without a route is a dead end.
 *
 *  Categorical color tokens:
 *    Variant maps directly to a categorical palette (blue / amber / red /
 *    neutral). These are NOT brand tokens; they signal severity, not chrome.
 *    The Folder / FileCard precedent applies: raw Tailwind palette is correct.
 *
 *  Layout note:
 *    `-translate-y-px` overlaps the top border with adjacent chrome above
 *    the banner (toolbar, navbar). Without it a hairline gap appears on
 *    pixel-grid screens.
\* -------------------------------------------------------------------------- */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ProjectBannerVariant = "success" | "warning" | "error" | "info";

/** Discriminated CTA — either a link or a button, never both. */
export type ProjectBannerCallToAction =
  | { label: string; href: string; onClick?: never }
  | { label: string; onClick: () => void; href?: never };

export type ProjectBannerProps = {
  /** @default "info" */
  variant?: ProjectBannerVariant;
  /** One-sentence impact statement, sentence case. */
  label: ReactNode;
  /** Optional leading glyph. Caller controls sizing; the banner just slots it. */
  icon?: ReactNode;
  /** Required-by-convention resolver action. */
  callToAction?: ProjectBannerCallToAction;
  /**
   * ARIA live-region role. Defaults to `"alert"` for `error`, `"status"` for
   * all others. Pass explicitly if you need to override (e.g. a polite error).
   */
  role?: "alert" | "status";
  className?: string;
};

// ---------------------------------------------------------------------------
// Variant palette
// ---------------------------------------------------------------------------

type VariantTokens = {
  container: string;
  cta: string;
};

const variantMap: Readonly<Record<ProjectBannerVariant, VariantTokens>> = {
  success: {
    container: "border-blue-400 bg-blue-100 text-blue-900 fill-blue-900",
    cta: "text-blue-900 decoration-blue-400 hover:text-blue-950 hover:decoration-blue-500",
  },
  warning: {
    container: "border-amber-400 bg-amber-100 text-amber-900 fill-amber-900",
    cta: "text-amber-900 decoration-amber-400 hover:text-amber-950 hover:decoration-amber-500",
  },
  error: {
    container: "border-red-400 bg-red-100 text-red-900 fill-red-900",
    cta: "text-red-900 decoration-red-400 hover:text-red-950 hover:decoration-red-500",
  },
  info: {
    container: "border-neutral-400 bg-neutral-100 text-neutral-900 fill-neutral-900",
    cta: "text-neutral-900 decoration-neutral-400 hover:text-neutral-950 hover:decoration-neutral-500",
  },
};

const ctaBase = "font-medium underline underline-offset-[5px] transition-colors duration-100";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ProjectBanner = forwardRef<HTMLElement, ProjectBannerProps>(function ProjectBanner(
  { variant = "info", label, icon, callToAction, role, className },
  ref,
) {
  const tokens = variantMap[variant];
  const resolvedRole = role ?? (variant === "error" ? "alert" : "status");

  return (
    <aside
      ref={ref}
      role={resolvedRole}
      // -translate-y-px overlaps the top border with adjacent chrome above.
      className={cn(
        "z-30 flex min-h-10 -translate-y-px items-center justify-center gap-x-2 border-y py-2 font-sans text-sm",
        tokens.container,
        className,
      )}
    >
      <div className="flex w-full flex-col gap-2 px-6 md:flex-row md:items-center md:justify-center">
        <div className="flex items-center gap-2">
          {icon && (
            <span className="flex h-4 w-4 shrink-0 items-center justify-center">{icon}</span>
          )}
          <span>{label}</span>
        </div>
        {callToAction && (
          <div className="ml-6 md:ml-0">
            {callToAction.href !== undefined ? (
              <a className={cn(ctaBase, tokens.cta)} href={callToAction.href}>
                {callToAction.label}
              </a>
            ) : (
              <button
                type="button"
                className={cn(ctaBase, tokens.cta, "cursor-pointer")}
                onClick={callToAction.onClick}
              >
                {callToAction.label}
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
});
