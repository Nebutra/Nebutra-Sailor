"use client";

import { glass } from "@dicebear/collection";
import { createAvatar } from "@dicebear/core";
import { useMemo, useState } from "react";
import { vcMonogram } from "@/lib/constants/vc";

/**
 * Institution avatar: a curated logo when `src` is provided, otherwise a
 * DiceBear "glass" frosted-gradient (deterministic, seeded by name) with the
 * institution's monogram initials overlaid. Falls back to glass+initials if
 * the curated logo fails to load.
 */
export function VcLogo({ src, name }: { src: string | null; name: string }) {
  const [errored, setErrored] = useState(false);

  const glassUri = useMemo(() => createAvatar(glass, { seed: name, size: 88 }).toDataUri(), [name]);

  if (src && !errored) {
    return (
      <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-xl)] border border-border/60 bg-white p-1.5">
        {/* biome-ignore lint/performance/noImgElement: 44px static avatar — next/image adds no value */}
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
    <span className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-xl)]">
      {/* biome-ignore lint/performance/noImgElement: inline data-uri avatar, no network */}
      <img src={glassUri} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full" />
      {/* scrim keeps white initials legible on the palest glass gradients */}
      <span aria-hidden="true" className="absolute inset-0 bg-black/20" />
      <span className="relative font-bold text-sm text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]">
        {vcMonogram(name)}
      </span>
    </span>
  );
}
