"use client";

import { brandSpring, emerge, flow } from "@nebutra/brand";
import type * as React from "react";
import {
  AnimatePresence,
  domAnimation,
  LazyMotion,
  m,
  useReducedMotion as useFramerReducedMotion,
} from "../shared/animation/motion";
import {
  motionDurations,
  motionVariants,
  staggerContainers,
  viewportSettings,
} from "../tokens/motion";

// ─────────────────────────────────────────────────────────────
// Fallback variant for `fadeIn` (not present in motionVariants)
// ─────────────────────────────────────────────────────────────

const fadeInVariant = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.3 },
} as const;

// ─────────────────────────────────────────────────────────────
// Variant presets
// ─────────────────────────────────────────────────────────────

const PRESETS = {
  /** 涌现 — materialize from the cloud (default) */
  emerge: {
    initial: emerge.initial,
    animate: emerge.animate,
    exit: emerge.exit,
    transition: emerge.transition,
  },
  /** 流动 — stream horizontally */
  flow: {
    initial: flow.initial,
    animate: flow.animate,
    exit: flow.exit,
    transition: flow.transition,
  },
  /** Simple fade */
  fade: fadeInVariant,
  /** Fade + rise */
  fadeUp: motionVariants.fadeInUp,
  /** Scale in */
  scale: motionVariants.scaleIn,
  /**
   * Keyed content swap — short, symmetric, blur-softened. Rises in, sinks out.
   * Shorter and shallower than `emerge` on purpose: a swap replaces content the
   * reader is already looking at, so it must resolve inside the reveal rail.
   * Pair with `AnimateSwap`.
   */
  swap: {
    initial: { opacity: 0, y: 10, filter: "blur(4px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    exit: { opacity: 0, y: -10, filter: "blur(4px)" },
    transition: { duration: motionDurations.reveal / 1000 },
  },
  /** Off-canvas panel entering from the right edge (drawer, sheet). */
  slideFromRight: {
    initial: { x: "100%" },
    animate: { x: 0 },
    exit: { x: "100%" },
    transition: brandSpring.default,
  },
  /** Off-canvas panel entering from the left edge. */
  slideFromLeft: {
    initial: { x: "-100%" },
    animate: { x: 0 },
    exit: { x: "-100%" },
    transition: brandSpring.default,
  },
  /** Off-canvas panel entering from the top edge (banner, command bar). */
  slideFromTop: {
    initial: { y: "-100%" },
    animate: { y: 0 },
    exit: { y: "-100%" },
    transition: brandSpring.default,
  },
  /** Off-canvas panel entering from the bottom edge (mobile action sheet). */
  slideFromBottom: {
    initial: { y: "100%" },
    animate: { y: 0 },
    exit: { y: "100%" },
    transition: brandSpring.default,
  },
} as const;

type Preset = keyof typeof PRESETS;

/**
 * DOM attributes forwarded to the underlying element.
 *
 * Without this, anything needing `role`, `aria-*`, `onClick` or `onKeyDown` —
 * every dialog, drawer and tabpanel — has to drop out of `AnimateIn` and
 * hand-roll its own `m.div`, which is how reduced-motion branching and raw
 * duration numbers keep reappearing at call sites.
 *
 * The four drag/animation handlers are omitted because framer-motion redefines
 * them with incompatible signatures. `style` is omitted because framer's
 * `MotionStyle` rejects `undefined` under `exactOptionalPropertyTypes`, and an
 * animated element's static styling belongs in `className` anyway.
 */
type ForwardedDivProps = Omit<
  React.ComponentPropsWithoutRef<"div">,
  "children" | "className" | "style" | "onAnimationStart" | "onDrag" | "onDragStart" | "onDragEnd"
>;

type MotionDivProps = React.ComponentProps<typeof m.div>;
type MotionInitial = NonNullable<MotionDivProps["initial"]>;
type MotionAnimate = NonNullable<MotionDivProps["whileInView"]>;
type MotionExit = NonNullable<MotionDivProps["exit"]>;
type MotionTransition = NonNullable<MotionDivProps["transition"]>;

function MotionDiv(props: MotionDivProps) {
  return (
    <LazyMotion features={domAnimation}>
      <m.div {...props} />
    </LazyMotion>
  );
}

// ─────────────────────────────────────────────────────────────
// AnimateIn
// ─────────────────────────────────────────────────────────────

export interface AnimateInProps extends ForwardedDivProps {
  /** Optional: a purely decorative animated surface (a backdrop) has no content. */
  children?: React.ReactNode;
  preset?: Preset;
  delay?: number;
  duration?: number;
  /** Trigger when enters viewport instead of immediately */
  inView?: boolean;
  className?: string;
}

/**
 * AnimateIn — wraps any content in a branded entrance animation.
 *
 * Respects `prefers-reduced-motion` by fading only (no translate/blur).
 *
 * @example
 * <AnimateIn preset="emerge" delay={0.1}>
 *   <Card>...</Card>
 * </AnimateIn>
 */
// NOTE: parameter-level destructuring loses optionality during dist .js emit —
// Next.js build then mis-infers optional props as required `any`. Use the
// `props: AnimateInProps` form and destructure inside.
export function AnimateIn(props: AnimateInProps) {
  const {
    children,
    preset = "emerge",
    delay = 0,
    duration,
    inView = false,
    className,
    ...rest
  } = props;
  const shouldReduce = useFramerReducedMotion();
  const base = PRESETS[preset] || PRESETS.emerge;

  // Accessibility: honour prefers-reduced-motion
  const initial = (shouldReduce ? { opacity: 0 } : base.initial) as MotionInitial;
  const animate = (shouldReduce ? { opacity: 1 } : base.animate) as MotionAnimate;
  const exit = (shouldReduce ? { opacity: 0 } : "exit" in base ? base.exit : undefined) as
    | MotionExit
    | undefined;
  const transition = {
    ...(shouldReduce ? { duration: 0.15 } : base.transition),
    delay,
    ...(duration ? { duration } : {}),
  } as MotionTransition;

  if (inView) {
    return (
      <MotionDiv
        {...rest}
        className={className}
        initial={initial}
        whileInView={animate}
        {...(exit && { exit })}
        transition={transition}
        viewport={viewportSettings.once}
      >
        {children}
      </MotionDiv>
    );
  }

  return (
    <MotionDiv
      {...rest}
      className={className}
      initial={initial}
      animate={animate}
      {...(exit && { exit })}
      transition={transition}
    >
      {children}
    </MotionDiv>
  );
}

// ─────────────────────────────────────────────────────────────
// AnimateSwap — keyed content exchange
// ─────────────────────────────────────────────────────────────

export interface AnimateSwapProps extends AnimateInProps {
  /**
   * Identity of the content currently rendered. When it changes, the outgoing
   * content plays its exit and is fully unmounted before the incoming content
   * enters (`AnimatePresence mode="wait"`).
   */
  swapKey: React.Key;
}

/**
 * AnimateSwap — swap one piece of content for another, one at a time.
 *
 * `AnimateIn` can only animate an entrance: it has no `AnimatePresence`, so its
 * `exit` never plays and a keyed replacement cross-fades on top of itself. Any
 * tab panel, step body or filtered result set therefore had to hand-roll
 * `AnimatePresence mode="wait"` plus a raw `m.div`. This is that pattern, once.
 *
 * Reduced motion is inherited from `AnimateIn`: opacity only, no travel, no blur.
 *
 * @example
 * <AnimateSwap swapKey={activeTab} preset="swap" role="tabpanel">
 *   {panelFor(activeTab)}
 * </AnimateSwap>
 */
export function AnimateSwap(props: AnimateSwapProps) {
  const { swapKey, ...animateInProps } = props;

  return (
    <LazyMotion features={domAnimation}>
      <AnimatePresence mode="wait">
        <AnimateIn key={swapKey} {...animateInProps} />
      </AnimatePresence>
    </LazyMotion>
  );
}

// ─────────────────────────────────────────────────────────────
// AnimateInGroup — staggered list of children
// ─────────────────────────────────────────────────────────────

export interface AnimateInGroupProps {
  children: React.ReactNode;
  stagger?: "fast" | "normal" | "slow";
  preset?: Preset;
  inView?: boolean;
  className?: string;
}

/**
 * AnimateInGroup — staggered container. Each direct child animates in sequence.
 *
 * @example
 * <AnimateInGroup stagger="normal" inView>
 *   {items.map(item => <AnimateIn key={item.id} preset="fadeUp">{item}</AnimateIn>)}
 * </AnimateInGroup>
 */
export function AnimateInGroup(props: AnimateInGroupProps) {
  const { children, stagger = "normal", inView = false, className } = props;
  const shouldReduce = useFramerReducedMotion();
  const container = staggerContainers[stagger];

  if (shouldReduce) {
    return <div className={className}>{children}</div>;
  }

  if (inView) {
    return (
      <MotionDiv
        className={className}
        initial="initial"
        whileInView="animate"
        viewport={viewportSettings.once}
        variants={container}
      >
        {children}
      </MotionDiv>
    );
  }

  return (
    <MotionDiv className={className} initial="initial" animate="animate" variants={container}>
      {children}
    </MotionDiv>
  );
}

// Re-export brandSpring for consumers who need it alongside AnimateIn
export { brandSpring };
