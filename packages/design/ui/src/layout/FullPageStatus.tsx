"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "../primitives/button";

export interface FullPageStatusAction {
  label: string;
  /** Either href (renders <Link>) or onClick (renders <button>). */
  href?: string;
  onClick?: () => void;
}

export interface FullPageStatusMeta {
  /** e.g. "Error ID: abc123" — rendered monospace, muted. */
  errorId?: string;
  /** e.g. "status.nebutra.com" — rendered as link if `statusUrl` provided. */
  statusUrl?: string;
}

export interface FullPageStatusProps {
  /** Eyebrow label, e.g. "Error 404" / "Error 500". Rendered monospace, uppercase. */
  code: string;
  /** Headline. Keep it direct; use Accent only for subtle neutral emphasis. */
  title: ReactNode;
  /** Single-sentence subcopy. */
  description: string;
  /** Primary CTA (filled neutral ink). */
  primaryAction: FullPageStatusAction;
  /** Secondary CTA (outlined). Optional. */
  secondaryAction?: FullPageStatusAction;
  /** Optional footer metadata: error ID + status page link. */
  meta?: FullPageStatusMeta;
  /**
   * Layout variant.
   * - `"viewport"` (default): full-viewport takeover with bg — for not-found.tsx / global-error.
   * - `"section"`: in-segment, no bg, ~60vh min height — for segment `error.tsx` inside a layout.
   */
  variant?: "viewport" | "section";
}

/**
 * FullPageStatus — restrained full-page status template for 404, 500, and other
 * authenticated error/not-found states that live inside the root layout.
 *
 * Pattern: monospace eyebrow → headline → subcopy → primary + optional secondary CTA →
 * optional monospace error ID + status link footer. Linear/Vercel/Stripe convention.
 *
 * NOT for `global-error.tsx` — that renders outside root layout and cannot consume
 * CSS variables or Tailwind. Keep that file standalone with inline styles.
 *
 * @example
 * ```tsx
 * <FullPageStatus
 *   code="Error 404"
 *   title={<>We couldn't find that page.</>}
 *   description="The page you're looking for doesn't exist or has been moved."
 *   primaryAction={{ label: "Go to dashboard", href: "/" }}
 *   secondaryAction={{ label: "Open docs", href: "/docs" }}
 * />
 * ```
 */
export function FullPageStatus({
  code,
  title,
  description,
  primaryAction,
  secondaryAction,
  meta,
  variant = "viewport",
}: FullPageStatusProps) {
  const isSection = variant === "section";
  const Wrapper = isSection ? "section" : "main";
  const wrapperClass = isSection
    ? "flex min-h-[60vh] items-center justify-start px-6 py-12 text-neutral-12"
    : "flex min-h-[100dvh] items-center justify-center bg-neutral-1 px-6 text-neutral-12";

  return (
    <Wrapper role={isSection ? "alert" : "main"} className={wrapperClass}>
      <div className="w-full max-w-[480px]">
        <div className="mb-4 font-mono text-xs font-medium uppercase tracking-[0.08em] text-neutral-9">
          {code}
        </div>

        <h1 className="mb-3 text-[clamp(28px,5vw,36px)] font-semibold leading-[1.15] tracking-[-0.02em]">
          {title}
        </h1>

        <p className="mb-8 max-w-[52ch] text-base leading-[1.6] text-neutral-11">{description}</p>

        <div className="flex flex-wrap gap-3">
          <ActionButton action={primaryAction} variant="primary" />
          {secondaryAction && <ActionButton action={secondaryAction} variant="secondary" />}
        </div>

        {meta && (meta.errorId || meta.statusUrl) && (
          <div className="mt-10 flex flex-wrap justify-between gap-4 border-t border-neutral-6 pt-5 font-mono text-xs text-neutral-10">
            {meta.errorId && <span>Error ID: {meta.errorId}</span>}
            {meta.statusUrl && (
              <a
                href={`https://${meta.statusUrl}`}
                className="text-neutral-10 hover:text-neutral-12"
                rel="noreferrer"
              >
                {meta.statusUrl} →
              </a>
            )}
          </div>
        )}
      </div>
    </Wrapper>
  );
}

function ActionButton({
  action,
  variant,
}: {
  action: FullPageStatusAction;
  variant: "primary" | "secondary";
}) {
  const buttonVariant = variant === "primary" ? "ink" : "outline";

  if (action.href) {
    return (
      <Button asChild variant={buttonVariant}>
        <Link href={action.href}>{action.label}</Link>
      </Button>
    );
  }
  return (
    <Button type="button" onClick={action.onClick} variant={buttonVariant}>
      {action.label}
    </Button>
  );
}

/** Subtle neutral emphasis for use inside a `title` prop. */
FullPageStatus.Accent = function Accent({ children }: { children: ReactNode }) {
  return <span className="text-neutral-12">{children}</span>;
};
