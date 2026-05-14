/**
 * Motion Token System — four-rail duration scale (2026-05-14 governance).
 *
 * SSOT: packages/design/design-tokens/tokens/core.json → duration.*
 *       Emitted to --duration-{micro,flow,reveal,cinematic} CSS vars
 *       (light/dark/themes) by Style Dictionary.
 *
 * Names denote INTENT, not relative speed:
 *   - micro      (100ms)  hover, focus, toggle, button press
 *   - flow       (200ms)  modal, dropdown, tab — default state transition
 *   - reveal     (300ms)  slide-in, expand, accordion, drawer
 *   - cinematic  (500ms)  landing hero, large delight moments
 *
 * CSS usage:  duration-micro / duration-flow / duration-reveal / duration-cinematic
 * JS usage:   motionDurations.flow / 1000  →  Framer Motion seconds
 *
 * @see packages/design/tokens/styles.css  @theme inline (runtime CSS vars)
 * @see @nebutra/brand → motionDurationSec (Framer-ready seconds bridge)
 */

import type { Transition, Variants } from "framer-motion";

export const motionDurations = {
  /** 100ms — micro-feedback (hover, focus, toggle, button press) */
  micro: 100,
  /** 200ms — state flow (modal, dropdown, tab — default) */
  flow: 200,
  /** 300ms — content unveil (slide, expand, accordion, drawer) */
  reveal: 300,
  /** 500ms — hero-grade cinematic (landing entrance, big delight) */
  cinematic: 500,
} as const;

/**
 * Easing functions as Framer Motion cubic-bezier arrays.
 *
 * CSS usage:  ease-in / ease-out / ease-in-out / ease-spring
 * JS usage:   easings.easeOut  →  Framer Motion ease array
 */
export const easings = {
  linear: "linear",
  easeIn: [0.4, 0, 1, 1] as [number, number, number, number],
  easeOut: [0, 0, 0.2, 1] as [number, number, number, number],
  easeInOut: [0.4, 0, 0.2, 1] as [number, number, number, number],
  spring: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
  bounce: [0.68, -0.6, 0.32, 1.6] as [number, number, number, number],
} as const;

/**
 * CSS variable references for inline styles.
 *
 * @example
 *   style={{ transitionTimingFunction: motionVars.easeOut,
 *            transitionDuration: motionVars.flow }}
 */
export const motionVars = {
  easeIn: "var(--ease-in)",
  easeOut: "var(--ease-out)",
  easeInOut: "var(--ease-in-out)",
  easeSpring: "var(--ease-spring)",
  micro: "var(--duration-micro)",
  flow: "var(--duration-flow)",
  reveal: "var(--duration-reveal)",
  cinematic: "var(--duration-cinematic)",
} as const;

/**
 * Standard Framer Motion transition presets — keyed by rail name.
 */
export const transitions: Record<string, Transition> = {
  micro: { duration: motionDurations.micro / 1000, ease: easings.easeOut },
  flow: { duration: motionDurations.flow / 1000, ease: easings.easeOut },
  reveal: { duration: motionDurations.reveal / 1000, ease: easings.easeOut },
  cinematic: { duration: motionDurations.cinematic / 1000, ease: easings.easeOut },
  spring: { type: "spring", stiffness: 120, damping: 18 },
};

/**
 * Generic animation variants — reusable across any component.
 */
export const motionVariants: Record<string, Variants> = {
  fadeInUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 10 },
  },
  fadeInLeft: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -10 },
  },
  fadeInRight: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 10 },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  },
  staggerContainer: {
    initial: {},
    animate: {
      transition: { staggerChildren: 0.1, delayChildren: 0.1 },
    },
  },
  staggerItem: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
  },
};

/**
 * Section-specific motion signatures for active landing page sections.
 */
export const sectionMotions: Record<string, Variants> = {
  // Hero: Slow reveal — establishes brand identity
  hero: {
    initial: { opacity: 0, y: 30, scale: 0.98 },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 1.2, ease: easings.spring },
    },
  },

  // FeatureCards: Stagger pop-in with spring — conveys capability
  featureStagger: {
    initial: { opacity: 0, y: 20, scale: 0.9 },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: "spring", stiffness: 260, damping: 20 },
    },
  },

  // FinalCTA: Pulse + glow loop — urgency and action
  ctaPulse: {
    initial: { scale: 1 },
    animate: {
      scale: [1, 1.02, 1],
      transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
    },
  },
};

/**
 * Stagger container variants with timing presets.
 */
export const staggerContainers: Record<"fast" | "normal" | "slow", Variants> = {
  fast: {
    initial: {},
    animate: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
  },
  normal: {
    initial: {},
    animate: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
  },
  slow: {
    initial: {},
    animate: { transition: { staggerChildren: 0.15, delayChildren: 0.3 } },
  },
};

/**
 * Interactive hover / tap micro-variants.
 */
export const interactiveVariants = {
  hover: { scale: 1.02 },
  tap: { scale: 0.98 },
  hoverLift: { y: -4 },
} as const;

/**
 * Viewport settings for scroll-triggered whileInView animations.
 */
export const viewportSettings = {
  once: { once: true, margin: "-100px" },
  always: { once: false, margin: "-50px" },
} as const;

/**
 * Helper — generate staggered delay for index-based children.
 *
 * @example
 *   <motion.div {...staggerDelay(index)}>
 */
export const staggerDelay = (index: number, base = 0.1) => ({
  transition: { delay: index * base },
});

export type MotionDuration = keyof typeof motionDurations;
export type Easing = keyof typeof easings;
export type MotionVar = keyof typeof motionVars;
