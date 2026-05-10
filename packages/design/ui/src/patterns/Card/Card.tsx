"use client";

import * as React from "react";
import { cn } from "../../utils/cn";

/* ─────────────────────────────────────────────────────────────────────────────
 * Card Compound Component
 *
 * A flexible, composable card system following compound component pattern.
 * Supports multiple variants and semantic subcomponents.
 *
 * Usage:
 * <Card variant="elevated">
 *   <Card.Header>
 *     <Card.Icon><IconComponent /></Card.Icon>
 *     <Card.Title>Title</Card.Title>
 *   </Card.Header>
 *   <Card.Body>
 *     <Card.Description>Description text</Card.Description>
 *   </Card.Body>
 *   <Card.Footer>Footer content</Card.Footer>
 * </Card>
 * ───────────────────────────────────────────────────────────────────────────── */

type CardVariant = "default" | "elevated" | "bordered" | "ghost" | "gradient";
type CardPadding = "none" | "sm" | "md" | "lg";

interface CardContextValue {
  variant: CardVariant;
}

const CardContext = React.createContext<CardContextValue | null>(null);

// Reserved for future use when subcomponents need parent context
// function useCardContext() {
//   const context = React.useContext(CardContext);
//   if (!context) {
//     throw new Error("Card subcomponents must be used within a Card component");
//   }
//   return context;
// }

/* ─────────────────────────────────────────────────────────────────────────── */

const paddingMap: Record<CardPadding, string> = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

const variantStyles: Record<CardVariant, string> = {
  default: "bg-card border border-border",
  elevated: "bg-card border border-border shadow-lg",
  bordered: "bg-transparent border-2 border-border",
  ghost: "bg-transparent",
  gradient: "bg-gradient-to-br from-card to-muted border border-border",
};

/* ─────────────────────────────────────────────────────────────────────────── */

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  asChild?: boolean;
}

const CardRoot = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", padding = "md", children, ...props }, ref) => {
    return (
      <CardContext.Provider value={{ variant }}>
        <div
          ref={ref}
          className={cn(
            "rounded-[var(--radius-xl)] transition-all duration-200",
            variantStyles[variant],
            paddingMap[padding],
            className,
          )}
          {...props}
        >
          {children}
        </div>
      </CardContext.Provider>
    );
  },
);
CardRoot.displayName = "Card";

/* ─────────────────────────────────────────────────────────────────────────── */

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  spacing?: "sm" | "md" | "lg";
}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, spacing: gap = "md", children, ...props }, ref) => {
    const gapMap = { sm: "gap-2", md: "gap-3", lg: "gap-4" };

    return (
      <div ref={ref} className={cn("flex items-start", gapMap[gap], className)} {...props}>
        {children}
      </div>
    );
  },
);
CardHeader.displayName = "Card.Header";

/* ─────────────────────────────────────────────────────────────────────────── */

export type CardBodyProps = React.HTMLAttributes<HTMLDivElement>;

const CardBody = React.forwardRef<HTMLDivElement, CardBodyProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("mt-4", className)} {...props}>
        {children}
      </div>
    );
  },
);
CardBody.displayName = "Card.Body";

/* ─────────────────────────────────────────────────────────────────────────── */

export type CardFooterProps = React.HTMLAttributes<HTMLDivElement>;

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("mt-6 pt-4 border-t border-border/50", className)} {...props}>
        {children}
      </div>
    );
  },
);
CardFooter.displayName = "Card.Footer";

/* ─────────────────────────────────────────────────────────────────────────── */

export interface CardIconProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
}

const CardIcon = React.forwardRef<HTMLDivElement, CardIconProps>(
  ({ className, size = "md", children, ...props }, ref) => {
    const sizeMap = {
      sm: "w-8 h-8",
      md: "w-10 h-10",
      lg: "w-12 h-12",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-center rounded-[var(--radius-lg)] bg-muted/50 shrink-0",
          sizeMap[size],
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);
CardIcon.displayName = "Card.Icon";

/* ─────────────────────────────────────────────────────────────────────────── */

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: "h2" | "h3" | "h4" | "h5" | "h6";
}

const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, as: Tag = "h3", children, ...props }, ref) => {
    return (
      <Tag ref={ref} className={cn("text-lg font-semibold text-foreground", className)} {...props}>
        {children}
      </Tag>
    );
  },
);
CardTitle.displayName = "Card.Title";

/* ─────────────────────────────────────────────────────────────────────────── */

export interface CardDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement | HTMLDivElement> {
  as?: React.ElementType;
}

const CardDescription = React.forwardRef<
  HTMLParagraphElement | HTMLDivElement,
  CardDescriptionProps
>(({ className, as: Tag = "p", children, ...props }, ref) => {
  return React.createElement(
    Tag,
    {
      ref,
      className: cn("text-sm text-muted-foreground leading-relaxed", className),
      ...props,
    },
    children,
  );
});
CardDescription.displayName = "Card.Description";

/* ─────────────────────────────────────────────────────────────────────────── */

// Compound component assembly
export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Body: CardBody,
  Footer: CardFooter,
  Icon: CardIcon,
  Title: CardTitle,
  Description: CardDescription,
});

// Named exports for direct imports
export { CardBody, CardDescription, CardFooter, CardHeader, CardIcon, CardRoot, CardTitle };
