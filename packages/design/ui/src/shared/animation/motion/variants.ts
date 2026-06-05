import type { Variants } from "framer-motion";
import { animationDistances, animationTransitions } from "./tokens";

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: animationTransitions.standard },
  exit: { opacity: 0, transition: animationTransitions.micro },
};

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1, transition: animationTransitions.reveal },
  exit: { opacity: 0, scale: 0.98, transition: animationTransitions.micro },
};

export const slideIn = {
  up: {
    initial: { opacity: 0, y: animationDistances.md },
    animate: { opacity: 1, y: 0, transition: animationTransitions.reveal },
    exit: { opacity: 0, y: animationDistances.sm, transition: animationTransitions.micro },
  },
  down: {
    initial: { opacity: 0, y: -animationDistances.md },
    animate: { opacity: 1, y: 0, transition: animationTransitions.reveal },
    exit: { opacity: 0, y: -animationDistances.sm, transition: animationTransitions.micro },
  },
  left: {
    initial: { opacity: 0, x: animationDistances.md },
    animate: { opacity: 1, x: 0, transition: animationTransitions.reveal },
    exit: { opacity: 0, x: animationDistances.sm, transition: animationTransitions.micro },
  },
  right: {
    initial: { opacity: 0, x: -animationDistances.md },
    animate: { opacity: 1, x: 0, transition: animationTransitions.reveal },
    exit: { opacity: 0, x: -animationDistances.sm, transition: animationTransitions.micro },
  },
} as const satisfies Record<string, Variants>;

export const animatedList: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.06, delayChildren: 0.02 } },
  exit: { transition: { staggerChildren: 0.03, staggerDirection: -1 } },
};

export const animatedListItem: Variants = {
  initial: { opacity: 0, y: animationDistances.sm },
  animate: { opacity: 1, y: 0, transition: animationTransitions.standard },
  exit: { opacity: 0, y: animationDistances.xs, transition: animationTransitions.micro },
};

export const modalSurface: Variants = {
  initial: { opacity: 0, scale: 0.98, y: animationDistances.sm },
  animate: { opacity: 1, scale: 1, y: 0, transition: animationTransitions.panel },
  exit: {
    opacity: 0,
    scale: 0.98,
    y: animationDistances.xs,
    transition: animationTransitions.micro,
  },
};

export const drawerSurface = {
  left: {
    initial: { opacity: 0, x: "-100%" },
    animate: { opacity: 1, x: 0, transition: animationTransitions.panel },
    exit: { opacity: 0, x: "-100%", transition: animationTransitions.micro },
  },
  right: {
    initial: { opacity: 0, x: "100%" },
    animate: { opacity: 1, x: 0, transition: animationTransitions.panel },
    exit: { opacity: 0, x: "100%", transition: animationTransitions.micro },
  },
  top: {
    initial: { opacity: 0, y: "-100%" },
    animate: { opacity: 1, y: 0, transition: animationTransitions.panel },
    exit: { opacity: 0, y: "-100%", transition: animationTransitions.micro },
  },
  bottom: {
    initial: { opacity: 0, y: "100%" },
    animate: { opacity: 1, y: 0, transition: animationTransitions.panel },
    exit: { opacity: 0, y: "100%", transition: animationTransitions.micro },
  },
} as const satisfies Record<string, Variants>;

export const popoverSurface: Variants = {
  initial: { opacity: 0, scale: 0.98, y: animationDistances.xs },
  animate: { opacity: 1, scale: 1, y: 0, transition: animationTransitions.standard },
  exit: {
    opacity: 0,
    scale: 0.98,
    y: animationDistances.xs,
    transition: animationTransitions.micro,
  },
};

export const pageTransition: Variants = {
  initial: { opacity: 0, y: animationDistances.sm },
  animate: { opacity: 1, y: 0, transition: animationTransitions.page },
  exit: { opacity: 0, y: -animationDistances.xs, transition: animationTransitions.standard },
};

export const reducedMotionVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: animationTransitions.instant },
  exit: { opacity: 0, transition: animationTransitions.instant },
};
