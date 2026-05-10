"use client";

import { type HTMLMotionProps, motion, type Variants } from "framer-motion";
import * as React from "react";
import { cn } from "../utils/cn";

export interface InteractiveCardProps extends Omit<HTMLMotionProps<"div">, "ref"> {
  /** Step label (e.g., "STEP 1") */
  step: string;
  /** Card title */
  title: string;
  /** Card description */
  description: string;
  /** Custom icon (optional, default animated icon provided) */
  icon?: React.ReactNode;
}

/**
 * Default animated export icon with hover animation
 */
function AnimatedExportIcon() {
  const fileVariants: Variants = {
    initial: { y: 0 },
    hover: {
      y: -12,
      transition: { type: "spring", stiffness: 300, damping: 20 },
    },
  };

  const downloadIconVariants: Variants = {
    initial: { scale: 1 },
    hover: {
      scale: 1.15,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 15,
        repeat: Infinity,
        repeatType: "reverse",
        duration: 0.5,
      },
    },
  };

  return (
    <div className="relative mb-8 flex h-40 w-full items-center justify-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 250 160"
        className="h-full w-auto"
        aria-hidden="true"
      >
        {/* Folder (static) */}
        <g id="folder">
          <path
            d="M228.5,42.5H127.2a10,10,0,0,1-8.2-4.4L109.8,24a10,10,0,0,0-8.2-4.4H21.5a14,14,0,0,0-14,14V136a14,14,0,0,0,14,14H228.5a14,14,0,0,0,14-14V56.5A14,14,0,0,0,228.5,42.5Z"
            fill="#e2e8f0"
          />
          <path
            d="M228.5,42.5H21.5a14,14,0,0,0-14,14V62.2a0,0,0,0,1,0,0H242.5a0,0,0,0,1,0,0V56.5A14,14,0,0,0,228.5,42.5Z"
            fill="#cbd5e1"
          />
        </g>

        {/* File (animated) */}
        <motion.g id="file" variants={fileVariants} style={{ originX: "125px", originY: "60px" }}>
          <path
            d="M185.3,103H64.7a12,12,0,0,1-12-12V50.3a12,12,0,0,1,12-12h83.9l28.7,28.7v24A12,12,0,0,1,185.3,103Z"
            fill="hsl(var(--primary))"
          />
          <path
            d="M148.6,38.3h-1.3l28.7,28.7v-1.3A12,12,0,0,0,164,53.7Z"
            fill="hsl(var(--primary) / 0.5)"
          />
          <text x="125" y="80" textAnchor="middle" fill="#FFFFFF" fontSize="18" fontWeight="bold">
            PPT
          </text>
        </motion.g>

        {/* Download circle and icon (animated) */}
        <motion.g
          id="download-icon"
          variants={downloadIconVariants}
          style={{ originX: "125px", originY: "130px" }}
        >
          <circle
            cx="125"
            cy="130"
            r="24"
            fill="hsl(var(--primary))"
            filter="drop-shadow(0 4px 6px hsl(var(--primary) / 0.3))"
          />
          <path
            d="M125 138.5c-.8 0-1.5-.7-1.5-1.5v-11l-3.6 3.6c-.6.6-1.6.6-2.1 0s-.6-1.6 0-2.1l6.1-6.1c.6-.6 1.6-.6 2.1 0l6.1 6.1c.6.6.6 1.6 0 2.1s-1.6.6-2.1 0l-3.6-3.6v11c0 .8-.7 1.5-1.5 1.5z"
            fill="#FFFFFF"
          />
        </motion.g>
      </svg>
    </div>
  );
}

/**
 * InteractiveCard - Step-based card with animated icon on hover
 *
 * @example
 * ```tsx
 * <InteractiveCard
 *   step="STEP 1"
 *   title="Create Project"
 *   description="Start by creating a new project"
 * />
 * ```
 */
export const InteractiveCard = React.forwardRef<HTMLDivElement, InteractiveCardProps>(
  ({ className, step, title, description, icon, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={cn(
          "relative w-full max-w-sm overflow-hidden rounded-[var(--radius-2xl)] border bg-card p-8 text-center shadow-sm",
          className,
        )}
        initial="initial"
        whileHover="hover"
        aria-label={`${title}: ${description}`}
        role="group"
        {...props}
      >
        {/* Render provided icon or default animated one */}
        {icon || <AnimatedExportIcon />}

        {/* Text Content */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            {step}
          </p>
          <h3 className="text-2xl font-bold text-card-foreground">{title}</h3>
          <p className="text-base text-muted-foreground">{description}</p>
        </div>
      </motion.div>
    );
  },
);

InteractiveCard.displayName = "InteractiveCard";

export { AnimatedExportIcon };
