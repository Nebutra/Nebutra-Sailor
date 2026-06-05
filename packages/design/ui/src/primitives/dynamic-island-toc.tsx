"use client";

import { brandSpring, motionDurationSec } from "@nebutra/brand";
import { Cross as X } from "@nebutra/icons";
import { type ReactElement, type RefObject, useEffect, useId, useRef, useState } from "react";
import {
  AnimatePresence,
  domAnimation,
  LazyMotion,
  m,
  useReducedMotion,
} from "../shared/animation/motion";
import { cn } from "../utils/cn";

type MotionTransition = NonNullable<React.ComponentProps<typeof m.div>["transition"]>;

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

const islandTween: MotionTransition = {
  type: "tween",
  ease: ISLAND_EASE,
  duration: motionDurationSec.cinematic, // 500ms — shape morph reads as cinematic
};

const PILL_W_CLOSED = 280; // minimum closed width; grows to fit the active title
const PILL_W_OPEN = 340;
const PILL_W_MAX = 560; // hard cap — a longer title ellipsizes instead of spanning the screen
const PILL_CHROME_W = 104; // status dot + flex gaps + horizontal padding + progress ring
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
  const valid: HeadingData[] = [];

  for (const [index, el] of elements.entries()) {
    if (el.hasAttribute("data-toc-ignore")) continue;

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
    valid.push({ id: el.id, text, level, element: el });
  }

  valid.sort((a, b) =>
    a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
  );
  return valid;
}

type TocBackdropProps = {
  isExpanded: boolean;
  onClose: () => void;
};

function TocBackdrop({ isExpanded, onClose }: TocBackdropProps) {
  return (
    <AnimatePresence>
      {isExpanded && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ ...islandTween, duration: motionDurationSec.flow }}
          className="pointer-events-auto fixed inset-0 -z-10 bg-foreground/20 backdrop-blur-[4px]"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
    </AnimatePresence>
  );
}

type TocClosedPillProps = {
  buttonRef: RefObject<HTMLButtonElement | null>;
  isExpanded: boolean;
  activeId: string | null;
  activeHeading: HeadingData | undefined;
  emptyLabel: string;
  ariaLabel: string;
  menuLabelId: string;
  progress: number;
  reduceMotion: boolean;
  onOpen: () => void;
};

function TocClosedPill({
  buttonRef,
  isExpanded,
  activeId,
  activeHeading,
  emptyLabel,
  ariaLabel,
  menuLabelId,
  progress,
  reduceMotion,
  onOpen,
}: TocClosedPillProps) {
  return (
    <m.button
      ref={buttonRef}
      type="button"
      aria-expanded={isExpanded}
      aria-controls={isExpanded ? menuLabelId : undefined}
      aria-label={activeHeading ? `Table of contents — current: ${activeHeading.text}` : ariaLabel}
      onClick={onOpen}
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
  );
}

type TocExpandedMenuProps = {
  isExpanded: boolean;
  ariaLabel: string;
  menuLabelId: string;
  menuHeading: string;
  headings: HeadingData[];
  activeId: string | null;
  hoveredId: string | null;
  minLevel: number;
  reduceMotion: boolean;
  firstMenuItemRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onHover: (id: string | null) => void;
  onJump: (heading: HeadingData) => void;
};

function TocExpandedMenu({
  isExpanded,
  ariaLabel,
  menuLabelId,
  menuHeading,
  headings,
  activeId,
  hoveredId,
  minLevel,
  reduceMotion,
  firstMenuItemRef,
  onClose,
  onHover,
  onJump,
}: TocExpandedMenuProps) {
  return (
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
          onClick={onClose}
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
          {headings.map((heading, index) => (
            <TocMenuItem
              key={heading.id}
              heading={heading}
              isActive={activeId === heading.id}
              isHovered={hoveredId === heading.id}
              paddingLeft={Math.max(0, heading.level - minLevel) * 14 + 12}
              ref={index === 0 ? firstMenuItemRef : undefined}
              reduceMotion={reduceMotion}
              onHover={onHover}
              onJump={onJump}
            />
          ))}
        </div>
      </div>
    </m.div>
  );
}

