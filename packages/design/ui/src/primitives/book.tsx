"use client";

import type { CSSProperties, ReactNode } from "react";
import { useResponsive } from "../hooks/use-responsive";
import { cn } from "../utils/cn";

/* -------------------------------------------------------------------------- *\
 *  Book — 3D book-cover primitive for marketing chrome.
 *
 *  Use cases (per Geist guidance):
 *    Marketing pages, docs landing covers, changelog hero shots where the
 *    metaphor of a labeled volume helps. For in-product cards / dashboard
 *    tiles use Card; Book is too decorative for repeated UI rows.
 *
 *  Variants:
 *    - `simple` — title alone carries the design
 *    - `stripe` — color/icon stripe adds hierarchy or category cues
 *
 *  Color tokens:
 *    Geist Best Practices says pass `color` from design tokens
 *    (`var(--blue-9)`, `var(--cyan-9)`) so the cover follows light/dark
 *    theme tokens. Hex literals are accepted (Folder / FileCard precedent —
 *    categorical "red book" / "amber book" colors are NOT brand chrome).
 *
 *  Texture:
 *    `textured` overlays a paper-grain AVIF. The image is currently hosted
 *    on assets.vercel.com — for registry distribution, customers must either
 *    self-host or accept the third-party fetch. Reserve for hero shots; on
 *    a row of multiple Books the texture competes with the labels.
 *
 *  A11y:
 *    The cover is decorative chrome. Render the canonical title via the
 *    surrounding heading element on the page so screen readers don't
 *    double-announce. When the Book wraps a link, put the focus ring on
 *    the link itself, not the cover, so keyboard users see the real target.
\* -------------------------------------------------------------------------- */

// ---------------------------------------------------------------------------
// Constants — extracted so the JSX stays readable and these can be swept for
// later registry distribution (inline values are explicit dependencies on the
// CSS variable contract).
// ---------------------------------------------------------------------------

const DEFAULT_AMBER = "#FED954"; // canonical Geist amber for the default stripe
const SPINE_BIND_GRADIENT = "linear-gradient(90deg, rgba(0,0,0,0.18), transparent 100%)";
const COVER_GRADIENT = "linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--muted)) 100%)";
const BOOK_SHADOW =
  "0 1px 2px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.12), 0 24px 48px -16px rgba(0,0,0,0.18)";
const BOOK_BORDER_SHADOW = "inset 0 0 0 1px hsl(var(--border) / 0.4)";
const SPINE_BACK_GRADIENT =
  "linear-gradient(90deg, #eaeaea, transparent 70%), linear-gradient(#fff, #fafafa)";
const TEXTURE_URL =
  "https://assets.vercel.com/image/upload/v1720554484/front/design/book-texture.avif";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ResponsiveProp<T> {
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
}

export interface BookProps {
  title: string;
  /** @default "stripe" */
  variant?: "simple" | "stripe";
  /** @default 196 */
  width?: number | ResponsiveProp<number>;
  /** Cover color. Hex literal (categorical) or CSS `var(--…)` (token). */
  color?: string;
  /** Title + illustration color. @default project foreground */
  textColor?: string;
  illustration?: ReactNode;
  /** Hero-shot paper grain. Pulls a 3rd-party AVIF — registry-distribution caveat in docblock. */
  textured?: boolean;
}

// ---------------------------------------------------------------------------
// Default illustration (decorative — aria-hidden)
// ---------------------------------------------------------------------------

