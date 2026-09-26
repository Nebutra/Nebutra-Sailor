"use client";

/**
 * Card — the one card surface.
 *
 * There used to be three: this file, `layout/Card` (bg-background — the House
 * canvas colour, so a card vanished into the page — a fixed shadow-sm and a
 * built-in p-4) and `patterns/Card` (a fixed radius-xl and its own variants
 * and compound parts). A Brand Package could restyle only this one. The other
 * two now re-export it.
 *
 * Surface and elevation come from the rails a Brand Package retargets:
 * --radius-card, the mode-aware --edge-soft hairline (a 1px ring, which
 * Tailwind composes with the shadow), --elevation-card and the ambient ramp.
 *
 * Two ways to lay it out, one set of parts:
 *   - Sections pad themselves (padding="none", the default):
 *       <Card><CardHeader><CardTitle/></CardHeader><CardContent/></Card>
 *   - The card pads, sections only space themselves:
 *       <Card padding="md"><Card.Header><Card.Title/></Card.Header><Card.Body/></Card>
 *   The parts read the card's padding from context, so neither form doubles it.
 */

import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "../utils/cn";

const cardVariants = cva(
  "rounded-[var(--radius-card,var(--radius-lg))] text-card-foreground transition-[box-shadow,background-color] duration-micro",
  {
    variants: {
      variant: {
        default: "bg-card shadow-[var(--elevation-card)] ring-1 ring-[var(--edge-soft)]",
        elevated: "bg-card shadow-ambient-md ring-1 ring-[var(--edge-soft)]",
        outline: "bg-transparent ring-1 ring-border",
        ghost: "bg-transparent",
      },
      padding: {
        none: "",
        sm: "p-4",
        md: "p-6",
        lg: "p-8",
      },
      interactive: {
        true: "cursor-pointer hover:shadow-ambient-md",
        false: "",
      },
    },
    defaultVariants: { variant: "default", padding: "none", interactive: false },
  },
);

type CardVariant = NonNullable<VariantProps<typeof cardVariants>["variant"]>;
type CardPadding = NonNullable<VariantProps<typeof cardVariants>["padding"]>;

/** Whether the card pads itself — its parts then only space themselves. */
const CardPaddedContext = React.createContext(false);

type DivProps = React.HTMLAttributes<HTMLDivElement> & {
  ref?: React.Ref<HTMLDivElement> | undefined;
};

export interface CardProps extends DivProps {
  variant?: CardVariant;
  padding?: CardPadding;
  /** Hover lift for a card that is itself a link or button target. */
  interactive?: boolean;
}

const CardRoot = ({
  className,
  variant,
  padding = "none",
  interactive,
  ref,
  ...props
}: CardProps) => (
  <CardPaddedContext.Provider value={padding !== "none"}>
    <div
      ref={ref}
      className={cn(cardVariants({ variant, padding, interactive }), className)}
      {...props}
    />
  </CardPaddedContext.Provider>
);
CardRoot.displayName = "Card";

const CardHeader = ({ className, ref, ...props }: DivProps) => {
  const padded = React.use(CardPaddedContext);
  return (
    <div
      ref={ref}
      className={cn("flex flex-col gap-1.5", !padded && "p-6", className)}
      {...props}
    />
  );
};
CardHeader.displayName = "CardHeader";

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: "h2" | "h3" | "h4" | "h5" | "h6";
  ref?: React.Ref<HTMLHeadingElement> | undefined;
}

const CardTitle = ({ className, as: Tag = "h3", ref, ...props }: CardTitleProps) => (
  <Tag
    ref={ref}
    className={cn("text-lg font-semibold leading-tight tracking-tight text-foreground", className)}
    {...props}
  />
);
CardTitle.displayName = "CardTitle";

export interface CardDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement | HTMLDivElement> {
  as?: React.ElementType;
  ref?: React.Ref<HTMLParagraphElement | HTMLDivElement> | undefined;
}

const CardDescription = ({ className, as: Tag = "p", ref, ...props }: CardDescriptionProps) =>
  React.createElement(Tag, {
    ref,
    className: cn("text-sm leading-relaxed text-muted-foreground", className),
    ...props,
  });
CardDescription.displayName = "CardDescription";

const CardContent = ({ className, ref, ...props }: DivProps) => {
  const padded = React.use(CardPaddedContext);
  return (
    <div ref={ref} className={cn(padded ? "mt-4 first:mt-0" : "p-6 pt-0", className)} {...props} />
  );
};
CardContent.displayName = "CardContent";

const CardFooter = ({ className, ref, ...props }: DivProps) => {
  const padded = React.use(CardPaddedContext);
  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center",
        padded ? "mt-6 border-t border-border/50 pt-4 first:mt-0" : "p-6 pt-0",
        className,
      )}
      {...props}
    />
  );
};
CardFooter.displayName = "CardFooter";

export interface CardIconProps extends DivProps {
  size?: "sm" | "md" | "lg";
}

const iconSize = { sm: "size-8", md: "size-10", lg: "size-12" } as const;

const CardIcon = ({ className, size = "md", ref, ...props }: CardIconProps) => (
  <div
    ref={ref}
    className={cn(
      "flex shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-muted/50",
      iconSize[size],
      className,
    )}
    {...props}
  />
);
CardIcon.displayName = "CardIcon";

export type CardHeaderProps = DivProps;
export type CardContentProps = DivProps;
export type CardBodyProps = DivProps;
export type CardFooterProps = DivProps;

/** Compound form: Card.Header, Card.Title, Card.Body (= CardContent), … */
const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Title: CardTitle,
  Description: CardDescription,
  Content: CardContent,
  Body: CardContent,
  Footer: CardFooter,
  Icon: CardIcon,
});

/** @deprecated Alias of CardContent from the former patterns/Card. */
const CardBody = CardContent;

export {
  Card,
  CardBody,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardIcon,
  CardRoot,
  CardTitle,
  cardVariants,
};
