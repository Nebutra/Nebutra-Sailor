"use client";

import {
  AnimatePresence,
  type HTMLMotionProps,
  motion,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import type { ReactNode } from "react";
import {
  animatedList,
  animatedListItem,
  drawerSurface,
  fadeIn,
  modalSurface,
  pageTransition,
  popoverSurface,
  reducedMotionVariants,
  scaleIn,
  slideIn,
} from "../variants";

type AnimatedDivProps = HTMLMotionProps<"div"> & {
  children: ReactNode;
};

function useAccessibleVariants(variants: Variants, allowTransform = false) {
  const shouldReduceMotion = useReducedMotion();
  return shouldReduceMotion && !allowTransform ? reducedMotionVariants : variants;
}

export function FadeIn({ children, ...props }: AnimatedDivProps) {
  const variants = useAccessibleVariants(fadeIn);

  return (
    <motion.div initial="initial" animate="animate" exit="exit" variants={variants} {...props}>
      {children}
    </motion.div>
  );
}

export function SlideIn({
  children,
  direction = "up",
  ...props
}: AnimatedDivProps & { direction?: keyof typeof slideIn }) {
  const variants = useAccessibleVariants(slideIn[direction]);

  return (
    <motion.div initial="initial" animate="animate" exit="exit" variants={variants} {...props}>
      {children}
    </motion.div>
  );
}

export function ScaleIn({ children, ...props }: AnimatedDivProps) {
  const variants = useAccessibleVariants(scaleIn);

  return (
    <motion.div initial="initial" animate="animate" exit="exit" variants={variants} {...props}>
      {children}
    </motion.div>
  );
}

export function AnimatedCard({ children, ...props }: AnimatedDivProps) {
  return (
    <ScaleIn whileHover={{ y: -2 }} whileTap={{ scale: 0.99 }} {...props}>
      {children}
    </ScaleIn>
  );
}

export function AnimatedList({ children, ...props }: AnimatedDivProps) {
  const containerVariants = useAccessibleVariants(animatedList);
  const itemVariants = useAccessibleVariants(animatedListItem);

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={containerVariants}
      {...props}
    >
      {Array.isArray(children)
        ? children.map((child, index) => (
            <motion.div key={index} variants={itemVariants}>
              {child}
            </motion.div>
          ))
        : children}
    </motion.div>
  );
}

export function AnimatedModal({ children, open, ...props }: AnimatedDivProps & { open: boolean }) {
  const variants = useAccessibleVariants(modalSurface);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div initial="initial" animate="animate" exit="exit" variants={variants} {...props}>
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function AnimatedDrawer({
  children,
  open,
  side = "right",
  ...props
}: AnimatedDivProps & { open: boolean; side?: keyof typeof drawerSurface }) {
  const variants = useAccessibleVariants(drawerSurface[side]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div initial="initial" animate="animate" exit="exit" variants={variants} {...props}>
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function AnimatedPopover({
  children,
  open,
  ...props
}: AnimatedDivProps & { open: boolean }) {
  const variants = useAccessibleVariants(popoverSurface);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div initial="initial" animate="animate" exit="exit" variants={variants} {...props}>
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function PageTransition({ children, ...props }: AnimatedDivProps) {
  const variants = useAccessibleVariants(pageTransition);

  return (
    <motion.div initial="initial" animate="animate" exit="exit" variants={variants} {...props}>
      {children}
    </motion.div>
  );
}
