import type React from "react";
import { cn } from "../utils/cn";

/**
 * PricingCard - A composable pricing card component for subscription/plan displays
 *
 * @description
 * Multi-part component for building pricing cards with flexible layouts.
 * Supports glass effect headers, badges, price display with strikethrough,
 * and feature lists with separators.
 *
 * @example
 * ```tsx
 * <PricingCard.Card>
 *   <PricingCard.Header>
 *     <PricingCard.Plan>
 *       <PricingCard.PlanName><Icon />Pro</PricingCard.PlanName>
 *       <PricingCard.Badge>Popular</PricingCard.Badge>
 *     </PricingCard.Plan>
 *     <PricingCard.Price>
 *       <PricingCard.MainPrice>$29</PricingCard.MainPrice>
 *       <PricingCard.Period>/month</PricingCard.Period>
 *     </PricingCard.Price>
 *   </PricingCard.Header>
 *   <PricingCard.Body>
 *     <PricingCard.List>
 *       <PricingCard.ListItem>Feature 1</PricingCard.ListItem>
 *     </PricingCard.List>
 *   </PricingCard.Body>
 * </PricingCard.Card>
 * ```
 */

function PricingCardRoot({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "bg-card relative w-full max-w-xs rounded-[var(--radius-xl)] dark:bg-transparent",
        "p-1.5 shadow-xl backdrop-blur-xl",
        "dark:border-border/80 border",
        className,
      )}
      {...props}
    />
  );
}

function PricingCardHeader({
  className,
  children,
  glassEffect = true,
  ...props
}: React.ComponentProps<"div"> & {
  /** Enable glass gradient overlay effect */
  glassEffect?: boolean;
}) {
  return (
    <div
      className={cn(
        "bg-muted/80 dark:bg-muted/50 relative mb-4 rounded-[var(--radius-xl)] border p-4",
        className,
      )}
      {...props}
    >
      {/* Top glass gradient */}
      {glassEffect && (
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-48 rounded-[inherit]"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 40%, rgba(0,0,0,0) 100%)",
          }}
        />
      )}
      {children}
    </div>
  );
}

function PricingCardPlan({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mb-8 flex items-center justify-between", className)} {...props} />;
}

function PricingCardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-muted-foreground text-xs", className)} {...props} />;
}

function PricingCardPlanName({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "text-muted-foreground flex items-center gap-2 text-sm font-medium [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function PricingCardBadge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "border-foreground/20 text-foreground/80 rounded-full border px-2 py-0.5 text-xs",
        className,
      )}
      {...props}
    />
  );
}

function PricingCardPrice({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mb-3 flex items-end gap-1", className)} {...props} />;
}

function PricingCardMainPrice({ className, ...props }: React.ComponentProps<"span">) {
  return <span className={cn("text-3xl font-extrabold tracking-tight", className)} {...props} />;
}

function PricingCardPeriod({ className, ...props }: React.ComponentProps<"span">) {
  return <span className={cn("text-foreground/80 pb-1 text-sm", className)} {...props} />;
}

function PricingCardOriginalPrice({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn("text-muted-foreground mr-1 ml-auto text-lg line-through", className)}
      {...props}
    />
  );
}

function PricingCardBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("space-y-6 p-3", className)} {...props} />;
}

function PricingCardList({ className, ...props }: React.ComponentProps<"ul">) {
  return <ul className={cn("space-y-3", className)} {...props} />;
}

function PricingCardListItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      className={cn("text-muted-foreground flex items-start gap-3 text-sm", className)}
      {...props}
    />
  );
}

function PricingCardSeparator({
  children = "Upgrade to access",
  className,
  ...props
}: React.ComponentProps<"div"> & {
  children?: string;
  className?: string;
}) {
  return (
    <div
      className={cn("text-muted-foreground flex items-center gap-3 text-sm", className)}
      {...props}
    >
      <span className="bg-muted-foreground/40 h-[1px] flex-1" />
      <span className="text-muted-foreground shrink-0">{children}</span>
      <span className="bg-muted-foreground/40 h-[1px] flex-1" />
    </div>
  );
}

// Export as namespace for dot-notation usage
export const PricingCard = {
  Card: PricingCardRoot,
  Header: PricingCardHeader,
  Description: PricingCardDescription,
  Plan: PricingCardPlan,
  PlanName: PricingCardPlanName,
  Badge: PricingCardBadge,
  Price: PricingCardPrice,
  MainPrice: PricingCardMainPrice,
  Period: PricingCardPeriod,
  OriginalPrice: PricingCardOriginalPrice,
  Body: PricingCardBody,
  List: PricingCardList,
  ListItem: PricingCardListItem,
  Separator: PricingCardSeparator,
};

// Also export individual components for flexibility
export {
  PricingCardBadge,
  PricingCardBody,
  PricingCardDescription,
  PricingCardHeader,
  PricingCardList,
  PricingCardListItem,
  PricingCardMainPrice,
  PricingCardOriginalPrice,
  PricingCardPeriod,
  PricingCardPlan,
  PricingCardPlanName,
  PricingCardPrice,
  PricingCardRoot,
  PricingCardSeparator,
};
