"use client";

import { glass } from "@dicebear/collection";
import { createAvatar } from "@dicebear/core";
import { cn } from "@nebutra/ui/utils";
import { useMemo, useState } from "react";
import { vcMonogram } from "@/lib/constants/vc";

const SIZE = {
  md: { box: "size-11", text: "text-sm" },
  lg: { box: "size-16", text: "text-xl" },
} as const;

/**
 * Institution avatar: a curated logo when `src` is provided, otherwise a
 * DiceBear "glass" frosted-gradient (deterministic, seeded by name) with the
 * institution's monogram initials overlaid. Falls back to glass+initials if
 * the curated logo fails to load.
 */
export function VcLogo({
  src,
  name,
  size = "md",
}: {
  src: string | null;
  name: string;
  size?: keyof typeof SIZE;
}) {
  const [errored, setErrored] = useState(false);
  const s = SIZE[size];

  const glassUri = useMemo(() => createAvatar(glass, { seed: name, size: 96 }).toDataUri(), [name]);

  if (src && !errored) {
    return (
      <span
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-xl)] border border-border/60 bg-white p-1.5",
          s.box,
        )}
      >
        {/* biome-ignore lint/performance/noImgElement: small static avatar — next/image adds no value */}
        <img
          src={src}
          alt={`${name} logo`}
          loading="lazy"
          onError={() => setErrored(true)}
          className="h-full w-full object-contain"
        />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-xl)]",
        s.box,
      )}
    >
      {/* biome-ignore lint/performance/noImgElement: inline data-uri avatar, no network */}
      <img src={glassUri} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full" />
      {/* scrim keeps white initials legible on the palest glass gradients */}
      <span aria-hidden="true" className="absolute inset-0 bg-black/20" />
      <span
        className={cn(
          "relative font-bold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]",
          s.text,
        )}
      >
        {vcMonogram(name)}
      </span>
    </span>
  );
}