type TocMenuItemProps = {
  heading: HeadingData;
  isActive: boolean;
  isHovered: boolean;
  paddingLeft: number;
  reduceMotion: boolean;
  onHover: (id: string | null) => void;
  onJump: (heading: HeadingData) => void;
  ref?: RefObject<HTMLButtonElement | null> | undefined;
};

function TocMenuItem({
  heading,
  isActive,
  isHovered,
  paddingLeft,
  reduceMotion,
  onHover,
  onJump,
  ref,
}: TocMenuItemProps) {
  return (
    <button
      ref={ref}
      role="menuitem"
      type="button"
      aria-current={isActive ? "location" : undefined}
      onMouseEnter={() => onHover(heading.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(heading.id)}
      onBlur={() => onHover(null)}
      onClick={() => onJump(heading)}
      style={{ paddingLeft: `${paddingLeft}px` }}
      className={cn(
        "group flex w-full shrink-0 cursor-pointer items-center rounded-[var(--radius-lg)] border-none py-2 pr-3 text-left text-sm transition-[background-color,border-color,box-shadow,color,opacity,transform] duration-reveal ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40",
        isActive && "bg-foreground/10 font-medium text-foreground",
        !isActive && isHovered && "bg-foreground/5 text-foreground/85",
        !isActive && !isHovered && "bg-transparent text-foreground/45",
      )}
    >
      <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap transition-transform duration-reveal group-hover:translate-x-1 group-focus-visible:translate-x-1">
        {heading.text}
      </span>
      <m.span
        aria-hidden="true"
        initial={false}
        animate={{ scale: isActive ? 1 : 0, opacity: isActive ? 1 : 0 }}
        transition={
          reduceMotion ? { duration: 0 } : { duration: motionDurationSec.reveal, ease: "easeOut" }
        }
        className="ml-3 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground"
      />
    </button>
  );
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
  const [scrollState, setScrollState] = useState<{ activeId: string | null; progress: number }>({
    activeId: null,
    progress: 0,
  });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [pillWidths, setPillWidths] = useState({ closed: PILL_W_CLOSED, open: PILL_W_OPEN });

  const pillButtonRef = useRef<HTMLButtonElement | null>(null);
  const firstMenuItemRef = useRef<HTMLButtonElement | null>(null);
  const titleSizerRef = useRef<HTMLSpanElement | null>(null);

  // 1. DOM scan — immediate, with MutationObserver fallback for hydration races.
  useEffect(() => {
    let observer: MutationObserver | null = null;
    let disposed = false;
    const target = document.querySelector("main") ?? document.body;

    const applyScan = () => {
      if (disposed) return false;
      const next = scanHeadings(selector);
      setHeadings(next);
      return next.length > 0;
    };

    const scanFrame = window.requestAnimationFrame(() => {
      if (applyScan() || disposed) return;
      observer = new MutationObserver(() => {
        if (applyScan()) {
          observer?.disconnect();
          observer = null;
        }
      });
      observer.observe(target, { childList: true, subtree: true });
    });

    const stopAfter = window.setTimeout(() => {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    }, 3000);

    return () => {
      disposed = true;
      observer?.disconnect();
      window.cancelAnimationFrame(scanFrame);
      window.clearTimeout(stopAfter);
    };
  }, [selector]);

  // 2. Scroll spy + progress.
  useEffect(() => {
    if (headings.length === 0) return;

    const handleScroll = () => {
      let current: string | null = null;
      for (const h of headings) {
        const top = h.element.getBoundingClientRect().top;
        if (top <= SCROLL_SPY_OFFSET) current = h.id;
        else break;
      }

      const total = document.documentElement.scrollHeight - window.innerHeight;
      setScrollState({
        activeId: current ?? headings[0]?.id ?? null,
        progress: total > 0 ? Math.min(100, Math.max(0, (window.scrollY / total) * 100)) : 0,
      });
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

  const activeId = headings.length === 0 ? null : scrollState.activeId;
  const progress = headings.length === 0 ? 0 : scrollState.progress;
  const activeHeading = headings.find((h) => h.id === activeId);

  // Normalize indentation so the highest-level heading touches the left edge.
  const minLevel = headings.length === 0 ? 1 : Math.min(...headings.map((h) => h.level));

  // 5. Closed pill grows to fit the active title's natural width, clamped to a
  //    responsive max. A ResizeObserver on the off-screen sizer re-measures
  //    whenever the active title (and thus the sizer's width) changes — a
  //    discrete, smooth morph rather than continuous scroll jitter.
  useEffect(() => {
    const sizer = titleSizerRef.current;
    if (!sizer) return;
    const measure = () => {
      const textWidth = sizer.getBoundingClientRect().width;
      const maxClosed = Math.min(window.innerWidth - 32, PILL_W_MAX);
      const closed = Math.max(
        PILL_W_CLOSED,
        Math.min(maxClosed, Math.ceil(textWidth) + PILL_CHROME_W),
      );
      const open = Math.max(PILL_W_OPEN, closed);
      setPillWidths((prev) =>
        prev.closed === closed && prev.open === open ? prev : { closed, open },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(sizer);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  function handleJump(h: HeadingData) {
    const y = h.element.getBoundingClientRect().top + window.scrollY - SCROLL_TOP_OFFSET;
    window.scrollTo({ top: y, behavior: reduceMotion ? "auto" : "smooth" });
    setIsExpanded(false);
    pillButtonRef.current?.focus();
  }

  // Reduced-motion variants — opacity only, no shape morph.
  const pillAnimate = reduceMotion
    ? { opacity: 1 }
    : {
        width: isExpanded ? pillWidths.open : pillWidths.closed,
        height: isExpanded ? PILL_H_OPEN : PILL_H_CLOSED,
        borderRadius: isExpanded ? PILL_R_OPEN : PILL_R_CLOSED,
      };

  return (
    <LazyMotion features={domAnimation} strict>
      <nav
        aria-label={ariaLabel}
        className={cn(
          // No `transform` on this element. A transform here becomes the containing
          // block for the position:fixed backdrop below, which would clamp the
          // full-viewport scrim to this nav's shrink-wrapped (pill-sized) box — the
          // scrim then sits directly behind the card and leaks gray triangles through
          // its rounded corners. Center the pill with a full-width flex row instead.
          // The nav is click-transparent so its full-width bottom strip never swallows
          // page clicks; the backdrop and pill opt back into pointer events.
          "pointer-events-none fixed inset-x-0 bottom-[30px] z-[var(--z-overlay,9999)] flex flex-col items-center",
          className,
        )}
      >
        <TocBackdrop isExpanded={isExpanded} onClose={() => setIsExpanded(false)} />

        {/* Off-screen sizer — measures the active title's natural width so the closed
            pill can grow to fit it. Mirrors the visible label's typography exactly. */}
        <span
          ref={titleSizerRef}
          aria-hidden="true"
          className="pointer-events-none invisible fixed left-0 top-0 -z-[1] whitespace-nowrap text-sm font-medium"
        >
          {activeHeading?.text || emptyLabel}
        </span>

        {/* Pill entrance + morph wrapper */}
        <m.div
          className="pointer-events-auto"
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
            <TocClosedPill
              buttonRef={pillButtonRef}
              isExpanded={isExpanded}
              activeId={activeId}
              activeHeading={activeHeading}
              emptyLabel={emptyLabel}
              ariaLabel={ariaLabel}
              menuLabelId={menuLabelId}
              progress={progress}
              reduceMotion={reduceMotion}
              onOpen={() => setIsExpanded(true)}
            />
            <TocExpandedMenu
              isExpanded={isExpanded}
              ariaLabel={ariaLabel}
              menuLabelId={menuLabelId}
              menuHeading={menuHeading}
              headings={headings}
              activeId={activeId}
              hoveredId={hoveredId}
              minLevel={minLevel}
              reduceMotion={reduceMotion}
              firstMenuItemRef={firstMenuItemRef}
              onClose={() => {
                setIsExpanded(false);
                pillButtonRef.current?.focus();
              }}
              onHover={setHoveredId}
              onJump={handleJump}
            />
          </m.div>
        </m.div>
      </nav>
    </LazyMotion>
  );
}
