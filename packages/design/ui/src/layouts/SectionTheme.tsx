"use client";

import * as React from "react";
import { GridPattern } from "../decorations/GridPattern";
import { CrossPattern, DotMatrix, FloatingSpots } from "../decorations/patterns";
import { cn } from "../utils/cn";

/**
 * Section theme configuration.
 *
 * Note: For decorative/artistic purposes, themes may use hex colors as they
 * represent specific visual identities. These are exempt from strict Primer
 * compliance per WARP.md "Exemptions" section.
 */
export interface SectionThemeConfig {
  /** Background color class (Tailwind) */
  backgroundColor?: string;
  /** Pattern type to use */
  pattern?: "dots" | "crosses" | "grid" | "floating" | "none";
  /**
   * Pattern color.
   * - Use "currentColor" to inherit from context
   * - Use "hsl(var(--accent))" for semantic colors
   * - Hex colors are allowed for artistic/decorative themes
   */
  patternColor?: string;
  /** Pattern opacity 0-1 */
  patternOpacity?: number;
  /**
   * Accent color for highlights.
   * Hex colors are allowed for artistic/decorative themes.
   */
  accentColor?: string;
  /** Additional gradient overlay (Tailwind class) */
  gradient?: string;
  /** Custom pattern props */
  patternProps?: Record<string, unknown>;
}

/**
 * Predefined section themes based on DESIGN.md Section 11.5.
 *
 * These themes define visual territories for different sections.
 * Some use specific hex colors for artistic effect (exempt from Primer
 * strict compliance per WARP.md).
 */
export const sectionThemes: Record<string, SectionThemeConfig> = {
  // Hero: "Cosmic Launch" - Deep blue gradient with floating particles
  hero: {
    backgroundColor: "bg-background",
    pattern: "floating",
    patternColor: "hsl(var(--accent))",
    patternOpacity: 0.1,
    gradient: "bg-gradient-to-b from-primary/5 via-transparent to-transparent",
  },

  // Architecture: "Terminal Matrix" - Monochrome with subtle pattern
  architecture: {
    backgroundColor: "bg-[var(--neutral-1)]",
    pattern: "dots",
    patternColor: "currentColor",
    patternOpacity: 0.03,
  },

  // AI-Native: "Neon Network" - Dark with neon accents
  aiNative: {
    backgroundColor: "bg-background",
    pattern: "dots",
    patternColor: "hsl(var(--accent))",
    patternOpacity: 0.04,
    accentColor: "hsl(var(--accent))",
    gradient: "bg-gradient-to-br from-cyan-500/5 via-transparent to-fuchsia-500/5",
  },

  // Features: "Capability Map" - Subtle tech pattern
  features: {
    backgroundColor: "bg-background",
    pattern: "crosses",
    patternColor: "currentColor",
    patternOpacity: 0.03,
  },

  // Multi-tenant: "Access Graph" - Amber isolation lines
  // Note: Uses specific amber for visual territory (exempt)
  multiTenant: {
    backgroundColor: "bg-background",
    pattern: "grid",
    patternColor: "hsl(var(--warning, 43 96% 56%))", // Warning/amber semantic
    patternOpacity: 0.03,
    accentColor: "hsl(var(--warning, 43 96% 56%))",
  },

  // Testimonials: "Depth Gallery" - Warm neutrals with vignette
  testimonials: {
    backgroundColor: "bg-background",
    pattern: "floating",
    patternColor: "hsl(var(--warning, 48 96% 58%))", // Warm yellow
    patternOpacity: 0.05,
    gradient:
      "bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background)/0.4)_100%)]",
  },

  // Vision: "Contemplation Space" - Maximum whitespace
  vision: {
    backgroundColor: "bg-background",
    pattern: "none",
    gradient: "bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent",
  },

  // Pricing: "Symmetry Order" - Clean, minimal
  pricing: {
    backgroundColor: "bg-background",
    pattern: "dots",
    patternColor: "currentColor",
    patternOpacity: 0.02,
  },

  // CTA: "Action Climax" - Emphasis with gradient
  cta: {
    backgroundColor: "bg-background",
    pattern: "dots",
    patternColor: "hsl(var(--primary))",
    patternOpacity: 0.04,
    gradient: "bg-gradient-to-t from-primary/10 via-transparent to-transparent",
  },

  // Stats: "Data Visualization" - Clean with subtle pattern
  stats: {
    backgroundColor: "bg-muted/30",
    pattern: "crosses",
    patternColor: "currentColor",
    patternOpacity: 0.02,
  },

  // Terminal: "Developer Immersion" - Code environment feel
  terminal: {
    backgroundColor: "bg-[var(--neutral-1)]",
    pattern: "none",
  },
};

export interface ThemedSectionProps extends Omit<React.HTMLAttributes<HTMLElement>, "children"> {
  /** Theme preset name or custom config */
  theme: keyof typeof sectionThemes | SectionThemeConfig;
  /** Section content */
  children: React.ReactNode;
  /** Custom CSS variables for the section */
  cssVars?: Record<string, string>;
  /** Whether to include pattern (default: true) */
  showPattern?: boolean;
}

/**
 * ThemedSection - A section wrapper that applies visual territory theming.
 *
 * Applies consistent background patterns, colors, and gradients based on
 * predefined themes or custom configurations.
 *
 * @example
 * <ThemedSection theme="architecture">
 *   <h2>Architecture</h2>
 *   <CodeBlock />
 * </ThemedSection>
 *
 * @example
 * <ThemedSection
 *   theme={{
 *     backgroundColor: "bg-[var(--neutral-2)]",
 *     pattern: "grid",
 *     patternColor: "hsl(var(--accent))",
 *     patternOpacity: 0.05,
 *   }}
 * >
 *   Custom themed content
 * </ThemedSection>
 */
export const ThemedSection = React.forwardRef<HTMLElement, ThemedSectionProps>(
  ({ theme, children, className, cssVars, showPattern = true, ...props }, ref) => {
    const config = typeof theme === "string" ? sectionThemes[theme] : theme;

    const renderPattern = () => {
      if (!showPattern || config.pattern === "none") return null;

      const baseProps = {
        className: "absolute inset-0 z-0",
      };

      switch (config.pattern) {
        case "dots":
          return (
            <DotMatrix
              {...baseProps}
              color={config.patternColor}
              opacity={config.patternOpacity}
              {...(config.patternProps as object)}
            />
          );
        case "crosses":
          return (
            <CrossPattern
              {...baseProps}
              color={config.patternColor}
              opacity={config.patternOpacity}
              {...(config.patternProps as object)}
            />
          );
        case "grid":
          return (
            <GridPattern
              {...baseProps}
              color={config.patternColor}
              className={cn(baseProps.className, `opacity-[${config.patternOpacity}]`)}
              {...(config.patternProps as object)}
            />
          );
        case "floating":
          return (
            <FloatingSpots
              {...baseProps}
              color={config.patternColor}
              maxOpacity={config.patternOpacity}
              {...(config.patternProps as object)}
            />
          );
        default:
          return null;
      }
    };

    return (
      <section
        ref={ref}
        className={cn("relative overflow-hidden", config.backgroundColor, className)}
        style={cssVars as React.CSSProperties}
        {...props}
      >
        {/* Pattern layer */}
        {renderPattern()}

        {/* Gradient overlay */}
        {config.gradient && (
          <div
            className={cn("absolute inset-0 z-0 pointer-events-none", config.gradient)}
            aria-hidden="true"
          />
        )}

        {/* Content layer */}
        <div className="relative z-10">{children}</div>
      </section>
    );
  },
);

ThemedSection.displayName = "ThemedSection";
