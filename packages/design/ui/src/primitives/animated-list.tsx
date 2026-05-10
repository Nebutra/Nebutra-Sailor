"use client";

import { AnimatePresence, type MotionProps, motion } from "framer-motion";
import React, { type ComponentPropsWithoutRef, useEffect, useMemo, useState } from "react";

import { cn } from "../utils/cn";

export interface AnimatedListItemProps {
  children: React.ReactNode;
}

/**
 * AnimatedListItem - Individual item with spring animation
 */
export function AnimatedListItem({ children }: AnimatedListItemProps) {
  const animations: MotionProps = {
    initial: { scale: 0, opacity: 0 },
    animate: { scale: 1, opacity: 1, originY: 0 },
    exit: { scale: 0, opacity: 0 },
    transition: { type: "spring", stiffness: 350, damping: 40 },
  };

  return (
    <motion.div {...animations} layout className="mx-auto w-full">
      {children}
    </motion.div>
  );
}

export interface AnimatedListProps extends ComponentPropsWithoutRef<"div"> {
  children: React.ReactNode;
  /** Delay between each item animation in ms */
  delay?: number;
}

/**
 * AnimatedList - Sequential list animation component
 *
 * @description
 * Animates each child item in sequence with a configurable delay.
 * Perfect for showcasing notifications, events, or activity feeds on landing pages.
 *
 * @example Basic usage
 * ```tsx
 * <AnimatedList>
 *   <NotificationCard title="New message" />
 *   <NotificationCard title="Payment received" />
 *   <NotificationCard title="User signed up" />
 * </AnimatedList>
 * ```
 *
 * @example Custom delay
 * ```tsx
 * <AnimatedList delay={500}>
 *   {notifications.map((n, i) => (
 *     <Card key={i}>{n.message}</Card>
 *   ))}
 * </AnimatedList>
 * ```
 */
export const AnimatedList = React.memo(
  ({ children, className, delay = 1000, ...props }: AnimatedListProps) => {
    const [index, setIndex] = useState(0);
    const childrenArray = useMemo(() => React.Children.toArray(children), [children]);

    useEffect(() => {
      if (index < childrenArray.length - 1) {
        const timeout = setTimeout(() => {
          setIndex((prevIndex) => (prevIndex + 1) % childrenArray.length);
        }, delay);

        return () => clearTimeout(timeout);
      }
    }, [index, delay, childrenArray.length]);

    const itemsToShow = useMemo(() => {
      const result = childrenArray.slice(0, index + 1).reverse();
      return result;
    }, [index, childrenArray]);

    return (
      <div className={cn("flex flex-col items-center gap-4", className)} {...props}>
        <AnimatePresence>
          {itemsToShow.map((item) => (
            <AnimatedListItem key={(item as React.ReactElement).key}>{item}</AnimatedListItem>
          ))}
        </AnimatePresence>
      </div>
    );
  },
);

AnimatedList.displayName = "AnimatedList";
