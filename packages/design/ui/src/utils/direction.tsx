"use client";

import { DirectionProvider } from "@base-ui/react/direction-provider";
import * as React from "react";

export type TextDirection = "ltr" | "rtl";

/**
 * Reading direction in effect at `element`: the nearest `dir="ltr|rtl"` attribute on the element
 * or an ancestor (`dir="auto"` is skipped), then the computed `direction`, then `"ltr"`.
 * Base UI only mirrors arrow keys from its `DirectionProvider`, never from the DOM, so this is the
 * bridge between `<div dir="rtl">` and that context.
 */
export function readElementDirection(element: Element | null | undefined): TextDirection {
  if (!element) return "ltr";
  for (let node: Element | null = element; node; node = node.parentElement) {
    const attribute = node.getAttribute("dir")?.toLowerCase();
    if (attribute === "rtl" || attribute === "ltr") return attribute;
  }
  const view = element.ownerDocument.defaultView;
  return view?.getComputedStyle(element).direction === "rtl" ? "rtl" : "ltr";
}

/**
 * Tracks the reading direction around the element held by `ref`. It re-reads after every commit,
 * so a `dir` change that re-renders the tree is picked up; the first server render is `"ltr"`.
 */
export function useResolvedDirection(ref: React.RefObject<Element | null>): TextDirection {
  const [direction, setDirection] = React.useState<TextDirection>("ltr");
  React.useLayoutEffect(() => {
    setDirection(readElementDirection(ref.current));
  });
  return direction;
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
