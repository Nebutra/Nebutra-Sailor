"use client";

import { glass } from "@dicebear/collection";
import { createAvatar } from "@dicebear/core";
import { cn } from "@nebutra/ui/utils";
import { useMemo, useState } from "react";
import { LOGO_PLATES } from "@/lib/constants/logo-plates.generated";
import { vcMonogram } from "@/lib/constants/vc";

/** The computed plate for a curated logo, looked up by its public path. */
function plateFor(src: string) {
  const key = src.match(/logos\/[^?#]+\.png/)?.[0];
  return key ? LOGO_PLATES[key] : undefined;
}

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
    // The plate is computed from the image (scripts/gen-logo-plates.mjs): the
    // logo's own background when it has one, else whichever tinted near-white
    // or near-black its marks contrast with more. A white mark no longer sits
    // on white.
    const plate = plateFor(src);
    return (
      <span
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-xl)] border border-border/60 p-1.5",
          s.box,
        )}
        style={plate ? { backgroundColor: plate.plate } : undefined}
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
      {/* allow-palette: scrim over the generated glass-gradient avatar image, keeps white initials legible on the palest gradients */}
      <span aria-hidden="true" className="absolute inset-0 bg-black/20" />
      <span
        className={cn(
          // allow-palette: ink over the generated glass-gradient avatar image above
          "relative font-bold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]",
          s.text,
        )}
      >
        {vcMonogram(name)}
      </span>
    </span>
  );
}
