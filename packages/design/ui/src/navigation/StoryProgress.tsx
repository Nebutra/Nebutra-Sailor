"use client";

import { motion } from "framer-motion";
import * as React from "react";
import { cn } from "../utils/cn";
import { useScrollSpy } from "./ScrollSpyProvider";

export interface StoryProgressProps extends Omit<React.HTMLAttributes<HTMLElement>, "children"> {
  /** Position on the screen (default: "right") */
  position?: "left" | "right";
  /** Whether to show section labels on hover (default: true) */
  showLabels?: boolean;
}

/**
 * StoryProgress - Fixed progress indicator showing section navigation.
 *
 * Displays a vertical list of nodes representing page sections,
 * with the active section highlighted. Clicking a node scrolls to that section.
 *
 * @example
 * <ScrollSpyProvider>
 *   <LandingPage />
 *   <StoryProgress position="right" showLabels />
 * </ScrollSpyProvider>
 */
export const StoryProgress = React.forwardRef<HTMLElement, StoryProgressProps>(
  ({ position = "right", showLabels = true, className, ...props }, ref) => {
    const { sections, activeSection, scrollToSection, scrollProgress } = useScrollSpy();

    if (sections.length === 0) return null;

    return (
      <nav
        ref={ref as React.Ref<HTMLElement>}
        className={cn(
          "fixed top-1/2 -translate-y-1/2 z-50",
          "hidden lg:flex flex-col items-center gap-1",
          position === "right" ? "right-6" : "left-6",
          className,
        )}
        aria-label="Page sections"
        {...props}
      >
        {/* Progress line */}
        <div className="absolute inset-y-0 w-px bg-border/30">
          <motion.div
            className="absolute top-0 w-full bg-primary/50"
            style={{ height: `${scrollProgress * 100}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>

        {/* Section nodes */}
        {sections.map((section, index) => {
          const isActive = section.id === activeSection;
          const isPast = sections.findIndex((s) => s.id === activeSection) > index;

          return (
            <motion.button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className={cn(
                "relative z-10 group flex items-center gap-3",
                position === "right" ? "flex-row-reverse" : "flex-row",
              )}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              aria-label={`Go to ${section.label}`}
              aria-current={isActive ? "true" : undefined}
            >
              {/* Node dot */}
              <motion.div
                className={cn(
                  "w-3 h-3 rounded-full border-2 transition-colors duration-200",
                  isActive
                    ? "bg-primary border-primary"
                    : isPast
                      ? "bg-primary/30 border-primary/50"
                      : "bg-background border-border hover:border-primary/50",
                )}
                animate={{
                  scale: isActive ? 1.2 : 1,
                }}
                transition={{ duration: 0.2 }}
              />

              {/* Label (shown on hover) */}
              {showLabels && (
                <motion.span
                  className={cn(
                    "text-xs font-medium whitespace-nowrap",
                    "opacity-0 group-hover:opacity-100",
                    "transition-opacity duration-200",
                    isActive ? "text-foreground" : "text-muted-foreground",
                  )}
                  initial={{ opacity: 0, x: position === "right" ? 10 : -10 }}
                  whileHover={{ opacity: 1, x: 0 }}
                >
                  {section.label}
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </nav>
    );
  },
);

StoryProgress.displayName = "StoryProgress";
