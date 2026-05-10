"use client";

import { useInView } from "motion/react";
import type React from "react";
import { useEffect, useRef } from "react";
import { annotate } from "rough-notation";
import type { RoughAnnotation } from "rough-notation/lib/model";

// =============================================================================
// Types
// =============================================================================

export type HighlighterAction =
  | "highlight"
  | "underline"
  | "box"
  | "circle"
  | "strike-through"
  | "crossed-off"
  | "bracket";

export interface HighlighterProps {
  /** Content to be highlighted/annotated */
  children: React.ReactNode;
  /** Type of annotation effect */
  action?: HighlighterAction;
  /** Color of the highlight */
  color?: string;
  /** Width of the annotation stroke in pixels */
  strokeWidth?: number;
  /** Duration of animation in milliseconds */
  animationDuration?: number;
  /** Number of draw iterations (adds sketchy effect when > 1) */
  iterations?: number;
  /** Padding between element and annotation in pixels */
  padding?: number;
  /** Whether to annotate across multiple lines */
  multiline?: boolean;
  /** Trigger animation only when element enters viewport */
  triggerOnView?: boolean;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Highlighter - Hand-drawn style text annotation effect
 *
 * @description
 * Creates a human-drawn marker stroke effect on text using rough-notation.
 * Supports various annotation styles including highlight, underline, circle, etc.
 *
 * @example Basic highlight
 * ```tsx
 * <Highlighter>Important text</Highlighter>
 * ```
 *
 * @example Underline with custom color
 * ```tsx
 * <Highlighter action="underline" color="#FF9800">
 *   Underlined text
 * </Highlighter>
 * ```
 *
 * @example Multiple annotation types
 * ```tsx
 * <p>
 *   The{" "}
 *   <Highlighter action="underline" color="#FF9800">
 *     Magic UI Highlighter
 *   </Highlighter>{" "}
 *   makes important{" "}
 *   <Highlighter action="highlight" color="#87CEFA">
 *     text stand out
 *   </Highlighter>{" "}
 *   effortlessly.
 * </p>
 * ```
 *
 * @example Circle annotation
 * ```tsx
 * <Highlighter action="circle" color="#ef4444" strokeWidth={2}>
 *   Circled!
 * </Highlighter>
 * ```
 */
export function Highlighter({
  children,
  action = "highlight",
  color = "#ffd1dc",
  strokeWidth = 1.5,
  animationDuration = 600,
  iterations = 2,
  padding = 2,
  multiline = true,
  triggerOnView = false,
}: HighlighterProps) {
  const elementRef = useRef<HTMLSpanElement>(null);
  const annotationRef = useRef<RoughAnnotation | null>(null);

  const isInView = useInView(elementRef, {
    once: true,
    margin: "-10%",
  });

  // If triggerOnView is false, always show. Otherwise wait for inView
  const shouldShow = !triggerOnView || isInView;

  useEffect(() => {
    if (!shouldShow) return;

    const element = elementRef.current;
    if (!element) return;

    const annotationConfig = {
      type: action,
      color,
      strokeWidth,
      animationDuration,
      iterations,
      padding,
      multiline,
    };

    const annotation = annotate(element, annotationConfig);

    annotationRef.current = annotation;
    annotationRef.current.show();

    const resizeObserver = new ResizeObserver(() => {
      annotation.hide();
      annotation.show();
    });

    resizeObserver.observe(element);
    resizeObserver.observe(document.body);

    return () => {
      if (element) {
        annotate(element, { type: action }).remove();
        resizeObserver.disconnect();
      }
    };
  }, [shouldShow, action, color, strokeWidth, animationDuration, iterations, padding, multiline]);

  return (
    <span ref={elementRef} className="relative inline-block bg-transparent">
      {children}
    </span>
  );
}
