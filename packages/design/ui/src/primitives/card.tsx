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
        true: "cursor-pointer",
        false: "",
      },
    },
    // One shadow step up from wherever the variant rests
    // (docs/design-system/hover-motion.md). A single hover:shadow-ambient-md
    // for every variant meant the elevated card — already ambient-md — did
    // nothing under the pointer, and the outline card jumped two steps.
    compoundVariants: [
      { interactive: true, variant: "default", className: "hover:shadow-ambient-md" },
      { interactive: true, variant: "elevated", className: "hover:shadow-ambient-lg" },
      { interactive: true, variant: "outline", className: "hover:shadow-ambient-sm" },
      { interactive: true, variant: "ghost", className: "hover:bg-accent" },
    ],
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
  /**
   * Surface treatment, from the standard elevated card to transparent outline or ghost styles.
   * @default "default"
   */
  variant?: CardVariant;
  /**
   * Insets the entire card; when set, sections use spacing instead of adding their own padding.
   * @default "none"
   */
  padding?: CardPadding;
  /**
   * Adds a pointer cursor and hover treatment; the caller still supplies link or button semantics.
   * @default false
   */
  interactive?: boolean;
}

/** Card surface and padding context shared by the standalone and compound section components. */
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

/** Stacks the card heading and description, adding insets only when the card has no root padding. */
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
  /**
   * Heading level appropriate to the surrounding document hierarchy.
   * @default "h3"
   */
  as?: "h2" | "h3" | "h4" | "h5" | "h6";
  ref?: React.Ref<HTMLHeadingElement> | undefined;
}

/** Card heading with a selectable semantic level; defaults to an h3. */
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
  /**
   * Element or component used for supporting copy; choose a div when the content contains blocks.
   * @default "p"
   */
  as?: React.ElementType;
  ref?: React.Ref<HTMLParagraphElement | HTMLDivElement> | undefined;
}

/** Muted supporting copy below a card heading, rendered as a paragraph unless overridden. */
const CardDescription = ({ className, as: Tag = "p", ref, ...props }: CardDescriptionProps) =>
  React.createElement(Tag, {
    ref,
    className: cn("text-sm leading-relaxed text-muted-foreground", className),
    ...props,
  });
CardDescription.displayName = "CardDescription";

/** Main card content; uses its own insets or top spacing according to the root's padding. */
const CardContent = ({ className, ref, ...props }: DivProps) => {
  const padded = React.use(CardPaddedContext);
  return (
    <div ref={ref} className={cn(padded ? "mt-4 first:mt-0" : "p-6 pt-0", className)} {...props} />
  );
};
CardContent.displayName = "CardContent";

/** Horizontal action row; padded cards receive a top divider and spacing instead of extra insets. */
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
  /**
   * Size of the muted icon tile: 32, 40 or 48 pixels.
   * @default "md"
   */
  size?: "sm" | "md" | "lg";
}

const iconSize = { sm: "size-8", md: "size-10", lg: "size-12" } as const;

/** Muted tile for a card's visual anchor; give meaningful icons a name or mark decoration hidden. */
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

/** Tokenized card surface with sections that adapt their insets to the root padding. */
const Card = Object.assign(CardRoot, {
  /** Stacked heading area that adds padding only when the root does not. */
  Header: CardHeader,
  /** Card heading; select its semantic heading level with `as`. */
  Title: CardTitle,
  /** Muted supporting copy, rendered as a paragraph by default. */
  Description: CardDescription,
  /** Main content section with insets or spacing supplied according to the root padding. */
  Content: CardContent,
  /** Alias of Content for the card's main content section. */
  Body: CardContent,
  /** Action row with a top divider when the root supplies padding. */
  Footer: CardFooter,
  /** Muted icon tile; accessible naming or decorative hiding is the caller's responsibility. */
  Icon: CardIcon,
});

/**
 * Compatibility name for the main card content section, with the same adaptive spacing.
 * @deprecated Alias of CardContent from the former patterns/Card.
 */
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
