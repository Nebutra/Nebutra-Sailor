"use client";

import { useState } from "react";
import { vcMonogram } from "@/lib/constants/vc";

/**
 * Institution avatar: a curated logo when `src` is provided, otherwise a
 * brand-gradient monogram. Falls back to the monogram if the image fails.
 */
export function VcLogo({ src, name }: { src: string | null; name: string }) {
  const [errored, setErrored] = useState(false);

  if (src && !errored) {
    return (
      <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-xl)] border border-border/60 bg-white p-1.5">
        {/* biome-ignore lint/performance/noImgElement: 44px static avatar with monogram fallback — next/image adds no value */}
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
      aria-hidden="true"
      className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-xl)] text-sm font-bold text-white"
      style={{ background: "var(--brand-gradient)" }}
    >
      {vcMonogram(name)}
    </span>
  );
}
