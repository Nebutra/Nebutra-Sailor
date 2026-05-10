"use client";

import { ArrowRight } from "lucide-react";
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { cn } from "../utils";
import { Button } from "./button";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for BentoGrid container
 *
 * @description
 * A responsive grid container for bento-style feature showcases.
 * Default is 3-column layout with auto-rows.
 *
 * **UX Scenarios:**
 * - Feature showcase sections
 * - Product capability grids
 * - Dashboard widget layouts
 * - Portfolio galleries
 * - Service offering displays
 */
export interface BentoGridProps extends ComponentPropsWithoutRef<"div"> {
  children: ReactNode;
  className?: string;
}

/**
 * Props for BentoCard item
 *
 * @description
 * Individual card within the BentoGrid with background slot, icon,
 * title, description, and hover-reveal CTA.
 *
 * **Features:**
 * - Background slot for custom content (images, animations, etc.)
 * - Icon with scale animation on hover
 * - Text content slides up on hover (desktop)
 * - CTA button reveals on hover (desktop), always visible on mobile
 */
export interface BentoCardProps extends ComponentPropsWithoutRef<"div"> {
  /** Card title */
  name: string;
  /** Card description */
  description: string;
  /** Icon component to display */
  Icon: React.ElementType;
  /** Background content (images, animations, gradients) */
  background?: ReactNode;
  /** Link URL for CTA */
  href?: string;
  /** CTA button text */
  cta?: string;
  /** Additional className for grid span control */
  className?: string;
}

// =============================================================================
// Components
// =============================================================================

/**
 * BentoGrid - Container for bento-style grid layouts
 *
 * @example
 * ```tsx
 * <BentoGrid className="lg:grid-cols-3">
 *   <BentoCard
 *     name="Feature 1"
 *     description="Description here"
 *     Icon={Sparkles}
 *     className="lg:col-span-2"
 *   />
 *   <BentoCard ... />
 * </BentoGrid>
 * ```
 */
export const BentoGrid = ({ children, className, ...props }: BentoGridProps) => {
  return (
    <div
      className={cn(
        "grid w-full auto-rows-[22rem] grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * BentoCard - Individual card with hover effects
 *
 * @example
 * ```tsx
 * <BentoCard
 *   name="AI Integration"
 *   description="Seamlessly integrate AI into your workflow"
 *   Icon={Brain}
 *   background={<GradientBackground />}
 *   href="/features/ai"
 *   cta="Learn more"
 *   className="lg:col-span-2 lg:row-span-2"
 * />
 * ```
 */
export const BentoCard = ({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta = "Learn more",
  ...props
}: BentoCardProps) => {
  const IconComponent = Icon as ElementType<{ className?: string }>;
  return (
    <div
      className={cn(
        "group relative col-span-1 flex flex-col justify-between overflow-hidden rounded-[var(--radius-xl)]",
        // Light styles
        "bg-background [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]",
        // Dark styles
        "transform-gpu dark:bg-background dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]",
        className,
      )}
      {...props}
    >
      {/* Background slot */}
      <div>{background}</div>

      {/* Content */}
      <div className="p-4">
        <div className="pointer-events-none z-10 flex transform-gpu flex-col gap-1 transition-all duration-300 lg:group-hover:-translate-y-10">
          <IconComponent className="h-12 w-12 origin-left transform-gpu text-muted-foreground transition-all duration-300 ease-in-out group-hover:scale-75" />
          <h3 className="text-xl font-semibold text-foreground">{name}</h3>
          <p className="max-w-lg text-muted-foreground">{description}</p>
        </div>

        {/* Mobile CTA (always visible) */}
        {href && (
          <div className="pointer-events-none flex w-full translate-y-0 transform-gpu flex-row items-center transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 lg:hidden">
            <Button variant="link" asChild size="sm" className="pointer-events-auto p-0">
              <a href={href}>
                {cta}
                <ArrowRight className="ms-2 h-4 w-4 rtl:rotate-180" />
              </a>
            </Button>
          </div>
        )}
      </div>

      {/* Desktop CTA (reveals on hover) */}
      {href && (
        <div className="pointer-events-none absolute bottom-0 hidden w-full translate-y-10 transform-gpu flex-row items-center p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 lg:flex">
          <Button variant="link" asChild size="sm" className="pointer-events-auto p-0">
            <a href={href}>
              {cta}
              <ArrowRight className="ms-2 h-4 w-4 rtl:rotate-180" />
            </a>
          </Button>
        </div>
      )}

      {/* Hover overlay */}
      <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-black/[.03] group-hover:dark:bg-muted/50" />
    </div>
  );
};

export default BentoGrid;
