"use client";

import { motion, type Variants } from "motion/react";
import { cn } from "../utils";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for WordFadeIn component
 *
 * @description
 * Animates text by fading in each word sequentially with staggered timing.
 * Creates an elegant reveal effect for headlines and important text.
 *
 * **UX Scenarios:**
 * - Hero section headlines
 * - Page title reveals
 * - Testimonial quotes
 * - Feature descriptions
 * - Onboarding welcome messages
 *
 * **Animation Details:**
 * - Each word fades in with configurable delay
 * - Supports custom animation variants for advanced effects
 * - Renders as h1 by default, customizable via `as` prop
 */
export interface WordFadeInProps {
  /** Text to animate (words separated by spaces) */
  words: string;
  /** Additional CSS classes */
  className?: string;
  /**
   * Delay between each word in seconds
   * @default 0.15
   */
  delay?: number;
  /**
   * Custom framer-motion variants
   * @default Fade in with staggered delay
   */
  variants?: Variants;
  /**
   * HTML element to render as
   * @default "h1"
   */
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span" | "div";
  /**
   * Whether to trigger animation
   * @default true
   */
  animate?: boolean;
  /**
   * Animation trigger mode
   * @default "mount" - animate on component mount
   */
  trigger?: "mount" | "inView";
}

// =============================================================================
// Default Variants
// =============================================================================

const createDefaultVariants = (delay: number): Variants => ({
  hidden: { opacity: 0 },
  visible: (i: number) => ({
    y: 0,
    opacity: 1,
    transition: { delay: i * delay },
  }),
});

// =============================================================================
// Component
// =============================================================================

/**
 * WordFadeIn - Sequential word fade-in animation
 *
 * @example
 * ```tsx
 * // Basic usage
 * <WordFadeIn words="Welcome to our platform" />
 *
 * // Slower animation
 * <WordFadeIn words="Take your time" delay={0.3} />
 *
 * // As paragraph
 * <WordFadeIn
 *   as="p"
 *   words="This is a longer description that fades in word by word"
 *   className="text-lg text-muted-foreground"
 * />
 *
 * // With viewport trigger
 * <WordFadeIn
 *   words="Scroll to reveal"
 *   trigger="inView"
 * />
 * ```
 */
export function WordFadeIn({
  words,
  delay = 0.15,
  variants,
  className,
  as: Component = "h1",
  animate = true,
  trigger = "mount",
}: WordFadeInProps) {
  const MotionComponent = motion.create(Component);
  const wordArray = words.split(" ");
  const animationVariants = variants ?? createDefaultVariants(delay);

  const animationProps =
    trigger === "inView"
      ? {
          initial: "hidden",
          whileInView: animate ? "visible" : "hidden",
          viewport: { once: true },
        }
      : {
          initial: "hidden",
          animate: animate ? "visible" : "hidden",
        };

  return (
    <MotionComponent
      variants={animationVariants}
      {...animationProps}
      className={cn(
        "text-center text-4xl font-bold tracking-tight text-foreground md:text-7xl md:leading-[5rem]",
        className,
      )}
    >
      {wordArray.map((word, i) => (
        <motion.span key={`${word}-${i}`} variants={animationVariants} custom={i}>
          {word}{" "}
        </motion.span>
      ))}
    </MotionComponent>
  );
}

export default WordFadeIn;
