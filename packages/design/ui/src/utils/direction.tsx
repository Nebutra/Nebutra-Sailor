"use client";

import { DirectionProvider, useDirection } from "@base-ui/react/direction-provider";
import * as React from "react";

export type TextDirection = "ltr" | "rtl";

/**
 * Reading direction in effect at `element`: the nearest `dir="ltr|rtl"` attribute on the element
 * or an ancestor (`dir="auto"` is skipped), then `inherited` when it is `"rtl"` (a Base UI
 * `DirectionProvider` around the element), then the computed `direction`, then `"ltr"`.
 * Base UI only mirrors arrow keys from its `DirectionProvider`, never from the DOM, so this is the
 * bridge between `<div dir="rtl">` and that context.
 */
export function readElementDirection(
  element: Element | null | undefined,
  inherited: TextDirection = "ltr",
): TextDirection {
  if (!element) return inherited;
  for (let node: Element | null = element; node; node = node.parentElement) {
    const attribute = node.getAttribute("dir")?.toLowerCase();
    if (attribute === "rtl" || attribute === "ltr") return attribute;
  }
  if (inherited === "rtl") return inherited;
  const view = element.ownerDocument.defaultView;
  return view?.getComputedStyle(element).direction === "rtl" ? "rtl" : "ltr";
}

/**
 * Tracks the reading direction around the element held by `ref`. It re-reads after every commit,
 * so a `dir` change that re-renders the tree is picked up; the first (server) render is
 * `inherited`, which defaults to `"ltr"`.
 */
export function useResolvedDirection(
  ref: React.RefObject<Element | null>,
  inherited: TextDirection = "ltr",
): TextDirection {
  const [direction, setDirection] = React.useState<TextDirection>(inherited);
  React.useLayoutEffect(() => {
    setDirection(readElementDirection(ref.current, inherited));
  });
  return direction;
}

/**
 * Direction for a popup that portals out of its trigger's subtree (Tooltip, Popover, Select).
 * Attach `triggerRef` to the trigger; `direction` is the explicit `dirProp`, else the `dir` around
 * the trigger, else the nearest Base UI `DirectionProvider`. Hand `direction` to
 * `BaseDirectionScope` (so `inline-start` / `inline-end` resolve) and to the Positioner's `dir`
 * (so `align` resolves and the popup content is laid out in the right direction).
 */
export function useTriggerDirection(dirProp?: TextDirection): {
  triggerRef: React.RefCallback<Element>;
  direction: TextDirection;
} {
  const elementRef = React.useRef<Element | null>(null);
  const triggerRef = React.useCallback((node: Element | null) => {
    elementRef.current = node;
  }, []);
  const inherited = useDirection();
  const measured = useResolvedDirection(elementRef, inherited);
  return { triggerRef, direction: dirProp ?? measured };
}

/** Combines several refs (callback or object) into one callback ref. */
export function mergeRefs<T>(...refs: Array<React.Ref<T> | undefined>): React.RefCallback<T> {
  return (node) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.RefObject<T | null>).current = node;
    }
  };
}

/** Feeds the measured direction to Base UI parts below it (keyboard and slider math). */
export function BaseDirectionScope({
  direction,
  children,
}: {
  direction: TextDirection;
  children: React.ReactNode;
}) {
  return <DirectionProvider direction={direction}>{children}</DirectionProvider>;
}
