"use client";

import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "@nebutra/icons";
import * as React from "react";
import { scrollerTokens } from "../tokens/components/scroller";
import { cn } from "../utils/cn";

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

type EdgeState = {
  left: boolean;
  right: boolean;
  top: boolean;
  bottom: boolean;
};

export interface ScrollerProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "style"> {
  children?: React.ReactNode;
  /** Scroll axis. Use "both" only when content genuinely overflows in two dimensions. */
  overflow?: ScrollerOverflow;
  /** Outer width. Numbers resolve to px. */
  width?: ScrollerSize;
  /** Outer height. Numbers resolve to px. */
  height?: ScrollerSize;
  /** Class applied to the direct-child container inside the scroll viewport. */
  childrenContainerClassName?: string;
  /** Render directional buttons that scroll to the next direct child. */
  withButtons?: boolean;
  /** Axis used by directional buttons. Defaults to x for horizontal, y otherwise. */
  buttonAxis?: ScrollerButtonAxis;
  /** Accessible noun used by the viewport and generated button labels. */
  contentLabel?: string;
  previousButtonLabel?: string;
  nextButtonLabel?: string;
  edgeAffordance?: ScrollerEdgeAffordance;
  scrollBehavior?: ScrollBehavior;
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

function getChildPosition(child: HTMLElement, axis: ScrollerButtonAxis) {
  return axis === "x" ? child.offsetLeft : child.offsetTop;
}

function getScrollPosition(viewport: HTMLDivElement, axis: ScrollerButtonAxis) {
  return axis === "x" ? viewport.scrollLeft : viewport.scrollTop;
}

function getEdgeState(viewport: HTMLDivElement): EdgeState {
  const threshold = 1;
  const maxX = viewport.scrollWidth - viewport.clientWidth;
  const maxY = viewport.scrollHeight - viewport.clientHeight;

  return {
    left: viewport.scrollLeft > threshold,
    right: viewport.scrollLeft < maxX - threshold,
    top: viewport.scrollTop > threshold,
    bottom: viewport.scrollTop < maxY - threshold,
  };
}

function findTargetChild(
  children: readonly HTMLElement[],
  viewport: HTMLDivElement,
  axis: ScrollerButtonAxis,
  direction: "previous" | "next",
) {
  if (children.length === 0) return undefined;

  const threshold = 2;
  const currentPosition = getScrollPosition(viewport, axis);
  const sortedChildren = [...children].sort(
    (a, b) => getChildPosition(a, axis) - getChildPosition(b, axis),
  );

  if (direction === "next") {
    return (
      sortedChildren.find((child) => getChildPosition(child, axis) > currentPosition + threshold) ??
      sortedChildren.at(-1)
    );
  }

  for (let index = sortedChildren.length - 1; index >= 0; index -= 1) {
    const child = sortedChildren[index];
    if (child && getChildPosition(child, axis) < currentPosition - threshold) {
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
}: {
  child: HTMLElement;
  viewport: HTMLDivElement;
  axis: ScrollerButtonAxis;
  behavior: ScrollBehavior;
}) {
  const position = getChildPosition(child, axis);
  viewport.scrollTo({
    left: axis === "x" ? position : viewport.scrollLeft,
    top: axis === "y" ? position : viewport.scrollTop,
    behavior,
  });
}

function edgeClasses(overflow: ScrollerOverflow, edgeState: EdgeState) {
  return [
    (overflow === "x" || overflow === "both") &&
      edgeState.left &&
      "before:absolute before:inset-y-0 before:left-0 before:z-10 before:w-[var(--scroller-fade-size)] before:pointer-events-none before:bg-gradient-to-r before:from-background before:to-transparent",
    (overflow === "x" || overflow === "both") &&
      edgeState.right &&
      "after:absolute after:inset-y-0 after:right-0 after:z-10 after:w-[var(--scroller-fade-size)] after:pointer-events-none after:bg-gradient-to-l after:from-background after:to-transparent",
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
        "hover:border-ring hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-0 motion-reduce:transition-none",
        axis === "x" &&
          direction === "previous" &&
          "left-[var(--scroller-button-offset)] top-1/2 -translate-y-1/2",
        axis === "x" &&
          direction === "next" &&
          "right-[var(--scroller-button-offset)] top-1/2 -translate-y-1/2",
        axis === "y" &&
          direction === "previous" &&
          "left-1/2 top-[var(--scroller-button-offset)] -translate-x-1/2",
        axis === "y" &&
          direction === "next" &&
          "bottom-[var(--scroller-button-offset)] left-1/2 -translate-x-1/2",
      )}
    >
      <Icon aria-hidden="true" className="size-[var(--scroller-button-icon-size)]" />
    </button>
  );
}

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
    left: false,
    right: false,
    top: false,
    bottom: false,
  });
  const resolvedButtonAxis = resolveButtonAxis(overflow, buttonAxis);

  const updateEdgeState = React.useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    setEdgeState(getEdgeState(viewport));
  }, []);

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
    (direction: "previous" | "next") => {
      const viewport = viewportRef.current;
      if (!viewport) return;

      const directChildren = getDirectChildElements(childrenContainerRef.current);
      const targetChild = findTargetChild(directChildren, viewport, resolvedButtonAxis, direction);
      if (!targetChild) return;

      scrollToChild({
        child: targetChild,
        viewport,
        axis: resolvedButtonAxis,
        behavior: scrollBehavior,
      });
    },
    [resolvedButtonAxis, scrollBehavior],
  );

  const hasPrevious = resolvedButtonAxis === "x" ? edgeState.left : edgeState.top;
  const hasNext = resolvedButtonAxis === "x" ? edgeState.right : edgeState.bottom;
  const previousLabel =
    previousButtonLabel ?? `Scroll ${contentLabel} ${resolvedButtonAxis === "x" ? "left" : "up"}`;
  const nextLabel =
    nextButtonLabel ?? `Scroll ${contentLabel} ${resolvedButtonAxis === "x" ? "right" : "down"}`;

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
          "h-[var(--scroller-height)] rounded-[var(--scroller-radius)] outline-none",
          "scroll-smooth overscroll-contain focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:scroll-auto",
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
