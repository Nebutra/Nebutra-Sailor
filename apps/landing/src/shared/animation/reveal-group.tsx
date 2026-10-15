"use client";

import {
  type ComponentPropsWithoutRef,
  type ElementType,
  type Ref,
  useLayoutEffect,
  useRef,
} from "react";

const REDUCED = "(prefers-reduced-motion: reduce)";

type RevealGroupProps<T extends ElementType> = {
  /** The element the group renders as (a list, a grid). Its direct children are the items. */
  as?: T;
} & Omit<ComponentPropsWithoutRef<T>, "as">;

/**
 * A group of like things — feature cells, plan cards, principles — that
 * arrives together, one stagger step apart, when it first scrolls into view
 * (`[data-reveal]` in app/landing-motion.css).
 *
 * The server HTML is the finished page: nothing is hidden until this runs, and
 * it only holds back a group the visitor has not reached yet, so content they
 * can already see never blinks out. An IntersectionObserver, not a scroll
 * listener and no scroll-linked timeline: no work at all while the page sits still,
 * and the observer is gone after the one reveal. Reduced motion: never runs.
 */
export function RevealGroup<T extends ElementType = "div">({ as, ...props }: RevealGroupProps<T>) {
  // Typed as a div for the ref; the element is whatever `as` names.
  const Tag = (as ?? "div") as "div";
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || window.matchMedia(REDUCED).matches) return;
    if (typeof IntersectionObserver === "undefined") return;
    // Already on screen (or above it): leave it exactly as painted.
    if (node.getBoundingClientRect().top < window.innerHeight) return;

    Array.from(node.children).forEach((child, i) => {
      (child as HTMLElement).style.setProperty("--i", String(i));
    });
    node.dataset.reveal = "pending";

    let settle: ReturnType<typeof setTimeout> | undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        node.dataset.reveal = "in";
        // Once the last item lands, drop the transition so it never colours
        // the items' own hover or focus states.
        settle = setTimeout(() => {
          node.dataset.reveal = "done";
        }, 1400);
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      clearTimeout(settle);
      delete node.dataset.reveal;
    };
  }, []);

  return <Tag ref={ref as Ref<HTMLDivElement>} {...props} />;
}
