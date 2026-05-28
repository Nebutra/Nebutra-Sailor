"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useState } from "react";

type BlogImageProps = Omit<ImageProps, "alt" | "onError" | "src"> & {
  alt: string;
  fallbackAlt?: string;
  fallbackSrc: string;
  src: string;
};

export function BlogImage({ alt, fallbackAlt, fallbackSrc, src, ...props }: BlogImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src);

  useEffect(() => {
    setCurrentSrc(src);
  }, [src]);

  const isFallback = currentSrc === fallbackSrc;

  return (
    <Image
      {...props}
      alt={isFallback ? (fallbackAlt ?? alt) : alt}
      src={currentSrc}
      onError={() => {
        if (!isFallback) setCurrentSrc(fallbackSrc);
      }}
    />
  );
}
