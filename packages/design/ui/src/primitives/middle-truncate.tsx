"use client";

import * as React from "react";
import { cn } from "../utils/cn";

const DEFAULT_MIN_START_CHARS = 6;
const DEFAULT_MIN_END_CHARS = 8;
const DEFAULT_ELLIPSIS = "…";

type TruncationParts = {
  head: string;
  tail: string;
  truncated: boolean;
};

export interface MiddleTruncateProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /**
   * Full text value. The visible text may be shortened, but copy and
   * assistive technology keep this original string.
   */
  value: string;
  /** Minimum characters to preserve at the start when space allows. */
  minStartChars?: number;
  /** Minimum characters to preserve at the end when space allows. */
  minEndChars?: number;
  /** Separator rendered between the preserved head and tail. */
  ellipsis?: string;
}

function getCanvasContext(): CanvasRenderingContext2D | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  return canvas.getContext("2d");
}

function getCanvasFont(style: CSSStyleDeclaration): string {
  if (style.font) return style.font;
  const fontStyle = style.fontStyle || "normal";
  const fontVariant = style.fontVariant || "normal";
  const fontWeight = style.fontWeight || "400";
  const fontSize = style.fontSize || "14px";
  const lineHeight = style.lineHeight || "normal";
  const fontFamily = style.fontFamily || "sans-serif";
  return `${fontStyle} ${fontVariant} ${fontWeight} ${fontSize}/${lineHeight} ${fontFamily}`;
}

function splitForBudget(
  glyphs: string[],
  visibleGlyphCount: number,
  minStartChars: number,
  minEndChars: number,
): { head: string; tail: string } {
  if (visibleGlyphCount <= 0) return { head: "", tail: "" };

  const length = glyphs.length;
  const normalizedMinStart = Math.max(1, Math.min(minStartChars, length));
  const normalizedMinEnd = Math.max(1, Math.min(minEndChars, length));

  let headCount: number;
  let tailCount: number;

  if (visibleGlyphCount <= normalizedMinStart + normalizedMinEnd) {
    headCount = Math.ceil(visibleGlyphCount / 2);
    tailCount = visibleGlyphCount - headCount;
  } else {
    const extra = visibleGlyphCount - normalizedMinStart - normalizedMinEnd;
    headCount = normalizedMinStart + Math.ceil(extra / 2);
    tailCount = normalizedMinEnd + Math.floor(extra / 2);
  }

  if (headCount + tailCount >= length) {
    tailCount = Math.max(1, length - headCount - 1);
  }

  return {
    head: glyphs.slice(0, headCount).join(""),
    tail: tailCount > 0 ? glyphs.slice(length - tailCount).join("") : "",
  };
}

function computeMiddleTruncation(
  value: string,
  width: number,
  font: string,
  ellipsis: string,
  minStartChars: number,
  minEndChars: number,
): TruncationParts {
  const glyphs = Array.from(value);
  if (glyphs.length === 0) return { head: "", tail: "", truncated: false };
  if (font.length === 0) return { head: value, tail: "", truncated: false };
  if (width <= 0) return { head: "", tail: "", truncated: true };

  const context = getCanvasContext();
  if (!context) return { head: value, tail: "", truncated: false };
  context.font = font;

  const measure = (text: string) => context.measureText(text).width;
  if (measure(value) <= width) return { head: value, tail: "", truncated: false };

  const ellipsisWidth = measure(ellipsis);
  if (ellipsisWidth >= width) return { head: "", tail: "", truncated: true };

  let low = 0;
  let high = glyphs.length - 1;
  let best: TruncationParts = { head: "", tail: "", truncated: true };

  while (low <= high) {
    const visibleGlyphCount = Math.floor((low + high) / 2);
    const candidate = splitForBudget(glyphs, visibleGlyphCount, minStartChars, minEndChars);
    const candidateWidth = measure(`${candidate.head}${ellipsis}${candidate.tail}`);

    if (candidateWidth <= width) {
      best = { ...candidate, truncated: true };
      low = visibleGlyphCount + 1;
    } else {
      high = visibleGlyphCount - 1;
    }
  }

  return best;
}

function assignRef<T>(ref: React.ForwardedRef<T>, value: T | null): void {
  if (typeof ref === "function") {
    ref(value);
    return;
  }

  if (ref) {
    ref.current = value;
  }
}

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

export const MiddleTruncate = React.forwardRef<HTMLSpanElement, MiddleTruncateProps>(
  (
    {
      value,
      minStartChars = DEFAULT_MIN_START_CHARS,
      minEndChars = DEFAULT_MIN_END_CHARS,
      ellipsis = DEFAULT_ELLIPSIS,
      className,
      onCopy,
      "aria-label": ariaLabel,
      ...props
    },
    forwardedRef,
  ) => {
    const localRef = React.useRef<HTMLSpanElement | null>(null);
    const [measurements, setMeasurements] = React.useState({ width: 0, font: "" });

    const setRef = React.useCallback(
      (node: HTMLSpanElement | null) => {
        localRef.current = node;
        assignRef(forwardedRef, node);
      },
      [forwardedRef],
    );

    useIsomorphicLayoutEffect(() => {
      const node = localRef.current;
      if (!node) return undefined;

      let frame = 0;
      const updateMeasurements = () => {
        frame = 0;
        const style = window.getComputedStyle(node);
        const container = node.parentElement ?? node;
        setMeasurements({
          width: container.getBoundingClientRect().width,
          font: getCanvasFont(style),
        });
      };

      const scheduleUpdate = () => {
        if (frame) return;
        frame = window.requestAnimationFrame(updateMeasurements);
      };

      updateMeasurements();

      if (document.fonts) {
        void document.fonts.ready.then(scheduleUpdate);
      }

      if (typeof ResizeObserver === "undefined") {
        window.addEventListener("resize", scheduleUpdate);
        return () => {
          if (frame) window.cancelAnimationFrame(frame);
          window.removeEventListener("resize", scheduleUpdate);
        };
      }

      const observer = new ResizeObserver(scheduleUpdate);
      observer.observe(node.parentElement ?? node);

      return () => {
        if (frame) window.cancelAnimationFrame(frame);
        observer.disconnect();
      };
    }, []);

    const parts = React.useMemo(
      () =>
        computeMiddleTruncation(
          value,
          measurements.width,
          measurements.font,
          ellipsis,
          minStartChars,
          minEndChars,
        ),
      [ellipsis, measurements.font, measurements.width, minEndChars, minStartChars, value],
    );

    const handleCopy = React.useCallback(
      (event: React.ClipboardEvent<HTMLSpanElement>) => {
        onCopy?.(event);
        if (event.defaultPrevented) return;
        event.clipboardData.setData("text/plain", value);
        event.preventDefault();
      },
      [onCopy, value],
    );

    const visibleText = parts.truncated ? `${parts.head}${ellipsis}${parts.tail}` : value;
    const hasAccessibleOverride = ariaLabel !== undefined;
    const hideVisibleTextFromAssistiveTech = parts.truncated || hasAccessibleOverride;

    return (
      <span
        ref={setRef}
        className={cn("inline-block min-w-0 max-w-full whitespace-nowrap", className)}
        data-truncated={parts.truncated ? "" : undefined}
        onCopy={handleCopy}
        {...props}
      >
        <span aria-hidden={hideVisibleTextFromAssistiveTech ? "true" : undefined}>
          {visibleText}
        </span>
        {hideVisibleTextFromAssistiveTech && <span className="sr-only">{ariaLabel ?? value}</span>}
      </span>
    );
  },
);

MiddleTruncate.displayName = "MiddleTruncate";
