"use client";

import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "../utils/cn";

// ─── Variants ─────────────────────────────────────────────────────────────────

const badgeVariants = cva(
  "inline-flex justify-center items-center align-middle shrink-0 rounded-full font-sans font-medium whitespace-nowrap tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-transparent",
  {
    variants: {
      variant: {
        // ─── Semantic / brand variants ────────────────────────────────────────
        // Recipe-driven default (solid | outline | … via --badge-default-*)
        default: "badge-brand-default border",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "border-border text-foreground",
        success: "border-transparent bg-success text-success-foreground hover:bg-success/80",
        warning: "border-transparent bg-warning text-warning-foreground hover:bg-warning/80",
        info: "border-transparent bg-info text-info-foreground hover:bg-info/80",
        error:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        // ─── Palette accents (decorative scale — not product chrome CTAs) ────
        gray: "bg-muted text-muted-foreground fill-current",
        "gray-subtle": "bg-muted/60 text-muted-foreground fill-current border-transparent",
        blue: "bg-primary text-primary-foreground fill-current",
        "blue-subtle": "bg-primary/10 text-primary fill-current border-transparent",
        purple: "bg-secondary text-secondary-foreground fill-current",
        "purple-subtle":
          "bg-secondary/40 text-secondary-foreground fill-current border-transparent",
        amber: "bg-warning text-warning-foreground fill-current",
        "amber-subtle": "bg-warning/15 text-warning fill-current border-transparent",
        red: "bg-destructive text-destructive-foreground fill-current",
        "red-subtle": "bg-destructive/15 text-destructive fill-current border-transparent",
        pink: "bg-accent text-accent-foreground fill-current",
        "pink-subtle": "bg-accent/40 text-accent-foreground fill-current border-transparent",
        green: "bg-success text-success-foreground fill-current",
        "green-subtle": "bg-success/15 text-success fill-current border-transparent",
        teal: "bg-info text-info-foreground fill-current",
        "teal-subtle": "bg-info/15 text-info fill-current border-transparent",
        inverted: "bg-foreground text-background fill-current",
        // Special visual treatments (intentional product design, not brand hex)
        trial:
          "bg-gradient-to-br from-trial-start to-trial-end text-primary-foreground fill-current",
        turbo:
          "bg-gradient-to-br from-turbo-start to-turbo-end text-primary-foreground fill-current",
        pill: "bg-background text-foreground fill-foreground border-border hover:bg-muted/50 focus-visible:bg-muted/50",
        beta: "border-transparent bg-muted text-muted-foreground",
        new: "border-transparent bg-primary/10 text-primary",
        owner: "border-border bg-transparent text-foreground",
        featured: "badge-brand-default border [text-shadow:0_0_1px_hsl(var(--background)/0.2)]",
        "coming-soon": "border-transparent bg-muted/60 text-muted-foreground italic",
      },
      size: {
        sm: "text-[11px] h-5 px-1.5 tracking-[0.2px] gap-[3px] [&_svg]:h-[11px] [&_svg]:w-[11px]",
        md: "text-[12px] h-6 px-2.5 tracking-normal gap-1 [&_svg]:h-[14px] [&_svg]:w-[14px]",
        lg: "text-[14px] h-8 px-3 tracking-normal gap-1.5 [&_svg]:h-[16px] [&_svg]:w-[16px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

const dotColorMap: Partial<Record<NonNullable<BadgeProps["variant"]>, string>> = {
  success: "bg-success-foreground",
  warning: "bg-warning-foreground",
  info: "bg-info-foreground",
  error: "bg-destructive-foreground",
  destructive: "bg-destructive-foreground",
  "gray-subtle": "bg-muted-foreground",
  "green-subtle": "bg-success",
  "amber-subtle": "bg-warning",
  "red-subtle": "bg-destructive",
  "blue-subtle": "bg-primary",
  "purple-subtle": "bg-secondary-foreground",
  "pink-subtle": "bg-accent-foreground",
  "teal-subtle": "bg-info",
  default: "bg-brand-mark-foreground",
  featured: "bg-brand-mark-foreground",
  secondary: "bg-secondary-foreground",
  outline: "bg-muted-foreground",
};

export interface BadgeProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof badgeVariants> {
  /** @deprecated Prefer Status Dot for dot-only indicators. Keep text labels redundant with color. */
  dot?: boolean;
  /** Icon element rendered before the label. Decorative icons are hidden from assistive tech. */
  icon?: React.ReactNode;
  /** Render as child element — use with `<a>` for link badges */
  asChild?: boolean;
}

function Badge({
  className,
  variant = "default",
  size = "md",
  dot,
  icon,
  asChild,
  children,
  ...props
}: BadgeProps) {
  const badgeClassName = cn(badgeVariants({ variant, size }), className);
  const renderContent = (label: React.ReactNode) => (
    <>
      {dot && (
        <span
          aria-hidden="true"
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            dotColorMap[variant ?? "default"] ?? "bg-current",
          )}
        />
      )}
      {icon && (
        <span aria-hidden="true" className="shrink-0 flex items-center justify-center">
          {icon}
        </span>
      )}
      {label}
    </>
  );

  if (asChild) {
    const childArray = React.Children.toArray(children);
    const child = childArray.length === 1 ? childArray[0] : null;

    if (React.isValidElement(child)) {
      const childProps = child.props as React.HTMLAttributes<HTMLElement> & {
        children?: React.ReactNode;
      };

      return React.cloneElement(child, {
        ...props,
        ...childProps,
        "data-slot": "badge",
        className: cn(badgeClassName, childProps.className),
        style: { ...props.style, ...childProps.style },
        children: renderContent(childProps.children),
      } as React.HTMLAttributes<HTMLElement>);
    }
  }

  return (
    <span data-slot="badge" className={badgeClassName} {...props}>
      {renderContent(children)}
    </span>
  );
}

export { Badge, badgeVariants };
