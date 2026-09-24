"use client";

import * as React from "react";
import { cn } from "../utils/cn";

const Card = ({
  className,
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> | undefined }) => (
  <div
    ref={ref}
    className={cn(
      // Surface + elevation come from the rails a Brand Package can retarget:
      // --radius-card, --elevation-card, and the mode-aware --edge-soft hairline.
      // The previous `border border-border shadow-sm` was a fixed Tailwind step,
      // so a language could change every button radius but not a card's, and
      // dark mode drew a heavier outline than the elevation it sat on.
      "rounded-[var(--radius-card,var(--radius-lg))] bg-card text-card-foreground",
      "shadow-[0_0_0_1px_var(--edge-soft),var(--elevation-card)]",
      className,
    )}
    {...props}
  />
);
Card.displayName = "Card";

const CardHeader = ({
  className,
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> | undefined }) => (
  <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
);
CardHeader.displayName = "CardHeader";

const CardTitle = ({
  className,
  children,
  ref,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement> & {
  ref?: React.Ref<HTMLHeadingElement> | undefined;
}) => (
  <h3
    ref={ref}
    className={cn("text-2xl font-semibold leading-tight tracking-tight", className)}
    {...props}
  >
    {children}
  </h3>
);
CardTitle.displayName = "CardTitle";

export interface CardDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement | HTMLDivElement> {
  as?: React.ElementType;
}

const CardDescription = ({
  className,
  as: Tag = "p",
  ref,
  ...props
}: CardDescriptionProps & {
  ref?: React.Ref<HTMLParagraphElement | HTMLDivElement> | undefined;
}) => {
  return React.createElement(Tag, {
    ref,
    className: cn("text-sm text-muted-foreground", className),
    ...props,
  });
};
CardDescription.displayName = "CardDescription";

const CardContent = ({
  className,
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> | undefined }) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
);
CardContent.displayName = "CardContent";

const CardFooter = ({
  className,
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> | undefined }) => (
  <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
);
CardFooter.displayName = "CardFooter";

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
