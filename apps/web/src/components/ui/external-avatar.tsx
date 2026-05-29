"use client";

import { cn } from "@nebutra/ui/utils";
import Image from "next/image";
import { useState } from "react";
import { dicebearAvatarUrl } from "@/lib/avatar";

interface ExternalAvatarProps {
  src?: string | null;
  alt: string;
  size?: number;
  className?: string;
  /** Stable identity (email/name) seeding the DiceBear fallback. Defaults to `alt`. */
  seed?: string;
}

export function ExternalAvatar({ src, alt, size = 32, className, seed }: ExternalAvatarProps) {
  const [error, setError] = useState(false);

  if (!src || error) {
    // Fallback is a deterministic DiceBear avatar, never letter initials.
    return (
      <img
        src={dicebearAvatarUrl(seed ?? alt)}
        alt={alt}
        width={size}
        height={size}
        className={cn("rounded-full object-cover", className)}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn("rounded-full object-cover", className)}
      onError={() => setError(true)}
    />
  );
}
