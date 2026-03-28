"use client";

import { type MotionProps, motion } from "framer-motion";
import { type JSX, useCallback, useEffect, useRef, useState } from "react";

/**
 * Default character set for scramble animation
 */
const DEFAULT_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export interface TextScrambleProps extends MotionProps {
  /** Text content to display and animate */
  children: string;
  /** Total duration of the scramble animation in seconds */
  duration?: number;
  /** Speed of character updates in seconds */
  speed?: number;
  /** Character set to use for scrambled characters */
  characterSet?: string;
  /** HTML element to render as */
  as?: React.ElementType;
  /** Additional CSS classes */
  className?: string;
  /** Whether to trigger the scramble animation */
  trigger?: boolean;
  /** Callback when scramble animation completes */
  onScrambleComplete?: () => void;
}

/**
 * TextScramble - Animated text scrambling effect
 *
 * @description
 * A text component that animates character-by-character with a scramble effect.
 * Characters transition from random symbols to the final text progressively.
 *
 * @example Basic usage
 * ```tsx
 * <TextScramble className="font-mono text-sm uppercase">
 *   Hello World
 * </TextScramble>
 * ```
 *
 * @example Hover trigger
 * ```tsx
 * const [trigger, setTrigger] = useState(false);
 * <TextScramble
 *   as="span"
 *   speed={0.01}
 *   trigger={trigger}
 *   onHoverStart={() => setTrigger(true)}
 *   onScrambleComplete={() => setTrigger(false)}
 * >
 *   Hover me
 * </TextScramble>
 * ```
 *
 * @example Custom character set (dots for loading effect)
 * ```tsx
 * <TextScramble characterSet=". " duration={1.2}>
 *   Generating...
 * </TextScramble>
 * ```
 */
export function TextScramble({
  children,
  duration = 0.8,
  speed = 0.04,
  characterSet = DEFAULT_CHARS,
  className,
  as: Component = "p",
  trigger = true,
  onScrambleComplete,
  ...props
}: TextScrambleProps) {
  const MotionComponent = motion.create(Component as keyof JSX.IntrinsicElements);
  const [displayText, setDisplayText] = useState(children);
  const isAnimatingRef = useRef(false);
  const text = children;

  // Store callback props in refs for stable access
  const onScrambleCompleteRef = useRef(onScrambleComplete);
  onScrambleCompleteRef.current = onScrambleComplete;

  const scramble = useCallback(() => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;

    const steps = duration / speed;
    let step = 0;

    const interval = setInterval(() => {
      let scrambled = "";
      const progress = step / steps;

      for (let i = 0; i < text.length; i++) {
        if (text[i] === " ") {
          scrambled += " ";
          continue;
        }

        if (progress * text.length > i) {
          scrambled += text[i];
        } else {
          scrambled += characterSet[Math.floor(Math.random() * characterSet.length)];
        }
      }

      setDisplayText(scrambled);
      step++;

      if (step > steps) {
        clearInterval(interval);
        setDisplayText(text);
        isAnimatingRef.current = false;
        onScrambleCompleteRef.current?.();
      }
    }, speed * 1000);
  }, [duration, speed, text, characterSet]);

  useEffect(() => {
    if (!trigger) return;

    scramble();
  }, [trigger, scramble]);

  return (
    <MotionComponent className={className} {...props}>
      {displayText}
    </MotionComponent>
  );
}
