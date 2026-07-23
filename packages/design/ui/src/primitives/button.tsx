"use client";

import type { VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "../utils/cn";
import { Slot } from "../utils/slot";
import { buttonVariants } from "./button-variants";

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
  lg: "shadow-md",
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

const Button = ({
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
  ref,
  ...props
}: ButtonProps & { ref?: React.Ref<HTMLButtonElement> | undefined }) => {
  const Comp = asChild ? Slot : "button";
  const isDisabled = Boolean(disabled || loading);
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
};
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

const ButtonLink = ({
  className,
  variant,
  size,
  shape,
  prefix,
  suffix,
  shadow,
  loading = false,
  children,
  ref,
  ...props
}: ButtonLinkProps & { ref?: React.Ref<HTMLAnchorElement> | undefined }) => {
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
};
ButtonLink.displayName = "ButtonLink";

export { Button, ButtonLink };
