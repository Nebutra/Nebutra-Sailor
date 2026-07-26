"use client";

/**
 * Product chrome brand mark (Forge).
 * Primary: /public/brand via brand:sync; inline SVG fallback if asset 404s.
 */

import { brand } from "@nebutra/brand/metadata";
import { useState } from "react";

const ASSETS = {
  mark: {
    src: "/brand/logo-color.svg",
    width: 550,
    height: 513,
  },
  horizontal: {
    src: "/brand/logo-horizontal-en.svg",
    width: 1062,
    height: 208,
  },
} as const;

function FallbackMark({ wordmark }: { wordmark?: boolean }) {
  const gradId = wordmark ? "nbForgeHorizGrad" : "nbForgeMarkGrad";
  return (
    <svg
      viewBox={wordmark ? "0 0 140 32" : "0 0 32 32"}
      width={wordmark ? 140 : 32}
      height={32}
      className="block h-full w-auto max-w-full"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--brand-primary, var(--blue-9))" />
          <stop offset="50%" stopColor="var(--cyan-9)" />
          <stop offset="100%" stopColor="var(--brand-accent, var(--cyan-9))" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill={`url(#${gradId})`} />
      {wordmark ? (
        <text
          x="40"
          y="22"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="15"
          fontWeight="700"
          fill="currentColor"
        >
          {brand.name}
        </text>
      ) : null}
    </svg>
  );
}

export function BrandLogo({
  variant = "horizontal",
  className,
}: {
  variant?: "horizontal" | "mark";
  className?: string;
}) {
  const asset = ASSETS[variant];
  const [failed, setFailed] = useState(false);

  return (
    <span
      className={["inline-flex shrink-0 items-center", className].filter(Boolean).join(" ")}
      data-brand-asset={variant}
      data-brand-source="packages/design/brand"
      data-brand-fallback={failed ? "inline" : "public"}
    >
      {failed ? (
        <FallbackMark wordmark={variant === "horizontal"} />
      ) : (
        // biome-ignore lint/performance/noImgElement: brand SVG from public/brand SSOT
        <img
          src={asset.src}
          alt=""
          width={asset.width}
          height={asset.height}
          draggable={false}
          aria-hidden="true"
          className="block h-full w-full object-contain"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
