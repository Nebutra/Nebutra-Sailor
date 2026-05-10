"use client";

import { ArrowRight } from "lucide-react";
import * as React from "react";
import { cn } from "../utils/cn";

// =============================================================================
// Context
// =============================================================================

interface MicroLandingCardContextValue {
  variant: "default" | "primary" | "compact";
}

const MicroLandingCardContext = React.createContext<MicroLandingCardContextValue | null>(null);

// =============================================================================
// Types
// =============================================================================

export interface MicroLandingCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Card size variant */
  variant?: "default" | "primary" | "compact";
  /** Additional className */
  className?: string;
}

export interface MicroLandingCardHeroProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Hero headline (tension statement) */
  children: React.ReactNode;
}

export interface MicroLandingCardContextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  /** Context/pain point description */
  children: React.ReactNode;
}

export interface MicroLandingCardProofProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Proof content (code, metrics, diagram) */
  children: React.ReactNode;
}

export interface MicroLandingCardActionProps extends React.HTMLAttributes<HTMLAnchorElement> {
  /** CTA link */
  href: string;
  /** CTA text */
  children: React.ReactNode;
}

export interface MicroLandingCardDecoProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Decorative/semantic graphic */
  children: React.ReactNode;
}

// =============================================================================
// Compound Components
// =============================================================================

/**
 * MicroLandingCard - A "micro landing page" card with 5-layer structure
 *
 * @description
 * Each card follows the pattern:
 * - Hero: Opinionated tension statement
 * - Context: Pain point / problem
 * - Proof: Hard evidence (code, metrics, diagram)
 * - Action: Micro-CTA
 * - Deco: Semantic decoration (not illustration)
 *
 * @example
 * ```tsx
 * <MicroLandingCard variant="primary">
 *   <MicroLandingCard.Hero>
 *     Multi-tenancy is a permission boundary—NOT a tenant_id column.
 *   </MicroLandingCard.Hero>
 *   <MicroLandingCard.Context>
 *     90% of SaaS teams stumble on RLS, cache leaks, cross-org access.
 *   </MicroLandingCard.Context>
 *   <MicroLandingCard.Proof>
 *     <CodeSnippet />
 *   </MicroLandingCard.Proof>
 *   <MicroLandingCard.Action href="/docs/multi-tenancy">
 *     View permission map
 *   </MicroLandingCard.Action>
 *   <MicroLandingCard.Deco>
 *     <TenantFlowDiagram />
 *   </MicroLandingCard.Deco>
 * </MicroLandingCard>
 * ```
 */
const MicroLandingCardRoot = React.forwardRef<HTMLDivElement, MicroLandingCardProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    return (
      <MicroLandingCardContext.Provider value={{ variant }}>
        <div
          ref={ref}
          className={cn(
            "group relative flex flex-col overflow-hidden rounded-[var(--radius-xl)] border border-border bg-card",
            // Variant styles
            variant === "primary" && "row-span-2",
            variant === "compact" && "min-h-[280px]",
            variant === "default" && "min-h-[320px]",
            className,
          )}
          {...props}
        >
          {children}
        </div>
      </MicroLandingCardContext.Provider>
    );
  },
);
MicroLandingCardRoot.displayName = "MicroLandingCard";

/**
 * Hero - Opinionated tension statement
 */
const MicroLandingCardHero = React.forwardRef<HTMLDivElement, MicroLandingCardHeroProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("px-5 pt-5", className)} {...props}>
        <h3 className="text-base font-semibold leading-snug text-foreground md:text-lg">
          {children}
        </h3>
      </div>
    );
  },
);
MicroLandingCardHero.displayName = "MicroLandingCard.Hero";

/**
 * Context - Pain point description
 */
const MicroLandingCardContextComponent = React.forwardRef<
  HTMLParagraphElement,
  MicroLandingCardContextProps
>(({ className, children, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn("px-5 pt-2 text-sm leading-relaxed text-muted-foreground", className)}
      {...props}
    >
      {children}
    </p>
  );
});
MicroLandingCardContextComponent.displayName = "MicroLandingCard.Context";

/**
 * Proof - Hard evidence layer (code, metrics, diagram)
 */
const MicroLandingCardProof = React.forwardRef<HTMLDivElement, MicroLandingCardProofProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("flex-1 px-5 pt-4", className)} {...props}>
        {children}
      </div>
    );
  },
);
MicroLandingCardProof.displayName = "MicroLandingCard.Proof";

/**
 * Action - Micro CTA
 */
const MicroLandingCardAction = React.forwardRef<HTMLAnchorElement, MicroLandingCardActionProps>(
  ({ className, href, children, ...props }, ref) => {
    return (
      <a
        ref={ref}
        href={href}
        className={cn(
          "group/action mx-5 mb-5 mt-auto inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80",
          className,
        )}
        {...props}
      >
        {children}
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/action:translate-x-0.5" />
      </a>
    );
  },
);
MicroLandingCardAction.displayName = "MicroLandingCard.Action";

/**
 * Deco - Semantic decoration layer (absolute positioned)
 */
const MicroLandingCardDeco = React.forwardRef<HTMLDivElement, MicroLandingCardDecoProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);
MicroLandingCardDeco.displayName = "MicroLandingCard.Deco";

// =============================================================================
// Compound Export
// =============================================================================

export const MicroLandingCard = Object.assign(MicroLandingCardRoot, {
  Hero: MicroLandingCardHero,
  Context: MicroLandingCardContextComponent,
  Proof: MicroLandingCardProof,
  Action: MicroLandingCardAction,
  Deco: MicroLandingCardDeco,
});

// Named exports
export {
  MicroLandingCardAction,
  MicroLandingCardContextComponent as MicroLandingCardContext,
  MicroLandingCardDeco,
  MicroLandingCardHero,
  MicroLandingCardProof,
  MicroLandingCardRoot,
};
