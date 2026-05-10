"use client";

import type React from "react";
import { cn } from "../utils";

// =============================================================================
// Types
// =============================================================================

/**
 * Individual card item data
 */
export interface BentoCardItem {
  /** Card title */
  title: string;
  /** Card description text */
  description: string;
  /** Optional link URL - wraps card in Link if provided */
  href?: string;
  /** Grid column span for lg breakpoint (1-6) */
  colSpan?: number;
  /** Grid row span for lg breakpoint */
  rowSpan?: number;
  /** Additional className for the card */
  className?: string;
}

/**
 * Props for the PlusCard primitive component
 *
 * @description
 * A card component with decorative plus icons at each corner, creating a unique
 * visual connection point aesthetic. Best used in bento grid layouts.
 *
 * **UX Scenarios:**
 * - Feature showcase grids with varying card sizes
 * - Dashboard stat cards with visual hierarchy
 * - Service/offering displays with connection metaphor
 * - Portfolio item cards with linked navigation
 */
export interface PlusCardProps {
  /** Card title */
  title: string;
  /** Card description */
  description: string;
  /** Additional CSS classes */
  className?: string;
  /** Optional link - if provided, card content is wrapped in anchor */
  href?: string;
  /** Link target attribute */
  target?: "_blank" | "_self" | "_parent" | "_top";
  /** Children to render instead of default title/description */
  children?: React.ReactNode;
}

/**
 * Props for the BentoCards section component
 *
 * @description
 * A flexible bento grid layout for showcasing features, services, or content cards.
 * Supports variable grid spans for creating visual hierarchy.
 *
 * **UX Scenarios:**
 * - Landing page feature sections with mixed card sizes
 * - Product capability showcases
 * - Service offering grids with emphasis on key items
 * - Content hub layouts with featured + secondary items
 *
 * **Layout Options:**
 * - Default 6-column grid on desktop, 2-column tablet, 1-column mobile
 * - Cards can span 1-6 columns and multiple rows
 * - Optional footer section for headlines/CTAs
 */
export interface BentoCardsProps {
  /** Array of card items to display */
  cards: BentoCardItem[];
  /** Optional footer headline */
  footerHeadline?: string;
  /** Optional footer description */
  footerDescription?: string;
  /** Container className */
  className?: string;
  /** Cards grid className */
  gridClassName?: string;
  /** Whether to show outer border */
  showBorder?: boolean;
}

// =============================================================================
// Primitives
// =============================================================================

/**
 * Decorative plus icon used at card corners
 */
export const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    width={24}
    height={24}
    strokeWidth="1"
    stroke="currentColor"
    className={cn("size-6 text-foreground", className)}
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
  </svg>
);

/**
 * Corner plus icons decorator - renders 4 plus icons at absolute corners
 */
export const CornerPlusIcons: React.FC = () => (
  <>
    <PlusIcon className="absolute -top-3 -left-3" />
    <PlusIcon className="absolute -top-3 -right-3" />
    <PlusIcon className="absolute -bottom-3 -left-3" />
    <PlusIcon className="absolute -bottom-3 -right-3" />
  </>
);

/**
 * PlusCard - A card with decorative plus icons at corners
 *
 * Can be used standalone or as part of BentoCards grid.
 */
export const PlusCard: React.FC<PlusCardProps> = ({
  className,
  title,
  description,
  href,
  target,
  children,
}) => {
  const content = children ?? (
    <div className="relative z-10 space-y-2">
      <h3 className="text-xl font-bold text-foreground">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );

  const cardClasses = cn(
    "relative rounded-[var(--radius-lg)] border border-dashed border-border bg-background p-6",
    "flex min-h-[200px] flex-col justify-between",
    className,
  );

  if (href) {
    return (
      <div className={cardClasses}>
        <a
          href={href}
          target={target}
          rel={target === "_blank" ? "noopener noreferrer" : undefined}
          className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <CornerPlusIcons />
          {content}
        </a>
      </div>
    );
  }

  return (
    <div className={cardClasses}>
      <CornerPlusIcons />
      {content}
    </div>
  );
};

// =============================================================================
// Main Component
// =============================================================================

/**
 * BentoCards - A bento grid layout for feature/content cards
 *
 * @example
 * ```tsx
 * <BentoCards
 *   cards={[
 *     { title: "Feature 1", description: "...", colSpan: 3, rowSpan: 2 },
 *     { title: "Feature 2", description: "...", colSpan: 2, rowSpan: 2 },
 *     { title: "Feature 3", description: "...", colSpan: 4 },
 *     { title: "Feature 4", description: "...", colSpan: 2 },
 *   ]}
 *   footerHeadline="Built for performance"
 *   footerDescription="High-performing websites with lightning speed."
 * />
 * ```
 */
export const BentoCards: React.FC<BentoCardsProps> = ({
  cards,
  footerHeadline,
  footerDescription,
  className,
  gridClassName,
  showBorder = true,
}) => {
  return (
    <section className={cn(showBorder && "border border-border bg-background", className)}>
      <div
        className={cn(
          "container mx-auto px-4 py-12",
          showBorder && "border-x border-b border-border",
        )}
      >
        {/* Responsive Grid */}
        <div
          className={cn(
            "grid auto-rows-auto grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6",
            gridClassName,
          )}
        >
          {cards.map((card, index) => (
            <PlusCard
              key={index}
              title={card.title}
              description={card.description}
              href={card.href}
              className={cn(
                card.colSpan && `lg:col-span-${card.colSpan}`,
                card.rowSpan && `lg:row-span-${card.rowSpan}`,
                card.className,
              )}
            />
          ))}
        </div>

        {/* Optional Footer Section */}
        {(footerHeadline || footerDescription) && (
          <div className="ml-auto mt-6 max-w-2xl px-4 text-right lg:-mt-20">
            {footerHeadline && (
              <h2 className="mb-4 text-4xl font-bold text-foreground md:text-6xl">
                {footerHeadline}
              </h2>
            )}
            {footerDescription && (
              <p className="text-lg text-muted-foreground">{footerDescription}</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default BentoCards;
