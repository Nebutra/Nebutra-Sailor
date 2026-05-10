"use client";

import React, { type ElementType, type ReactNode, useEffect, useState } from "react";

import { cn } from "../utils/cn";

export interface VideoTextProps {
  /** The video source URL */
  src: string;
  /** Additional className for the container */
  className?: string;
  /** Whether to autoplay the video */
  autoPlay?: boolean;
  /** Whether to mute the video */
  muted?: boolean;
  /** Whether to loop the video */
  loop?: boolean;
  /** Whether to preload the video */
  preload?: "auto" | "metadata" | "none";
  /** The content to display (will have the video "inside" it) */
  children: ReactNode;
  /** Font size for the text mask (in viewport width units) */
  fontSize?: string | number;
  /** Font weight for the text mask */
  fontWeight?: string | number;
  /** Text anchor for the text mask */
  textAnchor?: string;
  /** Dominant baseline for the text mask */
  dominantBaseline?: string;
  /** Font family for the text mask */
  fontFamily?: string;
  /** The element type to render for the text */
  as?: ElementType;
}

/**
 * VideoText - Text component with video background
 *
 * @description
 * Renders text with a video playing inside the letters using SVG mask.
 * Perfect for hero sections and eye-catching headlines.
 *
 * @example Basic usage
 * ```tsx
 * <div className="relative h-[500px] w-full overflow-hidden">
 *   <VideoText src="/ocean.webm">OCEAN</VideoText>
 * </div>
 * ```
 *
 * @example Custom font settings
 * ```tsx
 * <VideoText
 *   src="/fire.webm"
 *   fontSize={15}
 *   fontWeight={900}
 *   fontFamily="Impact"
 * >
 *   FIRE
 * </VideoText>
 * ```
 */
export function VideoText({
  src,
  children,
  className = "",
  autoPlay = true,
  muted = true,
  loop = true,
  preload = "auto",
  fontSize = 20,
  fontWeight = "bold",
  textAnchor = "middle",
  dominantBaseline = "middle",
  fontFamily = "sans-serif",
  as: Component = "div",
}: VideoTextProps) {
  const [svgMask, setSvgMask] = useState("");
  const content = React.Children.toArray(children).join("");

  useEffect(() => {
    const updateSvgMask = () => {
      const responsiveFontSize = typeof fontSize === "number" ? `${fontSize}vw` : fontSize;
      const newSvgMask = `<svg xmlns='http://www.w3.org/2000/svg' width='100%' height='100%'><text x='50%' y='50%' font-size='${responsiveFontSize}' font-weight='${fontWeight}' text-anchor='${textAnchor}' dominant-baseline='${dominantBaseline}' font-family='${fontFamily}'>${content}</text></svg>`;
      setSvgMask(newSvgMask);
    };

    updateSvgMask();
    window.addEventListener("resize", updateSvgMask);
    return () => window.removeEventListener("resize", updateSvgMask);
  }, [content, fontSize, fontWeight, textAnchor, dominantBaseline, fontFamily]);

  const dataUrlMask = `url("data:image/svg+xml,${encodeURIComponent(svgMask)}")`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Comp = Component as any;
  return (
    <Comp className={cn("relative size-full", className)}>
      {/* Create a container that masks the video to only show within text */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          maskImage: dataUrlMask,
          WebkitMaskImage: dataUrlMask,
          maskSize: "contain",
          WebkitMaskSize: "contain",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          maskPosition: "center",
          WebkitMaskPosition: "center",
        }}
      >
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          className="h-full w-full object-cover"
          autoPlay={autoPlay}
          muted={muted}
          loop={loop}
          preload={preload}
          playsInline
        >
          <source src={src} />
          Your browser does not support the video tag.
        </video>
      </div>

      {/* Add a backup text element for SEO/accessibility */}
      <span className="sr-only">{content}</span>
    </Comp>
  );
}
