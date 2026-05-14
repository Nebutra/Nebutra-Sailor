/**
 * Storybook stub for `next/image`.
 *
 * Strips Next-only props (priority, placeholder, blurDataURL, loader, quality,
 * sizes, fill, unoptimized) and renders a plain <img>. For visual stories the
 * production optimization pipeline is irrelevant; for actual perf testing run
 * the app.
 */

import { forwardRef, type ImgHTMLAttributes } from "react";

type StaticImageData = { src: string; height?: number; width?: number };

type ImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string | StaticImageData;
  alt: string;
  width?: number | string;
  height?: number | string;
  fill?: boolean;
  priority?: boolean;
  placeholder?: "blur" | "empty";
  blurDataURL?: string;
  // biome-ignore lint/suspicious/noExplicitAny: matches next/image loader signature
  loader?: (...args: any[]) => string;
  quality?: number;
  sizes?: string;
  unoptimized?: boolean;
};

const Image = forwardRef<HTMLImageElement, ImageProps>(function NextImageStub(
  {
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
    ...rest
  },
  ref,
) {
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
  return (
    <img
      ref={ref}
      src={finalSrc}
      alt={alt}
      style={fillStyle ? { ...fillStyle, ...style } : style}
      {...rest}
    />
  );
});

export default Image;
