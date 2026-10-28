"use client";

import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "@nebutra/icons";
import * as React from "react";
import { scrollerTokens } from "../tokens/components/scroller";
import { cn } from "../utils/cn";
import { readElementDirection, type TextDirection, useResolvedDirection } from "../utils/direction";
import { controlFocusVisibleClassName } from "./form-control";

export type ScrollerOverflow = "x" | "y" | "both";
export type ScrollerButtonAxis = "x" | "y";
export type ScrollerEdgeAffordance = "fade" | "none";
export type ScrollerSize = number | string;

type ScrollerCssVar =
  | "--scroller-width"
  | "--scroller-height"
  | "--scroller-radius"
  | "--scroller-fade-size"
  | "--scroller-button-size"
  | "--scroller-button-offset"
  | "--scroller-button-radius"
  | "--scroller-button-icon-size"
  | "--scroller-button-shadow"
  | "--scroller-duration"
  | "--scroller-easing";

type ScrollerCssVars = React.CSSProperties & Record<ScrollerCssVar, string>;

/** Edges are logical on the x axis: `start` is the left edge in LTR and the right edge in RTL. */
type EdgeState = {
  start: boolean;
  end: boolean;
  top: boolean;
  bottom: boolean;
};

export interface ScrollerProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "style"> {
  /** Scrollable content. With `withButtons`, each direct child is one step for the buttons. */
  children?: React.ReactNode;
  /**
   * Scroll axis. Use "both" only when content genuinely overflows in two dimensions.
   * @default "y"
   */
  overflow?: ScrollerOverflow;
  /**
   * Outer width. Numbers resolve to px.
   * @default "100%"
   */
  width?: ScrollerSize;
  /**
   * Outer height. Numbers resolve to px; leave unset to size to the content, which never scrolls.
   * @default "auto"
   */
  height?: ScrollerSize;
  /** Class applied to the direct-child container inside the scroll viewport. */
  childrenContainerClassName?: string;
  /**
   * Render directional buttons that scroll to the next direct child.
   * @default false
   */
  withButtons?: boolean;
  /** Axis used by directional buttons. Defaults to x for horizontal, y otherwise. */
  buttonAxis?: ScrollerButtonAxis;
  /**
   * Accessible noun used by the viewport and generated button labels.
   * @default "content"
   */
  contentLabel?: string;
  /**
   * Accessible name of the previous button. Defaults to "Scroll {contentLabel} left" (x, "right"
   * under `dir="rtl"`) or "up" (y).
   */
  previousButtonLabel?: string;
  /**
   * Accessible name of the next button. Defaults to "Scroll {contentLabel} right" (x, "left"
   * under `dir="rtl"`) or "down" (y).
   */
  nextButtonLabel?: string;
  /**
   * Edge treatment: "fade" shows a gradient on each side that has more content, "none" hides it.
   * @default "fade"
   */
  edgeAffordance?: ScrollerEdgeAffordance;
  /**
   * Scroll behavior used by the directional buttons. `"smooth"` becomes an instant jump when the
   * user prefers reduced motion.
   * @default "smooth"
   */
  scrollBehavior?: ScrollBehavior;
  /** Inline styles for the outer element. They are merged after the component's own CSS variables. */
  style?: React.CSSProperties;
}

function toCssLength(value: ScrollerSize | undefined, fallback: string) {
  if (value === undefined) return fallback;
  return typeof value === "number" ? `${value}px` : value;
}

function createScrollerCssVars({
  width,
  height,
  style,
}: {
  width: ScrollerSize | undefined;
  height: ScrollerSize | undefined;
  style: React.CSSProperties | undefined;
}): ScrollerCssVars {
  return {
    "--scroller-width": toCssLength(width, "100%"),
    "--scroller-height": toCssLength(height, "auto"),
    "--scroller-radius": `${scrollerTokens.radius}px`,
    "--scroller-fade-size": `${scrollerTokens.fadeSize}px`,
    "--scroller-button-size": `${scrollerTokens.button.size}px`,
    "--scroller-button-offset": `${scrollerTokens.button.offset}px`,
    "--scroller-button-radius": `${scrollerTokens.button.radius}px`,
    "--scroller-button-icon-size": `${scrollerTokens.button.iconSize}px`,
    "--scroller-button-shadow": scrollerTokens.button.shadow,
    "--scroller-duration": `${scrollerTokens.motion.duration}ms`,
    "--scroller-easing": scrollerTokens.motion.easing,
    ...style,
  };
}

