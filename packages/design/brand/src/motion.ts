/**
 * Nebutra Brand Motion Language
 *
 * Three core motions derived from the "云端聚合" concept:
 * - emerge (涌现): data materializing from the cloud
 * - flow (流动): data streaming through pipelines
 * - pulse (脉动): system breathing / alive indicator
 */

// =============================================================================
// Easing Curves (Framer Motion compatible)
// =============================================================================

export const brandEasing = {
  /** Signature Nebutra ease — smooth deceleration with slight overshoot */
  brand: [0.16, 1, 0.3, 1] as const,
  /** For enter animations */
  enter: [0, 0, 0.2, 1] as const,
  /** For exit animations */
  exit: [0.4, 0, 1, 1] as const,
  /** Spring-like bounce */
  spring: [0.34, 1.56, 0.64, 1] as const,
} as const;

// =============================================================================
// Duration Bridge — Framer Motion needs seconds; CSS tokens hold ms.
//
// SSOT lives in @nebutra/design-tokens (core.json → duration.*). These
// constants mirror the four rails for JS callers (Framer transition props).
// If the SSOT changes, update here AND in @nebutra/tokens/styles.css.
// =============================================================================

/** Four-rail motion durations in seconds (Framer Motion `transition.duration`). */
export const motionDurationSec = {
  /** 100ms — micro-feedback */
  micro: 0.1,
  /** 200ms — state flow (default) */
  flow: 0.2,
  /** 300ms — content unveil */
  reveal: 0.3,
  /** 500ms — hero-grade cinematic */
  cinematic: 0.5,
} as const;

// =============================================================================
// Spring Presets (Framer Motion spring config)
// =============================================================================

export const brandSpring = {
  /** Default interactive spring */
  default: { type: "spring" as const, stiffness: 200, damping: 24, mass: 1 },
  /** Bouncy, playful spring */
  bouncy: { type: "spring" as const, stiffness: 300, damping: 15, mass: 0.8 },
  /** Heavy, deliberate spring */
  heavy: { type: "spring" as const, stiffness: 120, damping: 28, mass: 1.5 },
  /** Gentle reveal spring */
  gentle: { type: "spring" as const, stiffness: 80, damping: 20, mass: 1 },
} as const;

// =============================================================================
// Core Motion Signatures
// =============================================================================

/** 涌现 — data materializing from the cloud. Cinematic entrance rail. */
export const emerge = {
  initial: { opacity: 0, y: 16, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -8, filter: "blur(4px)" },
  transition: { duration: motionDurationSec.cinematic, ease: brandEasing.brand },
} as const;

/** 流动 — data streaming through pipelines. Reveal rail. */
export const flow = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
  transition: { duration: motionDurationSec.reveal, ease: brandEasing.enter },
} as const;

/** 脉动 — system breathing / alive */
export const pulse = {
  animate: { scale: [1, 1.015, 1], opacity: [1, 0.85, 1] },
  transition: { duration: 3, repeat: Infinity, ease: "easeInOut" },
} as const;

/** 漂浮 — gentle vertical drift for floating UI elements */
export const float = {
  animate: { y: [0, -8, 0] },
  transition: { duration: 4, repeat: Infinity, ease: "easeInOut" },
} as const;

// =============================================================================
// Composition Helpers
// =============================================================================

/** Stagger container for emerge animations */
export const stagger = (delayPerChild = 0.08) =>
  ({
    animate: { transition: { staggerChildren: delayPerChild } },
  }) as const;

/** Interactive micro-motions — flow rail for hover, micro rail for tap. */
export const interactive = {
  hover: {
    scale: 1.02,
    transition: { duration: motionDurationSec.flow, ease: brandEasing.brand },
  },
  tap: { scale: 0.98, transition: { duration: motionDurationSec.micro } },
  hoverLift: {
    y: -4,
    transition: { duration: motionDurationSec.flow, ease: brandEasing.brand },
  },
} as const;

/** Viewport trigger defaults */
export const viewport = {
  once: { once: true, margin: "-80px" as const },
  always: { once: false, margin: "-40px" as const },
} as const;

// =============================================================================
// Unified Export
// =============================================================================

export const brandMotion = {
  emerge,
  flow,
  pulse,
  float,
  stagger,
  interactive,
  viewport,
  brandEasing,
  brandSpring,
  motionDurationSec,
} as const;
