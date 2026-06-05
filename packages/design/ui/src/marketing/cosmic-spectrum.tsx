"use client";

import * as React from "react";
import { cn } from "../utils/cn";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

export type CosmicSpectrumColorTheme =
  | "original"
  | "blue-pink"
  | "blue-orange"
  | "sunset"
  | "purple"
  | "monochrome"
  | "pink-purple"
  | "blue-black"
  | "beige-black";

export interface CosmicSpectrumProps {
  /** Color theme for the spectrum bars */
  colorTheme?: CosmicSpectrumColorTheme;
  /** Apply blur effect to spectrum bars */
  blur?: boolean;
  /** Hero section title */
  title?: string;
  /** Subtitle text shown after animation */
  subtitle?: string;
  /** Scroll hint text */
  scrollHint?: string;
  /** Additional class names */
  className?: string;
}

/* -------------------------------------------------------------------------- */
/*                                 Constants                                  */
/* -------------------------------------------------------------------------- */

const COLOR_THEMES: Record<CosmicSpectrumColorTheme, string[]> = {
  original: [
    "#340B05",
    "#0358F7",
    "#5092C7",
    "#E1ECFE",
    "#FFD400",
    "#FA3D1D",
    "#FD02F5",
    "#FFC0FD",
  ],
  "blue-pink": [
    "#1E3A8A",
    "#3B82F6",
    "#A855F7",
    "#EC4899",
    "#F472B6",
    "#F9A8D4",
    "#FBCFE8",
    "#FDF2F8",
  ],
  "blue-orange": [
    "#1E40AF",
    "#3B82F6",
    "#60A5FA",
    "#FFFFFF",
    "#FED7AA",
    "#FB923C",
    "#EA580C",
    "#9A3412",
  ],
  sunset: ["#FEF3C7", "#FCD34D", "#F59E0B", "#D97706", "#B45309", "#92400E", "#78350F", "#451A03"],
  purple: ["#F3E8FF", "#E9D5FF", "#D8B4FE", "#C084FC", "#A855F7", "#9333EA", "#7C3AED", "#6B21B6"],
  monochrome: [
    "#1A1A1A",
    "#404040",
    "#666666",
    "#999999",
    "#CCCCCC",
    "#E5E5E5",
    "#F5F5F5",
    "#FFFFFF",
  ],
  "pink-purple": [
    "#FDF2F8",
    "#FCE7F3",
    "#F9A8D4",
    "#F472B6",
    "#EC4899",
    "#BE185D",
    "#831843",
    "#500724",
  ],
  "blue-black": [
    "#000000",
    "#0F172A",
    "#1E293B",
    "#334155",
    "#475569",
    "#64748B",
    "#94A3B8",
    "#CBD5E1",
  ],
  "beige-black": [
    "#FEF3C7",
    "#F59E0B",
    "#D97706",
    "#92400E",
    "#451A03",
    "#1C1917",
    "#0C0A09",
    "#000000",
  ],
};

const DARK_THEMES: CosmicSpectrumColorTheme[] = ["blue-black", "beige-black", "monochrome"];

function splitTextToChars(text: string): React.ReactNode[] {
  return text.split("").map((char, index) => (
    <span key={index} className="char inline-block">
      {char === " " ? "\u00A0" : char}
    </span>
  ));
}

/* -------------------------------------------------------------------------- */
/*                               Sub-Components                               */
/* -------------------------------------------------------------------------- */

interface SpectrumBarsProps {
  colors: string[];
  blur?: boolean;
}

