"use client";

import { brandSpring, motionDurationSec } from "@nebutra/brand";
import { Cross as X } from "@nebutra/icons";
import {
  AnimatePresence,
  domAnimation,
  LazyMotion,
  m,
  type Transition,
  useReducedMotion,
} from "framer-motion";
import { type ReactElement, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "../utils/cn";

/* -------------------------------------------------------------------------- *\
 *  DynamicIslandTOC — Apple-style bottom-center pill that expands into a
 *  scroll-spy Table of Contents. Self-contained scanner with MutationObserver-
 *  backed hydration tolerance.
 *
 *  Motion ID: this component carries a non-brand easing curve
 *  ([0.22, 1, 0.36, 1]) on PURPOSE — it is the Dynamic Island signature feel
 *  and ships as part of the component's visual identity. All *durations* are
 *  still tokenized through @nebutra/brand/motionDurationSec.
 *
 *  a11y contract:
 *    - <nav role + aria-label> wrapper
 *    - <button aria-expanded> for the pill
 *    - aria-current="location" on the active item
 *    - Escape closes; focus returns to the pill
 *    - prefers-reduced-motion collapses shape morphing to opacity only
 *
 *  DOM scan strategy:
 *    1. immediate query
 *    2. if empty, MutationObserver watches <main> for 3s, re-scans on first hit
 *    3. setHeadings is debounced to a single batch per microtask
\* -------------------------------------------------------------------------- */

const ISLAND_EASE = [0.22, 1, 0.36, 1] as const;

const islandTween: Transition = {
  type: "tween",
  ease: ISLAND_EASE,
  duration: motionDurationSec.cinematic, // 500ms — shape morph reads as cinematic
};

const PILL_W_CLOSED = 280;
const PILL_W_OPEN = 340;
const PILL_H_CLOSED = 52;
const PILL_H_OPEN = 400;
const PILL_R_CLOSED = 26;
const PILL_R_OPEN = 24;
const SCROLL_TOP_OFFSET = 80;
const SCROLL_SPY_OFFSET = 120;

// --- Types ---

type HeadingData = {
  id: string;
  text: string;
  level: number;
  element: HTMLElement;
};

export type DynamicIslandTOCProps = {
  /**
   * CSS selector to find headings.
   * Defaults to common blog content wrappers and explicit [data-toc] elements.
   */
  selector?: string;
  /**
   * Accessible label for the navigation landmark.
   * @default "Table of contents"
   */
  ariaLabel?: string;
  /**
   * Visible header text for the expanded menu.
   * @default "TABLE OF CONTENTS"
   */
  menuHeading?: string;
  /**
   * Label shown in the closed pill when no heading is yet active.
   * @default "Contents"
   */
  emptyLabel?: string;
  /**
   * Optional className for the outer fixed wrapper.
   */
  className?: string;
};

const DEFAULT_SELECTOR =
  "article h1, article h2, article h3, article h4, .prose h1, .prose h2, .prose h3, .prose h4, [data-toc]";

// --- Progress Circle ---

type CircleProgressProps = { percentage: number; reduceMotion: boolean };

function CircleProgress({ percentage, reduceMotion }: CircleProgressProps) {
  const size = 24;
  const strokeWidth = 2.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width={size} height={size} className="-rotate-90 shrink-0" aria-hidden="true">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--muted)"
        strokeWidth={strokeWidth}
      />
      <m.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--foreground)"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        initial={false}
        animate={{ strokeDashoffset: offset }}
        transition={
          reduceMotion ? { duration: 0 } : { duration: motionDurationSec.micro, ease: "easeOut" }
        }
        strokeLinecap="round"
      />
    </svg>
  );
}

// --- DOM scan helpers ---

function scanHeadings(selector: string): HeadingData[] {
  const elements = Array.from(document.querySelectorAll(selector)) as HTMLElement[];

  const valid = elements
    .filter((el) => !el.hasAttribute("data-toc-ignore"))
    .map((el, index) => {
      if (!el.id) {
        const slug =
          el.textContent
            ?.toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^\w-]/g, "") || `toc-heading-${index}`;
        el.id = slug;
      }

      const depthAttr = el.getAttribute("data-toc-depth");
      let level = 2;
      if (depthAttr) {
        const parsed = Number.parseInt(depthAttr, 10);
        if (!Number.isNaN(parsed)) level = parsed;
      } else {
        const tag = el.tagName.toUpperCase();
        if (tag.length === 2 && tag.startsWith("H")) {
          const parsed = Number.parseInt(tag[1] ?? "", 10);
          if (!Number.isNaN(parsed)) level = parsed;
        }
      }

      const text = el.getAttribute("data-toc-title") || el.textContent || "Section";
      return { id: el.id, text, level, element: el };
    });

  valid.sort((a, b) =>
    a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
  );
  return valid;
}

