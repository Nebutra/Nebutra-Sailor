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
      "rounded-[var(--radius-lg)] border border-border bg-card text-card-foreground shadow-sm",
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
    className={cn("text-2xl font-semibold leading-none tracking-tight", className)}
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