function resolveButtonAxis(overflow: ScrollerOverflow, buttonAxis: ScrollerButtonAxis | undefined) {
  return buttonAxis ?? (overflow === "x" ? "x" : "y");
}

function resolveScrollClasses(overflow: ScrollerOverflow) {
  if (overflow === "x") return "overflow-x-auto overflow-y-hidden";
  if (overflow === "y") return "overflow-y-auto overflow-x-hidden";
  return "overflow-auto";
}

function resolveContainerClasses(overflow: ScrollerOverflow) {
  if (overflow === "x") return "flex min-w-max flex-row";
  if (overflow === "y") return "flex flex-col";
  return "min-w-max";
}

function getDirectChildElements(container: HTMLDivElement | null): HTMLElement[] {
  if (!container) return [];
  return Array.from(container.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement,
  );
}

/**
 * Distance scrolled from the start edge. Browsers report `scrollLeft` as 0 at the start in both
 * directions, but it runs negative towards the end in RTL, so the x axis is normalised here.
 */
function getScrollPosition(
  viewport: HTMLDivElement,
  axis: ScrollerButtonAxis,
  textDirection: TextDirection,
) {
  if (axis === "y") return viewport.scrollTop;
  return textDirection === "rtl" ? -viewport.scrollLeft : viewport.scrollLeft;
}

/** Offset of a child's start edge from the start of the scrollable content. */
function getChildPosition(
  child: HTMLElement,
  viewport: HTMLDivElement,
  axis: ScrollerButtonAxis,
  textDirection: TextDirection,
) {
  const viewportRect = viewport.getBoundingClientRect();
  const childRect = child.getBoundingClientRect();
  const scrolled = getScrollPosition(viewport, axis, textDirection);
  if (axis === "y") return childRect.top - viewportRect.top + scrolled;
  return textDirection === "rtl"
    ? viewportRect.right - childRect.right + scrolled
    : childRect.left - viewportRect.left + scrolled;
}

/** The `behavior` to scroll with: smooth scrolling becomes an instant jump under reduced motion. */
function resolveScrollBehavior(behavior: ScrollBehavior): ScrollBehavior {
  if (behavior !== "smooth" || typeof window === "undefined") return behavior;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : behavior;
}

function getEdgeState(viewport: HTMLDivElement, textDirection: TextDirection): EdgeState {
  const threshold = 1;
  const maxX = viewport.scrollWidth - viewport.clientWidth;
  const maxY = viewport.scrollHeight - viewport.clientHeight;
  const scrolledX = getScrollPosition(viewport, "x", textDirection);

  return {
    start: scrolledX > threshold,
    end: scrolledX < maxX - threshold,
    top: viewport.scrollTop > threshold,
    bottom: viewport.scrollTop < maxY - threshold,
  };
}

function findTargetChild(
  children: readonly HTMLElement[],
  viewport: HTMLDivElement,
  axis: ScrollerButtonAxis,
  step: "previous" | "next",
  textDirection: TextDirection,
) {
  if (children.length === 0) return undefined;

  const threshold = 2;
  const currentPosition = getScrollPosition(viewport, axis, textDirection);
  const positionOf = (child: HTMLElement) => getChildPosition(child, viewport, axis, textDirection);
  const sortedChildren = [...children].sort((a, b) => positionOf(a) - positionOf(b));

  if (step === "next") {
    return (
      sortedChildren.find((child) => positionOf(child) > currentPosition + threshold) ??
      sortedChildren.at(-1)
    );
  }

  for (let index = sortedChildren.length - 1; index >= 0; index -= 1) {
    const child = sortedChildren[index];
    if (child && positionOf(child) < currentPosition - threshold) {
      return child;
    }
  }

  return sortedChildren[0];
}

