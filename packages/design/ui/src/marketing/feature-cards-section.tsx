"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  type CircleConfig,
  CircularUI,
  DualModeImage,
  FeatureCard,
  FeatureCardContent,
  FeatureCardHeader,
} from "../primitives/feature-card";
import { cn } from "../utils/cn";

// =============================================================================
// Types
// =============================================================================

export interface FeatureCardItem {
  /** Icon component from lucide-react */
  icon?: LucideIcon;
  /** Feature title */
  title?: string;
  /** Feature description */
  description: string;
  /** Dark mode image URL */
  darkImage?: string;
  /** Light mode image URL */
  lightImage?: string;
  /** Image alt text */
  imageAlt?: string;
  /** Custom content instead of image */
  content?: ReactNode;
  /** Whether this card spans full width (2 columns) */
  fullWidth?: boolean;
}

export interface FeatureCardsSectionProps {
  /** Array of feature cards to display */
  cards: FeatureCardItem[];
  /** Additional className for the section */
  className?: string;
}

// =============================================================================
// FeatureCardsSection - Bento-style feature grid
// =============================================================================

/**
 * FeatureCardsSection - Bento-style feature cards with corner decorators
 *
 * A responsive grid of feature cards with decorative corner brackets.
 * Supports dual-mode images (light/dark), custom content, and full-width cards.
 *
 * @example
 * ```tsx
 * <FeatureCardsSection
 *   cards={[
 *     {
 *       icon: MapIcon,
 *       title: "Real time tracking",
 *       description: "Advanced tracking system",
 *       darkImage: "/tracking-dark.png",
 *       lightImage: "/tracking-light.png",
 *     },
 *     {
 *       icon: CalendarIcon,
 *       title: "Scheduling",
 *       description: "Smart scheduling",
 *       darkImage: "/calendar-dark.png",
 *       lightImage: "/calendar-light.png",
 *     },
 *     {
 *       description: "Smart scheduling with automated reminders",
 *       fullWidth: true,
 *       content: <CircularUIRow items={[...]} />
 *     }
 *   ]}
 * />
 * ```
 *
 * **UX Scenarios:**
 * - Product feature pages with visual demos
 * - Capability overviews with screenshots
 * - Bento-style feature grids
 * - Landing page feature sections
 */
export function FeatureCardsSection({ cards, className }: FeatureCardsSectionProps) {
  return (
    <section className={cn("bg-[var(--neutral-2)] py-16 dark:bg-transparent md:py-32", className)}>
      <div className="mx-auto max-w-2xl px-6 lg:max-w-5xl">
        <div className="mx-auto grid gap-4 lg:grid-cols-2">
          {cards.map((card, index) => (
            <FeatureCard key={index} className={cn(card.fullWidth && "p-6 lg:col-span-2")}>
              {/* Standard card with header + image/content */}
              {!card.fullWidth && card.icon && card.title && (
                <>
                  <FeatureCardHeader
                    icon={card.icon}
                    title={card.title}
                    description={card.description}
                  />
                  {card.darkImage && card.lightImage && (
                    <div className="relative mb-6 border-t border-dashed sm:mb-0">
                      <div className="absolute inset-0 [background:radial-gradient(125%_125%_at_50%_0%,transparent_40%,hsl(var(--muted)),white_125%)]" />
                      <div className="aspect-[76/59] p-1 px-6">
                        <DualModeImage
                          darkSrc={card.darkImage}
                          lightSrc={card.lightImage}
                          alt={card.imageAlt || card.title || "Feature"}
                          width={1207}
                          height={929}
                        />
                      </div>
                    </div>
                  )}
                  {card.content && (
                    <FeatureCardContent>
                      <div className="relative mb-6 sm:mb-0">
                        <div className="absolute -inset-6 [background:radial-gradient(50%_50%_at_75%_50%,transparent,hsl(var(--background))_100%)]" />
                        {card.content}
                      </div>
                    </FeatureCardContent>
                  )}
                </>
              )}

              {/* Full-width card with centered content */}
              {card.fullWidth && (
                <>
                  <p className="mx-auto my-6 max-w-md text-balance text-center text-2xl font-semibold">
                    {card.description}
                  </p>
                  {card.content}
                </>
              )}
            </FeatureCard>
          ))}
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// CircularUIRow - Row of CircularUI elements
// =============================================================================

export interface CircularUIRowProps {
  /** Array of circular UI configurations */
  items: Array<{
    label: string;
    circles: CircleConfig[];
    hiddenOnMobile?: boolean;
  }>;
  /** Additional className */
  className?: string;
}

/**
 * CircularUIRow - Row of decorative circle patterns
 *
 * A horizontal row of CircularUI elements for visual decoration.
 * Commonly used in footer sections of feature showcases.
 *
 * @example
 * ```tsx
 * <CircularUIRow
 *   items={[
 *     { label: "Inclusion", circles: [{ pattern: "border" }, { pattern: "border" }] },
 *     { label: "Join", circles: [{ pattern: "blue" }, { pattern: "none" }] },
 *   ]}
 * />
 * ```
 */
export function CircularUIRow({ items, className }: CircularUIRowProps) {
  return (
    <div className={cn("flex justify-center gap-6 overflow-hidden", className)}>
      {items.map((item, index) => (
        <CircularUI
          key={index}
          label={item.label}
          circles={item.circles}
          className={cn(item.hiddenOnMobile && "hidden sm:block")}
        />
      ))}
    </div>
  );
}
