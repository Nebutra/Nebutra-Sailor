"use client";

import { cn } from "@nebutra/ui/utils";
import Image from "next/image";
import { useState } from "react";

interface ExternalAvatarProps {
  src?: string | null;
  alt: string;
  size?: number;
  className?: string;
  fallbackInitial?: string;
}

export function ExternalAvatar({
  src,
  alt,
  size = 32,
  className,
  fallbackInitial,
}: ExternalAvatarProps) {
  const [error, setError] = useState(false);

  if (!src || error) {
    const initial = fallbackInitial ?? alt.charAt(0).toUpperCase();
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold",
          className,
        )}
        style={{ width: size, height: size }}
      >
        {initial}
      </div>
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