// --- Main Component ---

export function DynamicIslandTOC({
  selector = DEFAULT_SELECTOR,
  ariaLabel = "Table of contents",
  menuHeading = "TABLE OF CONTENTS",
  emptyLabel = "Contents",
  className,
}: DynamicIslandTOCProps): ReactElement {
  const reduceMotion = useReducedMotion() ?? false;
  const menuLabelId = useId();

  const [headings, setHeadings] = useState<HeadingData[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [progress, setProgress] = useState(0);

  const pillButtonRef = useRef<HTMLButtonElement | null>(null);
  const firstMenuItemRef = useRef<HTMLButtonElement | null>(null);

  // 1. DOM scan — immediate, with MutationObserver fallback for hydration races.
  useEffect(() => {
    const immediate = scanHeadings(selector);
    if (immediate.length > 0) {
      setHeadings(immediate);
      return;
    }

    setHeadings([]);
    const target = document.querySelector("main") ?? document.body;
    const observer = new MutationObserver(() => {
      const next = scanHeadings(selector);
      if (next.length > 0) {
        setHeadings(next);
        observer.disconnect();
      }
    });
    observer.observe(target, { childList: true, subtree: true });

    const stopAfter = window.setTimeout(() => observer.disconnect(), 3000);
    return () => {
      observer.disconnect();
      window.clearTimeout(stopAfter);
    };
  }, [selector]);

  // 2. Scroll spy + progress.
  useEffect(() => {
    if (headings.length === 0) {
      setActiveId(null);
      setProgress(0);
      return;
    }

    const handleScroll = () => {
      let current: string | null = null;
      for (const h of headings) {
        const top = h.element.getBoundingClientRect().top;
        if (top <= SCROLL_SPY_OFFSET) current = h.id;
        else break;
      }
      setActiveId(current ?? headings[0]?.id ?? null);

      const total = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(total > 0 ? Math.min(100, Math.max(0, (window.scrollY / total) * 100)) : 0);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [headings]);

  // 3. Esc to close + focus return.
  useEffect(() => {
    if (!isExpanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setIsExpanded(false);
        pillButtonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isExpanded]);

  // 4. Focus first item when expanded.
  useEffect(() => {
    if (isExpanded && firstMenuItemRef.current) {
      firstMenuItemRef.current.focus();
    }
  }, [isExpanded]);

  const activeHeading = headings.find((h) => h.id === activeId);

  // Normalize indentation so the highest-level heading touches the left edge.
  const minLevel = useMemo(() => {
    if (headings.length === 0) return 1;
    return Math.min(...headings.map((h) => h.level));
  }, [headings]);

  const handleJump = useCallback(
    (h: HeadingData) => {
      const y = h.element.getBoundingClientRect().top + window.scrollY - SCROLL_TOP_OFFSET;
      window.scrollTo({ top: y, behavior: reduceMotion ? "auto" : "smooth" });
      setIsExpanded(false);
      pillButtonRef.current?.focus();
    },
    [reduceMotion],
  );

  // Reduced-motion variants — opacity only, no shape morph.
  const pillAnimate = reduceMotion
    ? { opacity: 1 }
    : {
        width: isExpanded ? PILL_W_OPEN : PILL_W_CLOSED,
        height: isExpanded ? PILL_H_OPEN : PILL_H_CLOSED,
        borderRadius: isExpanded ? PILL_R_OPEN : PILL_R_CLOSED,
      };

  return (
    <LazyMotion features={domAnimation} strict>
      <nav
        aria-label={ariaLabel}
        className={cn(
          "fixed bottom-[30px] left-1/2 z-[var(--z-overlay,9999)] flex -translate-x-1/2 flex-col items-center",
          className,
        )}
      >
        {/* Backdrop */}
        <AnimatePresence>
          {isExpanded && (
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ ...islandTween, duration: motionDurationSec.flow }}
              className="fixed inset-0 -z-10 bg-foreground/20 backdrop-blur-[4px]"
              onClick={() => setIsExpanded(false)}
              aria-hidden="true"
            />
          )}
        </AnimatePresence>

        {/* Pill entrance + morph wrapper */}
        <m.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={reduceMotion ? { duration: 0 } : brandSpring.default}
        >
          <m.div
            initial={false}
            animate={pillAnimate}
            transition={reduceMotion ? { duration: 0 } : islandTween}
            className="relative overflow-hidden border border-foreground/10 bg-background text-foreground shadow-2xl"
          >
            {/* CLOSED state — pill button */}
            <m.button
              ref={pillButtonRef}
              type="button"
              aria-expanded={isExpanded}
              aria-controls={isExpanded ? menuLabelId : undefined}
              aria-label={
                activeHeading ? `Table of contents — current: ${activeHeading.text}` : ariaLabel
              }
              onClick={() => setIsExpanded(true)}
              initial={false}
              animate={
                reduceMotion
                  ? { opacity: isExpanded ? 0 : 1 }
                  : {
                      opacity: isExpanded ? 0 : 1,
                      scale: isExpanded ? 0.95 : 1,
                      filter: isExpanded ? "blur(4px)" : "blur(0px)",
                    }
              }
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { ...islandTween, delay: isExpanded ? 0 : motionDurationSec.micro }
              }
              className={cn(
                "absolute inset-0 flex w-full items-center gap-4 border-0 bg-transparent px-4 text-left text-foreground outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 sm:px-5",
                isExpanded && "pointer-events-none",
              )}
            >
              <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-foreground" />
              <span className="relative flex h-full flex-1 items-center overflow-hidden">
                <AnimatePresence mode="popLayout" initial={false}>
                  <m.span
                    key={activeId || "empty"}
                    initial={reduceMotion ? false : { opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -15 }}
                    transition={{
                      duration: reduceMotion ? 0 : motionDurationSec.reveal,
                      ease: ISLAND_EASE,
                    }}
                    className="block w-full overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium text-foreground"
                  >
                    {activeHeading?.text || emptyLabel}
                  </m.span>
                </AnimatePresence>
              </span>
              <CircleProgress percentage={progress} reduceMotion={reduceMotion} />
            </m.button>

            {/* EXPANDED state — menu */}
            <m.div
              role="menu"
              id={menuLabelId}
              aria-label={ariaLabel}
              initial={false}
              animate={{
                opacity: isExpanded ? 1 : 0,
                scale: reduceMotion ? 1 : isExpanded ? 1 : 1.05,
              }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { ...islandTween, delay: isExpanded ? motionDurationSec.micro : 0 }
              }
              className={cn("absolute inset-0 flex flex-col", !isExpanded && "pointer-events-none")}
            >
              <div className="flex shrink-0 items-center justify-between px-6 pb-3 pt-5">
                <span className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground">
                  {menuHeading}
                </span>
                <button
                  type="button"
                  aria-label="Close table of contents"
                  onClick={() => {
                    setIsExpanded(false);
                    pillButtonRef.current?.focus();
                  }}
                  className="text-muted-foreground transition-colors duration-micro hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              <div
                className="flex-1 overflow-y-auto overscroll-contain px-3 pb-4"
                data-lenis-prevent="true"
              >
                <div className="flex flex-col gap-0.5">
                  {headings.map((h, i) => {
                    const isActive = activeId === h.id;
                    const isHovered = hoveredId === h.id;
                    const indent = Math.max(0, h.level - minLevel);
                    const paddingLeft = indent * 14 + 12;

                    return (
                      <button
                        key={h.id}
                        ref={i === 0 ? firstMenuItemRef : undefined}
                        role="menuitem"
                        type="button"
                        aria-current={isActive ? "location" : undefined}
                        onMouseEnter={() => setHoveredId(h.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        onFocus={() => setHoveredId(h.id)}
                        onBlur={() => setHoveredId(null)}
                        onClick={() => handleJump(h)}
                        style={{ paddingLeft: `${paddingLeft}px` }}
                        className={cn(
                          "group flex w-full shrink-0 cursor-pointer items-center rounded-lg border-none py-2 pr-3 text-left text-sm transition-all duration-reveal ease-out",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40",
                          isActive && "bg-foreground/10 font-medium text-foreground",
                          !isActive && isHovered && "bg-foreground/5 text-foreground/85",
                          !isActive && !isHovered && "bg-transparent text-foreground/45",
                        )}
                      >
                        <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap transition-transform duration-reveal group-hover:translate-x-1 group-focus-visible:translate-x-1">
                          {h.text}
                        </span>
                        <m.span
                          aria-hidden="true"
                          initial={false}
                          animate={{ scale: isActive ? 1 : 0, opacity: isActive ? 1 : 0 }}
                          transition={
                            reduceMotion
                              ? { duration: 0 }
                              : { duration: motionDurationSec.reveal, ease: "easeOut" }
                          }
                          className="ml-3 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            </m.div>
          </m.div>
        </m.div>
      </nav>
    </LazyMotion>
  );
}