const DefaultIllustration = (
  <svg
    aria-hidden="true"
    fill="none"
    height="56"
    viewBox="0 0 36 56"
    width="36"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>Decorative cover glyph</title>
    <path
      clipRule="evenodd"
      d="M3.03113 28.0005C6.26017 23.1765 11.7592 20.0005 18 20.0005C24.2409 20.0005 29.7399 23.1765 32.9689 28.0005C29.7399 32.8244 24.2409 36.0005 18 36.0005C11.7592 36.0005 6.26017 32.8244 3.03113 28.0005Z"
      fill="#0070F3"
      fillRule="evenodd"
    />
    <path
      clipRule="evenodd"
      d="M32.9691 28.0012C34.8835 25.1411 36 21.7017 36 18.0015C36 8.06034 27.9411 0.00146484 18 0.00146484C8.05887 0.00146484 0 8.06034 0 18.0015C0 21.7017 1.11648 25.1411 3.03094 28.0012C6.25996 23.1771 11.7591 20.001 18 20.001C24.2409 20.001 29.74 23.1771 32.9691 28.0012Z"
      fill="#45DEC4"
      fillRule="evenodd"
    />
    <path
      clipRule="evenodd"
      d="M32.9692 28.0005C29.7402 32.8247 24.241 36.001 18 36.001C11.759 36.001 6.25977 32.8247 3.03077 28.0005C1.11642 30.8606 0 34.2999 0 38C0 47.9411 8.05887 56 18 56C27.9411 56 36 47.9411 36 38C36 34.2999 34.8836 30.8606 32.9692 28.0005Z"
      fill="#E5484D"
      fillRule="evenodd"
    />
  </svg>
);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Book({
  title,
  variant = "stripe",
  width = 196,
  color,
  textColor = "hsl(var(--foreground))",
  illustration,
  textured = false,
}: BookProps) {
  const resolvedWidth = useResponsive(width);
  const coverColor = color ?? (variant === "simple" ? "hsl(var(--card))" : DEFAULT_AMBER);
  const resolvedIllustration = illustration ?? DefaultIllustration;

  // The whole cover is decorative chrome — caller renders the real title in
  // a heading element. Mark the outer wrapper aria-hidden so AT users don't
  // hear the title twice.
  const outerStyle: CSSProperties = { perspective: 900 };
  const innerStyle: CSSProperties = {
    transformStyle: "preserve-3d",
    minWidth: resolvedWidth,
    containerType: "inline-size",
  };
  const coverShellStyle: CSSProperties = {
    width: resolvedWidth,
    backgroundColor: "hsl(var(--card))",
    boxShadow: BOOK_SHADOW,
  };
  const coverBorderStyle: CSSProperties = { boxShadow: BOOK_BORDER_SHADOW };

  return (
    <div aria-hidden="true" className="inline-block w-fit" style={outerStyle}>
      <div
        className="book-rotate relative w-fit rotate-0 aspect-[49/60] duration-[250ms]"
        style={innerStyle}
      >
        <div
          className="relative flex h-full translate-x-0 flex-col overflow-hidden rounded-l-md rounded-r"
          style={coverShellStyle}
        >
          {/* Border-shadow layer (replaces the missing `shadow-book-border` util) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-l-md rounded-r"
            style={coverBorderStyle}
          />

          {/* Stripe (or top half for simple) */}
          <div
            className={cn("relative w-full overflow-hidden", variant === "stripe" && "flex-1")}
            style={{ background: coverColor }}
          >
            {variant === "stripe" && illustration && (
              <div className="absolute h-full w-full">{resolvedIllustration}</div>
            )}
            <div
              className="absolute h-full w-[8.2%] mix-blend-overlay"
              style={{ background: SPINE_BIND_GRADIENT }}
            />
          </div>

          {/* Lower body */}
          <div
            className="relative flex-1"
            style={{
              background: variant === "simple" && color !== undefined ? coverColor : COVER_GRADIENT,
            }}
          >
            <div
              className="absolute h-full w-[8.2%] opacity-20"
              style={{ background: SPINE_BIND_GRADIENT }}
            />
            <div
              className={cn(
                "flex w-full flex-col p-[6.1%] pl-[14.3%]",
                variant === "simple" ? "gap-4" : "justify-between",
              )}
              style={{
                containerType: "inline-size",
                gap: `calc((24px / 196) * ${resolvedWidth}px)`,
              }}
            >
              <span
                className={cn(
                  "text-balance font-semibold leading-[1.25em] tracking-[-.02em]",
                  variant === "simple" ? "text-[12cqw]" : "text-[10.5cqw]",
                )}
                style={{ color: textColor }}
              >
                {title}
              </span>
              {variant === "stripe" ? (
                <svg
                  aria-hidden="true"
                  className="-ml-1 -mb-1 scale-75"
                  height="24"
                  width="24"
                  style={{ fill: textColor }}
                >
                  <title>Decorative play glyph</title>
                  <path d="M21,21H3L12,3Z" />
                </svg>
              ) : (
                resolvedIllustration
              )}
            </div>
          </div>

          {textured && (
            <div
              className="pointer-events-none absolute inset-0 top-0 left-0 rotate-180 rounded-l-md rounded-r bg-cover bg-no-repeat opacity-50 brightness-110 mix-blend-hard-light"
              style={{ backgroundImage: `url('${TEXTURE_URL}')` }}
            />
          )}
        </div>

        {/* Spine right edge */}
        <div
          className="absolute top-[3px] h-[calc(100%_-_2_*_3px)] w-[calc(29cqw_-_2px)]"
          style={{
            background: SPINE_BACK_GRADIENT,
            transform: `translateX(calc(${resolvedWidth}px - 29cqw / 2 - 3px)) rotateY(90deg) translateX(calc(29cqw / 2))`,
          }}
        />
        {/* Back cover */}
        <div
          className="absolute top-0 left-0 h-full rounded-l-md rounded-r"
          style={{
            width: resolvedWidth,
            transform: "translateZ(calc(-1 * 29cqw))",
            backgroundColor: "hsl(var(--muted))",
          }}
        />
      </div>
    </div>
  );
}
