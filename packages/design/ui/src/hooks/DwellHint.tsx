"use client";

import * as React from "react";
import {
  AnimatePresence,
  type HTMLMotionProps,
  motion,
  useReducedMotion,
} from "../shared/animation/motion";
import { cn } from "../utils/cn";

export type DwellHintPosition = "top" | "bottom" | "center";

export interface DwellHintProps
  extends Omit<
    HTMLMotionProps<"div">,
    "children" | "initial" | "animate" | "exit" | "transition" | "position"
  > {
  /** Whether the hint is visible */
  show: boolean;
  /** The hint message to display */
  message: string;
  /** Optional icon to display before the message */
  icon?: React.ReactNode;
  /** Position of the hint relative to content (default: "bottom") */
  position?: DwellHintPosition;
}

/**
 * DwellHint - A contextual hint that appears when user dwells on content.
 *
 * Use with useScrollDwell hook to show helpful messages when users
 * pause scrolling and appear to be reading content.
 *
 * @example
 * const { hasTriggered } = useScrollDwell(sectionRef, { threshold: 1000 });
 *
 * <DwellHint
 *   show={hasTriggered}
 *   message="This is why production-ready matters."
 *   icon={<Lightbulb className="w-4 h-4" />}
 * />
 */
const POSITION_CLASSES: Record<DwellHintPosition, string> = {
  top: "top-0 -translate-y-full mb-2",
  bottom: "bottom-0 translate-y-full mt-2",
  center: "top-1/2 -translate-y-1/2",
};

export const DwellHint = React.forwardRef<HTMLDivElement, DwellHintProps>(
  ({ show, message, icon, position = "bottom", className, ...props }, ref) => {
    const shouldReduceMotion = useReducedMotion();
    // Narrow after destructure: HTMLMotionProps intersections can widen
    // `position` to `any` under tsup DTS emit, which then fails TS7053.
    const resolvedPosition: DwellHintPosition = position ?? "bottom";

    return (
      <AnimatePresence initial={!shouldReduceMotion}>
        {show && (
          <motion.div
            ref={ref}
            className={cn(
              "absolute left-1/2 -translate-x-1/2 z-10",
              POSITION_CLASSES[resolvedPosition],
              className,
            )}
            initial={
              shouldReduceMotion
                ? { opacity: 1 }
                : {
                    opacity: 0,
                    y: resolvedPosition === "top" ? -10 : 10,
                    scale: 0.95,
                  }
            }
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: resolvedPosition === "top" ? -5 : 5, scale: 0.98 }
            }
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : {
                    duration: 0.4,
                    ease: [0.34, 1.56, 0.64, 1],
                  }
            }
            {...props}
          >
            <div
              className={cn(
                "flex items-center gap-2 px-4 py-2.5",
                "bg-background/95 backdrop-blur-md",
                "border border-border/50 rounded-[var(--radius-lg)]",
                "shadow-lg shadow-black/5",
                "text-sm text-muted-foreground",
              )}
            >
              {icon && <span className="text-primary/70 shrink-0">{icon}</span>}
              <span>{message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  },
);

DwellHint.displayName = "DwellHint";
