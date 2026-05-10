"use client";

import { type MotionProps, motion } from "framer-motion";
import { cn } from "../utils/cn";

/**
 * Props for the LineShadowText component
 */
export interface LineShadowTextProps
  extends Omit<React.HTMLAttributes<HTMLElement>, keyof MotionProps>,
    MotionProps {
  /** Color of the shadow effect (default: "black") */
  shadowColor?: string;
  /** HTML element to render as (default: "span") */
  as?: React.ElementType;
  /** Text content to display - must be a string */
  children: string;
}

/**
 * LineShadowText - Animated line shadow text effect
 *
 * A text component with an animated diagonal line shadow effect.
 * Great for hero sections, headings, or emphasis text.
 *
 * **Note:** Requires CSS animation to be added to your global styles:
 * ```css
 * @keyframes line-shadow {
 *   0% { background-position: 0 0; }
 *   100% { background-position: 100% -100%; }
 * }
 * .animate-line-shadow {
 *   animation: line-shadow 15s linear infinite;
 * }
 * ```
 *
 * @example Basic usage
 * ```tsx
 * <LineShadowText>Magic UI</LineShadowText>
 * ```
 *
 * @example Custom shadow color
 * ```tsx
 * <LineShadowText shadowColor="#3b82f6">
 *   Blue Shadow
 * </LineShadowText>
 * ```
 *
 * @example As heading
 * ```tsx
 * <LineShadowText as="h1" className="text-5xl font-bold">
 *   Welcome
 * </LineShadowText>
 * ```
 *
 * @example With motion props
 * ```tsx
 * <LineShadowText
 *   initial={{ opacity: 0 }}
 *   animate={{ opacity: 1 }}
 *   transition={{ duration: 0.5 }}
 * >
 *   Animated Entry
 * </LineShadowText>
 * ```
 */
export function LineShadowText({
  children,
  shadowColor = "black",
  className,
  as: Component = "span",
  ...props
}: LineShadowTextProps) {
  const MotionComponent = motion.create(Component);

  if (typeof children !== "string") {
    throw new Error("LineShadowText only accepts string content");
  }

  return (
    <MotionComponent
      style={{ "--shadow-color": shadowColor } as React.CSSProperties}
      className={cn(
        "relative z-0 inline-flex",
        "after:absolute after:left-[0.04em] after:top-[0.04em] after:content-[attr(data-text)]",
        "after:bg-[linear-gradient(45deg,transparent_45%,var(--shadow-color)_45%,var(--shadow-color)_55%,transparent_0)]",
        "after:-z-10 after:bg-[length:0.06em_0.06em] after:bg-clip-text after:text-transparent",
        "after:animate-line-shadow",
        className,
      )}
      data-text={children}
      {...props}
    >
      {children}
    </MotionComponent>
  );
}

/**
 * CSS keyframes required for LineShadowText animation.
 * Add this to your global CSS or Tailwind config.
 */
export const LINE_SHADOW_CSS = `
@keyframes line-shadow {
  0% {
    background-position: 0 0;
  }
  100% {
    background-position: 100% -100%;
  }
}

.animate-line-shadow::after {
  animation: line-shadow 15s linear infinite;
}
`;
