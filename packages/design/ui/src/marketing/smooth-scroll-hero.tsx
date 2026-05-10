"use client";

import { motion, useMotionTemplate, useScroll, useTransform } from "motion/react";
import type * as React from "react";
import { cn } from "../utils";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for SmoothScrollHero component
 *
 * @description
 * A scroll-driven parallax hero section with clip-path reveal animation.
 * The background image zooms out and the clip-path expands as user scrolls.
 *
 * **UX Scenarios:**
 * - Landing page hero sections with immersive entrance
 * - Portfolio/gallery page headers
 * - Product launch reveal sequences
 * - Story-telling scroll experiences
 * - Travel/destination showcases
 *
 * **Animation Details:**
 * - Clip-path animates from centered rectangle to full viewport
 * - Background zooms from 170% to 100% creating depth
 * - Supports separate mobile/desktop images for optimization
 */
export interface SmoothScrollHeroProps {
  /**
   * Height of the scroll section in pixels
   * @default 1500
   */
  scrollHeight?: number;
  /**
   * Background image URL for desktop view
   */
  desktopImage: string;
  /**
   * Background image URL for mobile view
   * Falls back to desktopImage if not provided
   */
  mobileImage?: string;
  /**
   * Initial clip path percentage (smaller = smaller starting window)
   * @default 25
   */
  initialClipPercentage?: number;
  /**
   * Final clip path percentage (larger = larger starting window)
   * @default 75
   */
  finalClipPercentage?: number;
  /**
   * Initial background zoom percentage
   * @default "170%"
   */
  initialZoom?: string;
  /**
   * Final background zoom percentage
   * @default "100%"
   */
  finalZoom?: string;
  /**
   * Content to render on top of the hero
   */
  children?: React.ReactNode;
  /** Container className */
  className?: string;
  /** Background className */
  backgroundClassName?: string;
}

/**
 * Internal props for background component
 */
interface SmoothScrollHeroBackgroundProps {
  scrollHeight: number;
  desktopImage: string;
  mobileImage: string;
  initialClipPercentage: number;
  finalClipPercentage: number;
  initialZoom: string;
  finalZoom: string;
  className?: string;
}

// =============================================================================
// Background Component
// =============================================================================

const SmoothScrollHeroBackground: React.FC<SmoothScrollHeroBackgroundProps> = ({
  scrollHeight,
  desktopImage,
  mobileImage,
  initialClipPercentage,
  finalClipPercentage,
  initialZoom,
  finalZoom,
  className,
}) => {
  const { scrollY } = useScroll();

  const clipStart = useTransform(scrollY, [0, scrollHeight], [initialClipPercentage, 0]);
  const clipEnd = useTransform(scrollY, [0, scrollHeight], [finalClipPercentage, 100]);

  const clipPath = useMotionTemplate`polygon(${clipStart}% ${clipStart}%, ${clipEnd}% ${clipStart}%, ${clipEnd}% ${clipEnd}%, ${clipStart}% ${clipEnd}%)`;

  const backgroundSize = useTransform(scrollY, [0, scrollHeight + 500], [initialZoom, finalZoom]);

  return (
    <motion.div
      className={cn("sticky top-0 h-screen w-full bg-black", className)}
      style={{
        clipPath,
        willChange: "transform, opacity",
      }}
    >
      {/* Mobile background */}
      <motion.div
        className="absolute inset-0 md:hidden"
        style={{
          backgroundImage: `url(${mobileImage})`,
          backgroundSize,
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
        aria-hidden="true"
      />
      {/* Desktop background */}
      <motion.div
        className="absolute inset-0 hidden md:block"
        style={{
          backgroundImage: `url(${desktopImage})`,
          backgroundSize,
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
        aria-hidden="true"
      />
    </motion.div>
  );
};

// =============================================================================
// Main Component
// =============================================================================

/**
 * SmoothScrollHero - Parallax scroll hero with clip-path reveal
 *
 * @example
 * ```tsx
 * // Basic usage
 * <SmoothScrollHero
 *   desktopImage="/hero-desktop.jpg"
 *   mobileImage="/hero-mobile.jpg"
 * />
 *
 * // With content overlay
 * <SmoothScrollHero
 *   desktopImage="/hero.jpg"
 *   scrollHeight={2000}
 *   initialClipPercentage={30}
 *   finalClipPercentage={70}
 * >
 *   <div className="absolute inset-0 flex items-center justify-center">
 *     <h1 className="text-white text-6xl">Welcome</h1>
 *   </div>
 * </SmoothScrollHero>
 * ```
 */
export const SmoothScrollHero: React.FC<SmoothScrollHeroProps> = ({
  scrollHeight = 1500,
  desktopImage,
  mobileImage,
  initialClipPercentage = 25,
  finalClipPercentage = 75,
  initialZoom = "170%",
  finalZoom = "100%",
  children,
  className,
  backgroundClassName,
}) => {
  return (
    <div
      style={{ height: `calc(${scrollHeight}px + 100vh)` }}
      className={cn("relative w-full", className)}
    >
      <SmoothScrollHeroBackground
        scrollHeight={scrollHeight}
        desktopImage={desktopImage}
        mobileImage={mobileImage ?? desktopImage}
        initialClipPercentage={initialClipPercentage}
        finalClipPercentage={finalClipPercentage}
        initialZoom={initialZoom}
        finalZoom={finalZoom}
        className={backgroundClassName}
      />
      {children}
    </div>
  );
};

export default SmoothScrollHero;
