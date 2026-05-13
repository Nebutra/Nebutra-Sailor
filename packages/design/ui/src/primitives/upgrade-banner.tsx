"use client";

import { ArrowRight, Sparkles, X } from "lucide-react";
import { type ReactNode, useState } from "react";
import { cn } from "../utils/cn";
import { BrandMark } from "./brand-mark";

type Variant = "inline" | "card";

export interface UpgradeBannerProps {
  /** Feature name shown in the title (e.g. "Custom workflows"). */
  feature?: string;
  /** Title override — defaults to "Unlock {feature}" or "Upgrade your plan". */
  title?: string;
  /** Description text. */
  description?: string;
  /** Call-to-action label. */
  ctaLabel?: string;
  /** Click handler or href for the CTA. Pass a string for a plain anchor. */
  onCta?: (() => void) | string;
  /** Whether the banner can be dismissed by the user. */
  dismissible?: boolean;
  /** Optional dismiss callback (analytics, persistence). */
  onDismiss?: () => void;
  /** Visual variant — `inline` is a slim banner row; `card` is a padded block. */
  variant?: Variant;
  /** Optional secondary slot (e.g. "Learn more" link). */
  secondaryAction?: ReactNode;
  /** Extra classes for the root element. */
  className?: string;
}

/**
 * UpgradeBanner — inline upsell primitive.
 *
 * Echoes the Perplexity "Pro 高级搜索的免费预览已启用" inline banner pattern:
 * shows value, never blocks workflow. Renders with our blue→cyan
 * `--brand-gradient` and the canonical `<BrandMark>` motif.
 *
 * Pair with `<FeatureGate fallback={<UpgradeBanner …/>}>` for declarative
 * plan-gated UI.
 */
export function UpgradeBanner({
  feature,
  title,
  description,
  ctaLabel = "Upgrade",
  onCta,
  dismissible = false,
  onDismiss,
  variant = "inline",
  secondaryAction,
  className,
}: UpgradeBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const resolvedTitle = title ?? (feature ? `Unlock ${feature}` : "Upgrade your plan");

  function handleDismiss() {
    setDismissed(true);
    onDismiss?.();
  }

  const ctaIsHref = typeof onCta === "string";
  const ctaCommon =
    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white transition-opacity hover:opacity-90";

  const ctaNode = onCta ? (
    ctaIsHref ? (
      <a href={onCta} className={ctaCommon} style={{ background: "var(--brand-gradient)" }}>
        <Sparkles className="h-3 w-3" aria-hidden="true" />
        {ctaLabel}
        <ArrowRight className="h-3 w-3" aria-hidden="true" />
      </a>
    ) : (
      <button
        type="button"
        onClick={onCta}
        className={ctaCommon}
        style={{ background: "var(--brand-gradient)" }}
      >
        <Sparkles className="h-3 w-3" aria-hidden="true" />
        {ctaLabel}
        <ArrowRight className="h-3 w-3" aria-hidden="true" />
      </button>
    )
  ) : null;

  return (
    <section
      aria-label={resolvedTitle}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-neutral-6 bg-gradient-to-r from-blue-2/40 to-cyan-2/30 dark:border-white/10 dark:from-blue-2/10 dark:to-cyan-2/5",
        variant === "inline" ? "px-4 py-3" : "px-5 py-4",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-20 blur-3xl"
        style={{ background: "var(--brand-gradient)" }}
      />

      <div className="relative flex flex-wrap items-center gap-3">
        <BrandMark size={variant === "card" ? "md" : "sm"} variant="gradient">
          <Sparkles className={variant === "card" ? "h-4 w-4" : "h-3.5 w-3.5"} aria-hidden="true" />
        </BrandMark>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-neutral-12 dark:text-white">
            {resolvedTitle}
          </p>
          {description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-neutral-11 dark:text-white/70">
              {description}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {secondaryAction}
          {ctaNode}
          {dismissible && (
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss"
              className="rounded-md p-1 text-neutral-10 transition-colors hover:bg-neutral-3 hover:text-neutral-12 dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
