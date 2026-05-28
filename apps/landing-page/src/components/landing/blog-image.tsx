"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useState } from "react";

type BlogImageProps = Omit<ImageProps, "alt" | "onError" | "src"> & {
  alt: string;
  blurDataURL?: string;
  fallbackAlt?: string;
  fallbackSrc: string;
  fallbackBlurDataURL?: string;
  src: string;
};

export function BlogImage({
  alt,
  blurDataURL,
  fallbackAlt,
  fallbackBlurDataURL,
  fallbackSrc,
  src,
  ...props
}: BlogImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src);

  useEffect(() => {
    setCurrentSrc(src);
  }, [src]);

  const isFallback = currentSrc === fallbackSrc;
  const currentBlurDataURL = isFallback ? (fallbackBlurDataURL ?? blurDataURL) : blurDataURL;

  return (
    <Image
      {...props}
      alt={isFallback ? (fallbackAlt ?? alt) : alt}
      blurDataURL={currentBlurDataURL}
      placeholder={currentBlurDataURL ? "blur" : props.placeholder}
      src={currentSrc}
      onError={() => {
        if (!isFallback) setCurrentSrc(fallbackSrc);
      }}
    />
  );
}
