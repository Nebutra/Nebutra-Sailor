import { AUTH_FORM_COLUMN_CLASS, cn } from "@nebutra/ui/utils";
import type { ReactNode } from "react";

export interface AuthSplitShellProps {
  /** The left editorial panel; each app supplies its own content. */
  banner: ReactNode;
  /** Marketing home — never this host (it would bounce back to sign-in). */
  homeHref: string;
  homeLabel: string;
  /** The back-arrow glyph, from the app's icon set (`@nebutra/icons` ArrowLeft). */
  homeIcon: ReactNode;
  localeSwitcher: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * The split sign-in shell for both sign-in surfaces. Server-safe (no hooks):
 * the app resolves copy and hrefs and passes them in.
 *
 * The top bar is one flex row, so "Home" and the locale control share a
 * baseline (they were two absolutely-positioned boxes, 12px apart). Focus
 * comes from the global `:focus-visible` rule; no component ring.
 * Responsive: Stack — the banner column appears from `lg`.
 */
export function AuthSplitShell({
  banner,
  homeHref,
  homeLabel,
  homeIcon,
  localeSwitcher,
  children,
  className,
}: AuthSplitShellProps) {
  return (
    <div
      className={cn(
        "grid min-h-dvh bg-background lg:grid-cols-[minmax(360px,36vw)_1fr]",
        className,
      )}
    >
      {banner}
      <main
        id="main-content"
        className="relative flex min-h-dvh flex-col items-center justify-center px-5 py-24 sm:px-8 lg:px-16"
      >
        <div className="absolute inset-x-0 top-0 z-20 flex h-16 items-center justify-between px-5 sm:px-8 lg:h-20 lg:px-12">
          <a
            href={homeHref}
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {homeIcon}
            {homeLabel}
          </a>
          {localeSwitcher}
        </div>
        <div className={AUTH_FORM_COLUMN_CLASS}>{children}</div>
      </main>
    </div>
  );
}