function scrollToChild({
  child,
  viewport,
  axis,
  behavior,
  textDirection,
}: {
  child: HTMLElement;
  viewport: HTMLDivElement;
  axis: ScrollerButtonAxis;
  behavior: ScrollBehavior;
  textDirection: TextDirection;
}) {
  const position = getChildPosition(child, viewport, axis, textDirection);
  viewport.scrollTo({
    // RTL scrollLeft is negative towards the end of the content.
    left: axis === "x" ? (textDirection === "rtl" ? -position : position) : viewport.scrollLeft,
    top: axis === "y" ? position : viewport.scrollTop,
    behavior: resolveScrollBehavior(behavior),
  });
}

function edgeClasses(overflow: ScrollerOverflow, edgeState: EdgeState) {
  return [
    (overflow === "x" || overflow === "both") &&
      edgeState.start &&
      "before:absolute before:inset-y-0 before:start-0 before:z-10 before:w-[var(--scroller-fade-size)] before:pointer-events-none before:bg-gradient-to-r rtl:before:bg-gradient-to-l before:from-background before:to-transparent",
    (overflow === "x" || overflow === "both") &&
      edgeState.end &&
      "after:absolute after:inset-y-0 after:end-0 after:z-10 after:w-[var(--scroller-fade-size)] after:pointer-events-none after:bg-gradient-to-l rtl:after:bg-gradient-to-r after:from-background after:to-transparent",
  ];
}

function VerticalEdges({
  edgeState,
  overflow,
}: {
  edgeState: EdgeState;
  overflow: ScrollerOverflow;
}) {
  if (overflow === "x") return null;

  return (
    <>
      {edgeState.top && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[var(--scroller-fade-size)] bg-gradient-to-b from-background to-transparent"
        />
      )}
      {edgeState.bottom && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[var(--scroller-fade-size)] bg-gradient-to-t from-background to-transparent"
        />
      )}
    </>
  );
}

function ScrollerButton({
  axis,
  direction,
  disabled,
  label,
  onClick,
}: {
  axis: ScrollerButtonAxis;
  direction: "previous" | "next";
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  const Icon =
    axis === "x"
      ? direction === "previous"
        ? ChevronLeft
        : ChevronRight
      : direction === "previous"
        ? ChevronUp
        : ChevronDown;

  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "absolute z-20 grid size-[var(--scroller-button-size)] place-items-center rounded-[var(--scroller-button-radius)]",
        "border border-border bg-background text-muted-foreground shadow-[var(--scroller-button-shadow)]",
        "transition-[background-color,border-color,color,opacity,transform] duration-[var(--scroller-duration)] ease-[var(--scroller-easing)]",
        "hover:border-ring hover:text-foreground focus-visible:outline-none",
        "disabled:pointer-events-none disabled:opacity-0 motion-reduce:transition-none",
        axis === "x" &&
          direction === "previous" &&
          "start-[var(--scroller-button-offset)] top-1/2 -translate-y-1/2",
        axis === "x" &&
          direction === "next" &&
          "end-[var(--scroller-button-offset)] top-1/2 -translate-y-1/2",
        axis === "y" &&
          direction === "previous" &&
          "left-1/2 top-[var(--scroller-button-offset)] -translate-x-1/2",
        axis === "y" &&
          direction === "next" &&
          "bottom-[var(--scroller-button-offset)] left-1/2 -translate-x-1/2",
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          "size-[var(--scroller-button-icon-size)]",
          // The x chevrons point at the physical left/right; mirror them for RTL.
          axis === "x" && "rtl:rotate-180",
        )}
      />
    </button>
  );
}

/**
 * Native scroll viewport with edge fades and optional previous/next buttons.
 * The viewport is a labelled `section`; the buttons step to the previous or next direct child and
 * are disabled (and hidden) at the matching end. Use it for rails, feeds and logs, not for
 * carousels or virtualized lists.
 */
