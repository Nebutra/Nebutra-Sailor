"use client";

import { brandSpring, emerge, flow } from "@nebutra/brand";
import { domAnimation, LazyMotion, m, useReducedMotion } from "framer-motion";
import type * as React from "react";

const PRESETS = {
  emerge: {
    initial: emerge.initial,
    animate: emerge.animate,
    exit: emerge.exit,
    transition: emerge.transition,
  },
  flow: {
    initial: flow.initial,
    animate: flow.animate,
    exit: flow.exit,
    transition: flow.transition,
  },
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.3 },
  },
  fadeUp: {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 16 },
    transition: brandSpring,
  },
  scale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: brandSpring,
  },
} as const;

type Preset = keyof typeof PRESETS;

const STAGGER = { fast: 0.05, normal: 0.1, slow: 0.2 } as const;

function MotionDiv(props: React.ComponentProps<typeof m.div>) {
  return (
    <LazyMotion features={domAnimation}>
      <m.div {...props} />
    </LazyMotion>
  );
}

export interface AnimateInProps {
  children: React.ReactNode;
  preset?: Preset;
  delay?: number;
  duration?: number;
  inView?: boolean;
  className?: string;
}

export function AnimateIn({
  children,
  preset = "emerge",
  delay = 0,
  duration,
  inView = false,
  className,
}: AnimateInProps) {
  const shouldReduce = useReducedMotion();
  const { initial, animate, exit, transition } = PRESETS[preset];
  const t = {
    ...transition,
    ...(delay ? { delay } : {}),
    ...(duration ? { duration } : {}),
  };

  if (shouldReduce) return <div className={className}>{children}</div>;

  if (inView) {
    return (
      <MotionDiv
        className={className}
        initial={initial}
        whileInView={animate}
        exit={exit}
        viewport={{ once: true, margin: "-10%" }}
        transition={t}
      >
        {children}
      </MotionDiv>
    );
  }

  return (
    <MotionDiv className={className} initial={initial} animate={animate} exit={exit} transition={t}>
      {children}
    </MotionDiv>
  );
}

export interface AnimateInGroupProps {
  children: React.ReactNode;
  stagger?: keyof typeof STAGGER;
  inView?: boolean;
  className?: string;
}

export function AnimateInGroup({
  children,
  stagger = "normal",
  inView = false,
  className,
}: AnimateInGroupProps) {
  const shouldReduce = useReducedMotion();
  const variants = {
    initial: {},
    animate: { transition: { staggerChildren: STAGGER[stagger] } },
  };

  if (shouldReduce) return <div className={className}>{children}</div>;

  if (inView) {
    return (
      <MotionDiv
        className={className}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: "-10%" }}
        variants={variants}
      >
        {children}
      </MotionDiv>
    );
  }

  return (
    <MotionDiv className={className} initial="initial" animate="animate" variants={variants}>
      {children}
    </MotionDiv>
  );
}
