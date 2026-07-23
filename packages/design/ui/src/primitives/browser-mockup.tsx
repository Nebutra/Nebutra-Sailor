"use client";

import { ArrowLeft, ArrowRight, Check, Copy, RotateClockwise as RotateCw } from "@nebutra/icons";
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../utils/cn";
import { MiddleTruncate } from "./middle-truncate";

const COPIED_FEEDBACK_MS = 1500;

/* -------------------------------------------------------------------------- *\
 *  Browser — Geist-style browser chrome around a screenshot, demo, or video.
 *
 *  Use cases (per Geist guidance):
 *    - Marketing chrome on landing pages, docs, changelog posts.
 *    - Do NOT render real product UI here — the chrome implies a screenshot,
 *      not a live surface.
 *
 *  Behavior rules:
 *    - Chrome (dots + nav arrows) is decorative. Wrapped in `aria-hidden="true"`.
 *    - Address bar uses middle truncation so the host and path tail both
 *      remain visible on long URLs. The copy button is the one real,
 *      reachable interaction.
 *    - Image-mode viewport locks an aspect ratio (default 16:9) so the chrome
 *      doesn't reflow when the image is missing or slow to load. Children mode
 *      defers sizing to the consumer's own JSX.
 *
 *  Content slots — discriminated:
 *    Pass exactly one of:
 *      - `children`         → arbitrary JSX (consumer owns aspect lock)
 *      - `imageSrc + imageAlt` → framework-neutral <img> tag, alt required
 *    Both unrepresentable: the TS union forbids it. Use the children form
 *    when you need next/image or a video.
\* -------------------------------------------------------------------------- */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

type BaseProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  /** URL displayed in the address bar (host + path). */
  address?: string;
  /**
   * Inner viewport aspect ratio. Number is width/height (e.g. `16/9 = 1.777`).
   * String passes directly to CSS `aspect-ratio` (e.g. `"16 / 9"`, `"4 / 3"`).
   *
   * Defaults: `"16 / 9"` in image mode (prevents layout shift on slow load),
   * undefined in children mode (consumer JSX owns sizing).
   */
  aspectRatio?: number | string;
};

type ChildrenProps = BaseProps & {
  children: ReactNode;
  imageSrc?: never;
  imageAlt?: never;
};

type ImageProps = BaseProps & {
  children?: never;
  imageSrc: string;
  imageAlt: string;
};

export type BrowserProps = ChildrenProps | ImageProps;

/** @deprecated Use `BrowserProps` instead. */
export type BrowserMockupProps = BrowserProps;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * @example Children mode
 * ```tsx
 * <Browser address="vercel.com"><MyDemo /></Browser>
 * ```
 *
 * @example Image mode (alt required)
 * ```tsx
 * <Browser
 *   address="vercel.com/dashboard"
 *   imageSrc="/dashboard.png"
 *   imageAlt="Dashboard showing the current month's deployments and bandwidth usage"
 * />
 * ```
 */
export function Browser(props: BrowserProps) {
  const {
    address,
    aspectRatio,
    className,
    // children path
    children,
    // image path
    imageSrc,
    imageAlt,
    ...rest
  } = props as BaseProps & {
    children?: ReactNode;
    imageSrc?: string;
    imageAlt?: string;
  };

  // Children mode → defer aspect to the consumer (their JSX may already be
  // height-constrained). Image mode → default to 16:9 so the chrome doesn't
  // reflow when the image is missing or slow to load.
  const resolvedRatio = aspectRatio ?? (imageSrc ? "16 / 9" : undefined);

  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopy = useCallback(async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    } catch {
      // Clipboard API may be blocked (insecure context, iframe sandbox).
    }
  }, [address]);

  const viewportStyle: CSSProperties =
    resolvedRatio !== undefined
      ? {
          aspectRatio: typeof resolvedRatio === "number" ? `${resolvedRatio} / 1` : resolvedRatio,
        }
      : {};

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[var(--radius-xl)] border border-border bg-card shadow-sm",
        className,
      )}
      {...rest}
    >
      {/* ── Chrome toolbar — decorative ──────────────────────────────── */}
      <div className="flex items-center gap-3 border-border border-b bg-muted px-4 py-2.5">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="size-3 rounded-full bg-destructive" />
          <span className="size-3 rounded-full bg-warning" />
          <span className="size-3 rounded-full bg-success" />
        </div>

        <div className="flex items-center gap-1" aria-hidden="true">
          <span className="flex size-6 items-center justify-center rounded text-muted-foreground">
            <ArrowLeft className="size-3.5" />
          </span>
          <span className="flex size-6 items-center justify-center rounded text-muted-foreground">
            <ArrowRight className="size-3.5" />
          </span>
          <span className="flex size-6 items-center justify-center rounded text-muted-foreground">
            <RotateCw className="size-3.5" />
          </span>
        </div>

        {/* Address bar — middle-truncate keeps host visible AND path tail */}
        <div className="flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-background/80 px-3 py-1">
          {address ? (
            <>
              <MiddleTruncate
                value={address}
                className="min-w-0 flex-1 text-center text-muted-foreground text-xs"
              />
              <button
                type="button"
                onClick={handleCopy}
                aria-label={copied ? "Address copied" : "Copy address"}
                className="flex-shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
              </button>
            </>
          ) : (
            <span className="h-3" />
          )}
        </div>
      </div>

      {/* ── Inner viewport — aspect-locked ──────────────────────────── */}
      <div className="relative bg-background" style={viewportStyle}>
        {children ??
          (imageSrc ? (
            // biome-ignore lint/performance/noImgElement: framework-neutral primitive — consumers may not be on Next.js
            <img
              src={imageSrc}
              alt={imageAlt ?? ""}
              decoding="async"
              loading="lazy"
              className="absolute inset-0 block h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground text-sm">
              No content
            </div>
          ))}
      </div>
    </div>
  );
}

Browser.displayName = "Browser";

/** @deprecated Use `Browser` instead. */
export const BrowserMockup = Browser;
