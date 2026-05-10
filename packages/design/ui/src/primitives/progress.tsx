"use client";

import { Progress as BaseProgress } from "@base-ui/react/progress";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "motion/react";
import * as React from "react";
import { cn } from "../utils/cn";

const progressVariants = cva("relative overflow-hidden rounded-full", {
  variants: {
    variant: {
      default: "bg-primary/20",
      primary: "bg-primary/20",
      secondary: "bg-secondary/20",
      destructive: "bg-destructive/20",
      outline: "bg-transparent border border-border",
    },
    size: {
      sm: "h-1.5",
      default: "h-2.5",
      lg: "h-3",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

const progressIndicatorVariants = cva(
  "h-full w-full flex-1 rounded-full transition-all duration-500 ease-out",
  {
    variants: {
      variant: {
        default: "bg-primary",
        primary: "bg-primary",
        secondary: "bg-foreground",
        destructive: "bg-destructive",
        outline: "bg-primary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export type ProgressProps = Omit<
  React.ComponentPropsWithoutRef<typeof BaseProgress.Root>,
  "value"
> &
  VariantProps<typeof progressVariants> & {
    value?: number | null;
    /** Toggle numeric value label */
    showValue?: boolean;
    animated?: boolean;
    label?: string;
  };

const Progress = React.forwardRef<React.ElementRef<typeof BaseProgress.Root>, ProgressProps>(
  (
    { className, value = 0, variant, size, showValue = false, animated = true, label, ...props },
    ref,
  ) => {
    const isIndeterminate = value === undefined || value === null;
    const progress = Math.min(Math.max((value as number) || 0, 0), 100);

    // Default Linear type
    return (
      <div className="space-y-2 w-full">
        {label && <div className="text-sm font-medium text-foreground text-left">{label}</div>}
        <BaseProgress.Root
          {...props}
          ref={ref}
          value={value ?? null}
          className={cn(progressVariants({ variant, size }), className)}
        >
          <BaseProgress.Indicator
            className={cn(
              progressIndicatorVariants({ variant: variant === "outline" ? "default" : variant }),
              isIndeterminate && "animate-pulse",
            )}
            render={
              <motion.div
                initial={{ transform: "translateX(-100%)" }}
                animate={{ transform: `translateX(-${100 - progress}%)` }}
                transition={{
                  duration: animated ? 1.2 : 0,
                  ease: "easeInOut",
                }}
              />
            }
          />
        </BaseProgress.Root>
        {showValue && !isIndeterminate && (
          <motion.div
            className="text-right text-xs font-semibold text-muted-foreground tabular-nums"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: animated ? 0.3 : 0, duration: 0.2 }}
          >
            {Math.round(progress)}%
          </motion.div>
        )}
      </div>
    );
  },
);

Progress.displayName = "Progress";

export { Progress, progressIndicatorVariants, progressVariants };
