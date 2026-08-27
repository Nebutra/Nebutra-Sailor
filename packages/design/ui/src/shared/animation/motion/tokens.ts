import type { Transition } from "framer-motion";

export const animationDurations = {
  instant: 0,
  micro: 0.1,
  fast: 0.16,
  standard: 0.2,
  reveal: 0.3,
  page: 0.44,
} as const;

export const animationEasings = {
  linear: "linear",
  enter: [0, 0, 0.2, 1] as [number, number, number, number],
  exit: [0.4, 0, 1, 1] as [number, number, number, number],
  standard: [0.4, 0, 0.2, 1] as [number, number, number, number],
  emphasized: [0.16, 1, 0.3, 1] as [number, number, number, number],
} as const;

export const animationSprings = {
  interactive: { type: "spring", stiffness: 380, damping: 34, mass: 0.8 },
  layout: { type: "spring", stiffness: 480, damping: 42, mass: 1 },
  panel: { type: "spring", stiffness: 320, damping: 36, mass: 1 },
} as const satisfies Record<string, Transition>;

export const animationDistances = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  panel: 32,
} as const;

export const animationTransitions = {
  instant: { duration: animationDurations.instant },
  micro: { duration: animationDurations.micro, ease: animationEasings.enter },
  standard: { duration: animationDurations.standard, ease: animationEasings.enter },
  reveal: { duration: animationDurations.reveal, ease: animationEasings.emphasized },
  page: { duration: animationDurations.page, ease: animationEasings.emphasized },
  layout: animationSprings.layout,
  panel: animationSprings.panel,
} as const satisfies Record<string, Transition>;

export type AnimationDuration = keyof typeof animationDurations;
export type AnimationTransition = keyof typeof animationTransitions;
