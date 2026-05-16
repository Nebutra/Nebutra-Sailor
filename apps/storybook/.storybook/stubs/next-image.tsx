/**
 * Storybook stub for `next/image`.
 *
 * Strips Next-only props (priority, placeholder, blurDataURL, loader, quality,
 * sizes, fill, unoptimized) and renders a plain <img>. For visual stories the
 * production optimization pipeline is irrelevant; for actual perf testing run
 * the app.
 */

import { createElement, type ImgHTMLAttributes, type Ref } from "react";

type StaticImageData = { src: string; height?: number; width?: number };
type ImageLoaderProps = { src: string; width: number; quality?: number };

type ImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string | StaticImageData;
  alt: string;
  width?: number | string;
  height?: number | string;
  fill?: boolean;
  priority?: boolean;
  placeholder?: "blur" | "empty";
  blurDataURL?: string;
  loader?: (props: ImageLoaderProps) => string;
  quality?: number;
  sizes?: string;
  unoptimized?: boolean;
  ref?: Ref<HTMLImageElement>;
};

function Image({
  src,
  alt,
  fill,
  priority: _priority,
  placeholder: _placeholder,
  blurDataURL: _blurDataURL,
  loader: _loader,
  quality: _quality,
  sizes: _sizes,
  unoptimized: _unoptimized,
  style,
  ref,
  ...rest
}: ImageProps) {
  const finalSrc = typeof src === "string" ? src : src.src;
  const fillStyle = fill
    ? {
        position: "absolute" as const,
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover" as const,
      }
    : undefined;
  return createElement("img", {
    ...rest,
    ref,
    src: finalSrc,
    alt,
    style: fillStyle ? { ...fillStyle, ...style } : style,
  });
}

export default Image;