export function Scroller({
  children,
  overflow = "y",
  width,
  height,
  childrenContainerClassName,
  withButtons = false,
  buttonAxis,
  contentLabel = "content",
  previousButtonLabel,
  nextButtonLabel,
  edgeAffordance = "fade",
  scrollBehavior = "smooth",
  className,
  style,
  ...props
}: ScrollerProps) {
  const viewportRef = React.useRef<HTMLDivElement | null>(null);
  const childrenContainerRef = React.useRef<HTMLDivElement | null>(null);
  const [edgeState, setEdgeState] = React.useState<EdgeState>({
    start: false,
    end: false,
    top: false,
    bottom: false,
  });
  const resolvedButtonAxis = resolveButtonAxis(overflow, buttonAxis);
  const direction = useResolvedDirection(viewportRef);

  const updateEdgeState = React.useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    setEdgeState(getEdgeState(viewport, readElementDirection(viewport)));
  }, []);

  // The scroll origin moves with the direction, so the edges need re-measuring when it changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: direction is the trigger, not a value read inside
  React.useEffect(() => {
    updateEdgeState();
  }, [direction, updateEdgeState]);

  React.useEffect(() => {
    updateEdgeState();

    const viewport = viewportRef.current;
    const childrenContainer = childrenContainerRef.current;
    if (!viewport) return;

    const resizeObserver =
      typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(updateEdgeState);
    resizeObserver?.observe(viewport);
    if (childrenContainer) resizeObserver?.observe(childrenContainer);

    window.addEventListener("resize", updateEdgeState);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateEdgeState);
    };
  }, [updateEdgeState]);

  const scrollToSibling = React.useCallback(
    (step: "previous" | "next") => {
      const viewport = viewportRef.current;
      if (!viewport) return;

      const directChildren = getDirectChildElements(childrenContainerRef.current);
      const textDirection = readElementDirection(viewport);
      const targetChild = findTargetChild(
        directChildren,
        viewport,
        resolvedButtonAxis,
        step,
        textDirection,
      );
      if (!targetChild) return;

      scrollToChild({
        child: targetChild,
        viewport,
        axis: resolvedButtonAxis,
        behavior: scrollBehavior,
        textDirection,
      });
    },
    [resolvedButtonAxis, scrollBehavior],
  );

  const hasPrevious = resolvedButtonAxis === "x" ? edgeState.start : edgeState.top;
  const hasNext = resolvedButtonAxis === "x" ? edgeState.end : edgeState.bottom;
  // Previous steps towards the start, which is the right-hand side in RTL.
  const previousSide = direction === "rtl" ? "right" : "left";
  const nextSide = direction === "rtl" ? "left" : "right";
  const previousLabel =
    previousButtonLabel ??
    `Scroll ${contentLabel} ${resolvedButtonAxis === "x" ? previousSide : "up"}`;
  const nextLabel =
    nextButtonLabel ?? `Scroll ${contentLabel} ${resolvedButtonAxis === "x" ? nextSide : "down"}`;

  return (
    <div
      className={cn(
        "relative isolate w-[var(--scroller-width)]",
        edgeAffordance === "fade" && edgeClasses(overflow, edgeState),
        className,
      )}
      style={createScrollerCssVars({ width, height, style })}
      {...props}
    >
      <section
        ref={viewportRef}
        aria-label={contentLabel}
        onScroll={updateEdgeState}
        className={cn(
          "h-[var(--scroller-height)] rounded-[var(--scroller-radius)]",
          controlFocusVisibleClassName,
          "scroll-smooth overscroll-contain motion-reduce:scroll-auto",
          resolveScrollClasses(overflow),
        )}
      >
        <div
          ref={childrenContainerRef}
          className={cn(resolveContainerClasses(overflow), childrenContainerClassName)}
        >
          {children}
        </div>
      </section>
      {edgeAffordance === "fade" && <VerticalEdges edgeState={edgeState} overflow={overflow} />}
      {withButtons && (
        <>
          <ScrollerButton
            axis={resolvedButtonAxis}
            direction="previous"
            disabled={!hasPrevious}
            label={previousLabel}
            onClick={() => scrollToSibling("previous")}
          />
          <ScrollerButton
            axis={resolvedButtonAxis}
            direction="next"
            disabled={!hasNext}
            label={nextLabel}
            onClick={() => scrollToSibling("next")}
          />
        </>
      )}
    </div>
  );
}

Scroller.displayName = "Scroller";
