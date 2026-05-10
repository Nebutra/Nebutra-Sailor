"use client";

import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "../utils/cn";
import { Card, CardContent, CardHeader } from "./card";

// =============================================================================
// FeatureCard - Container with corner decorators
// =============================================================================

export interface FeatureCardProps {
  /** Card content */
  children: ReactNode;
  /** Additional className */
  className?: string;
}

/**
 * FeatureCard - Card with corner bracket decorators
 *
 * A styled card container with decorative corner brackets.
 * Commonly used for feature showcases on landing pages.
 *
 * @example
 * ```tsx
 * <FeatureCard>
 *   <FeatureCardHeader icon={MapIcon} title="Tracking" description="Real-time location" />
 *   <FeatureCardContent>
 *     <Image src="/screenshot.png" alt="Feature"  width={400} height={400} />
 *   </FeatureCardContent>
 * </FeatureCard>
 * ```
 *
 * **UX Scenarios:**
 * - Feature comparison grids on pricing/features pages
 * - Product capability showcases
 * - Dashboard widget containers
 * - Bento grid layouts
 */
export function FeatureCard({ children, className }: FeatureCardProps) {
  return (
    <Card className={cn("group relative rounded-none shadow-sm", className)}>
      <FeatureCardDecorator />
      {children}
    </Card>
  );
}

// =============================================================================
// FeatureCardDecorator - Corner brackets
// =============================================================================

/**
 * FeatureCardDecorator - Corner bracket decorations
 *
 * Adds decorative corner brackets to parent card.
 * Automatically included in FeatureCard, but can be used standalone.
 */
export function FeatureCardDecorator() {
  return (
    <>
      <span
        className="absolute -left-px -top-px block size-2 border-l-2 border-t-2 border-primary"
        aria-hidden="true"
      />
      <span
        className="absolute -right-px -top-px block size-2 border-r-2 border-t-2 border-primary"
        aria-hidden="true"
      />
      <span
        className="absolute -bottom-px -left-px block size-2 border-b-2 border-l-2 border-primary"
        aria-hidden="true"
      />
      <span
        className="absolute -bottom-px -right-px block size-2 border-b-2 border-r-2 border-primary"
        aria-hidden="true"
      />
    </>
  );
}

// =============================================================================
// FeatureCardHeader - Icon + title + description header
// =============================================================================

export interface FeatureCardHeaderProps {
  /** Icon component from lucide-react */
  icon: LucideIcon;
  /** Feature title */
  title: string;
  /** Feature description */
  description: string;
  /** Additional className */
  className?: string;
}

/**
 * FeatureCardHeader - Header with icon, title, and description
 *
 * @example
 * ```tsx
 * <FeatureCardHeader
 *   icon={MapIcon}
 *   title="Real time location tracking"
 *   description="Advanced tracking system"
 * />
 * ```
 */
export function FeatureCardHeader({
  icon: Icon,
  title,
  description,
  className,
}: FeatureCardHeaderProps) {
  return (
    <CardHeader className={cn("pb-3", className)}>
      <div className="p-6">
        <span className="flex items-center gap-2 text-muted-foreground">
          <Icon className="size-4" aria-hidden="true" />
          {title}
        </span>
        <p className="mt-8 text-2xl font-semibold text-foreground">{description}</p>
      </div>
    </CardHeader>
  );
}

// =============================================================================
// FeatureCardContent - Re-export with styling
// =============================================================================

export { CardContent as FeatureCardContent };

// =============================================================================
// DualModeImage - Dark/light mode aware image
// =============================================================================

export interface DualModeImageProps {
  /** Image source for dark mode */
  darkSrc: string;
  /** Image source for light mode */
  lightSrc: string;
  /** Alt text for accessibility */
  alt: string;
  /** Image width */
  width?: number;
  /** Image height */
  height?: number;
  /** Additional className */
  className?: string;
}

/**
 * DualModeImage - Theme-aware image component
 *
 * Displays different images based on light/dark mode.
 * Useful for screenshots, illustrations, or any visual
 * that needs different versions per theme.
 *
 * @example
 * ```tsx
 * <DualModeImage
 *   darkSrc="/screenshot-dark.png"
 *   lightSrc="/screenshot-light.png"
 *   alt="Dashboard screenshot"
 *   width={1200}
 *   height={800}
 * />
 * ```
 *
 * **UX Scenarios:**
 * - Product screenshots that match user's theme preference
 * - Documentation images
 * - Marketing visuals with theme variants
 */
export function DualModeImage({
  darkSrc,
  lightSrc,
  alt,
  width,
  height,
  className,
}: DualModeImageProps) {
  return (
    <>
      <Image
        src={darkSrc}
        className={cn("hidden dark:block", className)}
        alt={alt}
        {...(width !== undefined ? { width } : {})}
        {...(height !== undefined ? { height } : {})}
      />
      <Image
        src={lightSrc}
        className={cn("shadow dark:hidden", className)}
        alt={alt}
        {...(width !== undefined ? { width } : {})}
        {...(height !== undefined ? { height } : {})}
      />
    </>
  );
}

// =============================================================================
// CircularUI - Decorative circle patterns
// =============================================================================

type CirclePattern = "none" | "border" | "primary" | "blue";

export interface CircleConfig {
  /** Pattern style for the circle */
  pattern: CirclePattern;
}

export interface CircularUIProps {
  /** Label text below the circles */
  label: string;
  /** Circle configurations */
  circles: CircleConfig[];
  /** Additional className */
  className?: string;
}

/**
 * CircularUI - Decorative overlapping circles
 *
 * Visual element showing overlapping circles with different patterns.
 * Commonly used to represent relationships, sets, or categories.
 *
 * @example
 * ```tsx
 * <CircularUI
 *   label="Inclusion"
 *   circles={[
 *     { pattern: "border" },
 *     { pattern: "primary" }
 *   ]}
 * />
 * ```
 *
 * **UX Scenarios:**
 * - Venn diagram representations
 * - Feature intersection visualizations
 * - Data relationship indicators
 * - Abstract decorative elements
 */
export function CircularUI({ label, circles, className }: CircularUIProps) {
  return (
    <div className={className}>
      <div className="size-fit rounded-[var(--radius-2xl)] bg-gradient-to-b from-border to-transparent p-px">
        <div className="relative flex aspect-square w-fit items-center -space-x-4 rounded-[15px] bg-gradient-to-b from-background to-muted/25 p-4">
          {circles.map((circle, i) => (
            <div
              key={i}
              className={cn("size-7 rounded-full border sm:size-8", {
                "border-primary": circle.pattern === "none",
                "border-primary bg-[repeating-linear-gradient(-45deg,hsl(var(--border)),hsl(var(--border))_1px,transparent_1px,transparent_4px)]":
                  circle.pattern === "border",
                "border-primary bg-background bg-[repeating-linear-gradient(-45deg,hsl(var(--primary)),hsl(var(--primary))_1px,transparent_1px,transparent_4px)]":
                  circle.pattern === "primary",
                "z-[1] border-blue-500 bg-background bg-[repeating-linear-gradient(-45deg,theme(colors.blue.500),theme(colors.blue.500)_1px,transparent_1px,transparent_4px)]":
                  circle.pattern === "blue",
              })}
              aria-hidden="true"
            />
          ))}
        </div>
      </div>
      <span className="mt-1.5 block text-center text-sm text-muted-foreground">{label}</span>
    </div>
  );
}
