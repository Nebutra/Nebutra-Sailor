"use client";

import { AnimatePresence, type HTMLMotionProps, motion } from "framer-motion";
import * as React from "react";
import { cn } from "../utils/cn";

export interface DwellHintProps
  extends Omit<HTMLMotionProps<"div">, "children" | "initial" | "animate" | "exit" | "transition"> {
  /** Whether the hint is visible */
  show: boolean;
  /** The hint message to display */
  message: string;
  /** Optional icon to display before the message */
  icon?: React.ReactNode;
  /** Position of the hint relative to content (default: "bottom") */
  position?: "top" | "bottom" | "center";
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
export const DwellHint = React.forwardRef<HTMLDivElement, DwellHintProps>(
  ({ show, message, icon, position = "bottom", className, ...props }, ref) => {
    const positionClasses = {
      top: "top-0 -translate-y-full mb-2",
      bottom: "bottom-0 translate-y-full mt-2",
      center: "top-1/2 -translate-y-1/2",
    };

    return (
      <AnimatePresence>
        {show && (
          <motion.div
            ref={ref}
            className={cn(
              "absolute left-1/2 -translate-x-1/2 z-10",
              positionClasses[position],
              className,
            )}
            initial={{
              opacity: 0,
              y: position === "top" ? -10 : 10,
              scale: 0.95,
            }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: position === "top" ? -5 : 5, scale: 0.98 }}
            transition={{
              duration: 0.4,
              ease: [0.34, 1.56, 0.64, 1],
            }}
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
