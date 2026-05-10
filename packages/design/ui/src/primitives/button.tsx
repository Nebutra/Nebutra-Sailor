"use client";

import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "../utils/cn";
import { Slot } from "../utils/slot";

// ─── Variants ─────────────────────────────────────────────────────────────────
// Heights: tiny=24px sm=32px md=40px lg=48px (Geist-matching)
// Focus ring uses CSS variable from globals.css — brand-blue, 2px ring, 2px offset

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-[var(--radius-md)] text-sm font-medium",
    "transition-colors duration-150 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "aria-busy:cursor-wait",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        tertiary:
          "border border-transparent bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:border-input",
        warning: "bg-warning text-warning-foreground hover:bg-warning/90",
      },
      size: {
        tiny: "h-6 rounded-[var(--radius-sm)] px-2 text-[11px]", // 24px
        sm: "h-8 rounded-[var(--radius-sm)] px-3 text-xs", // 32px
        default: "h-10 px-4 py-2", // 40px
        lg: "h-12 rounded-[var(--radius-lg)] px-5 text-base", // 48px
        icon: "h-10 w-10", // 40×40px (kept for backward compat)
      },
      shape: {
        default: "",
        square: "",
        circle: "",
      },
    },
    compoundVariants: [
      // shape="square" — width = height, no horizontal padding
      { shape: "square", size: "tiny", className: "w-6 px-0" },
      { shape: "square", size: "sm", className: "w-8 px-0" },
      { shape: "square", size: "default", className: "w-10 px-0" },
      { shape: "square", size: "lg", className: "w-12 px-0" },
      // shape="circle" — width = height + rounded-full
      { shape: "circle", size: "tiny", className: "w-6 px-0 rounded-full" },
      { shape: "circle", size: "sm", className: "w-8 px-0 rounded-full" },
      { shape: "circle", size: "default", className: "w-10 px-0 rounded-full" },
      { shape: "circle", size: "lg", className: "w-12 px-0 rounded-full" },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
      shape: "default",
    },
  },
);

// ─── Spinner ──────────────────────────────────────────────────────────────────
// Uses @keyframes spinner from globals.css

function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "block rounded-full border-2 border-current border-t-transparent animate-[spinner_0.6s_linear_infinite]",
        className,
      )}
    />
  );
}

// ─── Icon size class mapping ──────────────────────────────────────────────────

function getIconSizeClass(size: string | null | undefined): string {
  switch (size) {
    case "tiny":
      return "[&>svg]:size-3"; // 12px
    case "sm":
      return "[&>svg]:size-3.5"; // 14px
    case "lg":
      return "[&>svg]:size-4.5"; // 18px
    default:
      return "[&>svg]:size-4"; // 16px
  }
}

function getSpinnerSizeClass(size: string | null | undefined): string {
  switch (size) {
    case "tiny":
      return "size-3"; // 12px
    case "sm":
      return "size-3.5"; // 14px
    case "lg":
      return "size-4.5"; // 18px
    default:
      return "size-4"; // 16px
  }
}

// ─── Shadow class mapping ─────────────────────────────────────────────────────

const SHADOW_CLASSES: Record<string, string> = {
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
};

function resolveShadowClass(shadow: boolean | "sm" | "md" | "lg" | undefined): string | undefined {
  if (!shadow) return undefined;
  const level = shadow === true ? "md" : shadow;
  return SHADOW_CLASSES[level];
}

// ─── ButtonContent (shared between Button & ButtonLink) ───────────────────────

interface ButtonContentProps {
  loading: boolean;
  prefix?: React.ReactNode | undefined;
  suffix?: React.ReactNode | undefined;
  size?: string | null | undefined;
  children?: React.ReactNode | undefined;
}

function ButtonContent({ loading, prefix, suffix, size, children }: ButtonContentProps) {
  const iconSizeClass = getIconSizeClass(size);

  return (
    <>
      {loading && <Spinner className={getSpinnerSizeClass(size)} />}
      {prefix != null && (
        <span aria-hidden="true" className={cn("shrink-0", iconSizeClass)}>
          {prefix}
        </span>
      )}
      {children}
      {suffix != null && (
        <span aria-hidden="true" className={cn("shrink-0", iconSizeClass)}>
          {suffix}
        </span>
      )}
    </>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "prefix">,
    VariantProps<typeof buttonVariants> {
  /** Render as a child element (Radix Slot — polymorphic) */
  asChild?: boolean;
  /** Show loading spinner and disable interaction */
  loading?: boolean;
  /** Icon or element rendered before children */
  prefix?: React.ReactNode;
  /** Icon or element rendered after children */
  suffix?: React.ReactNode;
  /** Elevation shadow level. `true` resolves to `"md"` */
  shadow?: boolean | "sm" | "md" | "lg";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      shape,
      asChild = false,
      loading = false,
      disabled,
      prefix,
      suffix,
      shadow,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    const isDisabled = disabled ?? loading;
    const shadowClass = resolveShadowClass(shadow);

    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, shape }), shadowClass, className)}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <ButtonContent loading={loading} prefix={prefix} suffix={suffix} size={size}>
            {children}
          </ButtonContent>
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

// ─── ButtonLink ───────────────────────────────────────────────────────────────

export interface ButtonLinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "prefix">,
    VariantProps<typeof buttonVariants> {
  /** Icon or element rendered before children */
  prefix?: React.ReactNode;
  /** Icon or element rendered after children */
  suffix?: React.ReactNode;
  /** Elevation shadow level. `true` resolves to `"md"` */
  shadow?: boolean | "sm" | "md" | "lg";
  /** Show loading spinner */
  loading?: boolean;
}

const ButtonLink = React.forwardRef<HTMLAnchorElement, ButtonLinkProps>(
  (
    {
      className,
      variant,
      size,
      shape,
      prefix,
      suffix,
      shadow,
      loading = false,
      children,
      ...props
    },
    ref,
  ) => {
    const shadowClass = resolveShadowClass(shadow);

    const loadingProps = loading
      ? {
          "aria-busy": "true" as const,
          "aria-disabled": "true" as const,
          tabIndex: -1,
        }
      : {};

    return (
      <a
        ref={ref}
        className={cn(
          buttonVariants({ variant, size, shape }),
          shadowClass,
          loading && "pointer-events-none opacity-50",
          className,
        )}
        {...loadingProps}
        {...props}
      >
        <ButtonContent loading={loading} prefix={prefix} suffix={suffix} size={size}>
          {children}
        </ButtonContent>
      </a>
    );
  },
);
ButtonLink.displayName = "ButtonLink";

export { Button, ButtonLink, buttonVariants };
