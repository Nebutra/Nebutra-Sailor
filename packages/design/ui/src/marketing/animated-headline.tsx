"use client";

import { Plus } from "lucide-react";
import type * as React from "react";
import { GradientAnimatedText, type GradientTheme } from "../primitives/gradient-animated-text";
import { cn } from "../utils/cn";

export interface AnimatedHeadlineWord {
  /** Word text (including punctuation) */
  text: string;
  /** Custom gradient start color */
  gradientFrom?: string;
  /** Custom gradient end color */
  gradientTo?: string;
}

export interface AnimatedHeadlineProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Array of words to animate (max 3 for cycling effect) */
  words: AnimatedHeadlineWord[] | string[];
  /** Color theme preset */
  theme?: GradientTheme;
  /** Animation duration in seconds */
  duration?: number;
  /** Show corner plus icons */
  showCornerIcons?: boolean;
  /** Corner icon color */
  cornerIconColor?: string;
  /** Text size class */
  textSize?: string;
  /** Layout direction */
  direction?: "row" | "column";
}

/**
 * AnimatedHeadline - Hero headline with cycling gradient text animation
 *
 * A decorative headline component with animated gradient text and optional
 * corner icons. Perfect for hero sections and landing pages.
 *
 * @example
 * ```tsx
 * <AnimatedHeadline
 *   words={["Develop.", "Preview.", "Ship."]}
 *   theme="neon"
 *   showCornerIcons
 * />
 * ```
 *
 * @example Custom colors
 * ```tsx
 * <AnimatedHeadline
 *   words={[
 *     { text: "Build.", gradientFrom: "#ff0080", gradientTo: "#7928ca" },
 *     { text: "Deploy.", gradientFrom: "#0070f3", gradientTo: "#00dfd8" },
 *     { text: "Scale.", gradientFrom: "#f5a623", gradientTo: "#f5a623" },
 *   ]}
 * />
 * ```
 */
export function AnimatedHeadline({
  words,
  theme = "neon",
  duration = 8,
  showCornerIcons = true,
  cornerIconColor = "text-indigo-500",
  textSize = "text-7xl sm:text-8xl",
  direction = "row",
  className,
  ...props
}: AnimatedHeadlineProps) {
  // Normalize words to objects
  const normalizedWords: AnimatedHeadlineWord[] = words.map((word) =>
    typeof word === "string" ? { text: word } : word,
  );

  // Ensure we have exactly 3 words for the animation cycle
  const paddedWords = [...normalizedWords];
  while (paddedWords.length < 3) {
    paddedWords.push(paddedWords[paddedWords.length - 1] || { text: "" });
  }

  return (
    <div className={cn("mb-10 mt-4 md:mt-6", className)} {...props}>
      <div className="px-2">
        <div
          className={cn(
            "relative w-full border border-[var(--neutral-6)] p-8",
            "[mask-image:radial-gradient(200rem_24rem_at_center,white,transparent)]",
          )}
        >
          {/* Corner icons */}
          {showCornerIcons && (
            <>
              <Plus className={cn("absolute -left-4 -top-4 h-8 w-8", cornerIconColor)} />
              <Plus className={cn("absolute -bottom-4 -left-4 h-8 w-8", cornerIconColor)} />
              <Plus className={cn("absolute -right-4 -top-4 h-8 w-8", cornerIconColor)} />
              <Plus className={cn("absolute -bottom-4 -right-4 h-8 w-8", cornerIconColor)} />
            </>
          )}

          {/* Animated headline */}
          <h1
            className={cn(
              "flex select-none flex-col px-3 py-2 text-center font-extrabold leading-none tracking-tighter",
              textSize,
              direction === "row" && "md:flex-col lg:flex-row",
            )}
          >
            {paddedWords.slice(0, 3).map((word, index) => (
              <GradientAnimatedText
                key={index}
                variant={(index + 1) as 1 | 2 | 3}
                theme={theme}
                gradientFrom={word.gradientFrom}
                gradientTo={word.gradientTo}
                duration={duration}
                className="px-2 sm:px-5"
              >
                {word.text}
              </GradientAnimatedText>
            ))}
          </h1>
        </div>
      </div>
    </div>
  );
}

AnimatedHeadline.displayName = "AnimatedHeadline";