function SpectrumBars({ colors, blur }: SpectrumBarsProps) {
  return (
    <svg
      aria-hidden="true"
      className="h-full w-full"
      viewBox="0 0 1567 584"
      preserveAspectRatio="none"
      fill="none"
    >
      <g clipPath="url(#spectrum-clip)" filter={blur ? "url(#spectrum-blur)" : undefined}>
        <path d="M1219 584H1393V184H1219V584Z" fill="url(#grad0)" />
        <path d="M1045 584H1219V104H1045V584Z" fill="url(#grad1)" />
        <path d="M348 584H174L174 184H348L348 584Z" fill="url(#grad2)" />
        <path d="M522 584H348L348 104H522L522 584Z" fill="url(#grad3)" />
        <path d="M697 584H522L522 54H697L697 584Z" fill="url(#grad4)" />
        <path d="M870 584H1045V54H870V584Z" fill="url(#grad5)" />
        <path d="M870 584H697L697 0H870L870 584Z" fill="url(#grad6)" />
        <path d="M174 585H0.000183105L-3.75875e-06 295H174L174 585Z" fill="url(#grad7)" />
        <path d="M1393 584H1567V294H1393V584Z" fill="url(#grad8)" />
      </g>
      <defs>
        <filter
          id="spectrum-blur"
          x="-30"
          y="-30"
          width="1627"
          height="644"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation="15" result="effect1_foregroundBlur" />
        </filter>
        {Array.from({ length: 9 }, (_, i) => (
          <linearGradient
            key={i}
            id={`grad${i}`}
            x1="50%"
            y1="100%"
            x2="50%"
            y2="0%"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor={colors[0]} />
            <stop offset="0.182709" stopColor={colors[1]} />
            <stop offset="0.283673" stopColor={colors[2]} />
            <stop offset="0.413484" stopColor={colors[3]} />
            <stop offset="0.586565" stopColor={colors[4]} />
            <stop offset="0.682722" stopColor={colors[5]} />
            <stop offset="0.802892" stopColor={colors[6]} />
            <stop offset="1" stopColor={colors[7]} stopOpacity="0" />
          </linearGradient>
        ))}
        <clipPath id="spectrum-clip">
          <rect width="1567" height="584" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 Component                                  */
/* -------------------------------------------------------------------------- */

/**
 * CosmicSpectrum - Spectrum storytelling visualization
 *
 * A full-page marketing visualization with colorful spectrum bars.
 * GSAP timelines for landing pages belong in `apps/landing-page/src/shared/animation/gsap`.
 *
 * @example
 * ```tsx
 * <CosmicSpectrum
 *   colorTheme="blue-pink"
 *   blur
 *   title="Welcome"
 *   subtitle="Explore the cosmos"
 * />
 * ```
 */
export function CosmicSpectrum({
  colorTheme = "original",
  blur = false,
  title = "Cosmic Spectrum",
  subtitle = "Where Design Becomes Communication\nAcross the World",
  scrollHint = "Scroll to explore",
  className,
}: CosmicSpectrumProps) {
  const currentColors = COLOR_THEMES[colorTheme];
  const isDarkTheme = DARK_THEMES.includes(colorTheme);

  return (
    <div className={cn("relative min-h-screen overflow-x-hidden", className)}>
      {/* Hero Section */}
      <section className="flex h-screen w-full flex-col justify-center p-8">
        <h1 className="hero-title text-center text-5xl font-bold tracking-tighter transition-colors duration-300 sm:text-7xl">
          {splitTextToChars(title)}
        </h1>
      </section>

      {/* Scroll Hint */}
      <div className="nav-bottom-center scroll-hint pointer-events-auto fixed bottom-8 left-1/2 z-[1000] -translate-x-1/2 text-xs uppercase tracking-wide transition-colors duration-300">
        {splitTextToChars(scrollHint)}
      </div>

      {/* Spacer */}
      <div className="h-[50vh]" />

      {/* Animation Section */}
      <div className="animation-section relative h-screen">
        <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-10 h-screen">
          {/* SVG Container */}
          <div className="svg-container absolute bottom-0 left-0 right-0 z-[15] h-screen opacity-100">
            <SpectrumBars colors={currentColors} blur={blur} />
          </div>

          {/* Main Title */}
          <div
            className="main-title absolute bottom-1/2 left-1/2 z-20 -translate-x-1/2 translate-y-1/2 text-center text-xs leading-relaxed transition-colors duration-300"
            style={{
              color: isDarkTheme ? "var(--neutral-1, #ffffff)" : "var(--neutral-12, #333333)",
            }}
          >
            {subtitle.split("\n").map((line, index) => (
              <React.Fragment key={index}>
                {line}
                {index < subtitle.split("\n").length - 1 && <br />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

CosmicSpectrum.displayName = "CosmicSpectrum";

/** Re-export color themes for custom usage */
export { COLOR_THEMES as COSMIC_SPECTRUM_COLORS };
