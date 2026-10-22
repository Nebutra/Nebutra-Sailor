"use client";

import type { VariantProps } from "class-variance-authority";
import type * as React from "react";
import { usePendingVisible } from "../hooks/use-pending-visible";
import { cn } from "../utils/cn";
import { RENDERS_NATIVE_BUTTON } from "../utils/native-button";
import { Slot } from "../utils/slot";
import { buttonVariants } from "./button-variants";

// ─── Spinner ──────────────────────────────────────────────────────────────────
// Uses @keyframes spinner from globals.css

function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "block rounded-full border-[1.5px] border-current border-t-transparent animate-[spinner_0.6s_linear_infinite] motion-reduce:animate-pulse",
        className,
      )}
    />
  );
}

// ─── Icon size class mapping ──────────────────────────────────────────────────

// iconSize (28/32/36px box) takes precedence over size (text-button scale)
// when both are present — an icon-only button sets iconSize, not size.
function getIconSizeClass(
  size: string | null | undefined,
  iconSize?: "sm" | "md" | "lg" | undefined,
): string {
  if (iconSize === "sm") return "[&>svg]:size-3.5"; // 14px, 28px box
  if (iconSize === "md") return "[&>svg]:size-3.5"; // 14px, 32px box
  if (iconSize === "lg") return "[&>svg]:size-4"; // 16px, 36px box
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

function getSpinnerSizeClass(
  size: string | null | undefined,
  iconSize?: "sm" | "md" | "lg" | undefined,
): string {
  if (iconSize === "sm") return "size-3.5"; // 14px, 28px box
  if (iconSize === "md") return "size-3.5"; // 14px, 32px box
  if (iconSize === "lg") return "size-4"; // 16px, 36px box
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
  iconSize?: "sm" | "md" | "lg" | undefined;
  children?: React.ReactNode | undefined;
}

function ButtonContent({ loading, prefix, suffix, size, iconSize, children }: ButtonContentProps) {
  const iconSizeClass = getIconSizeClass(size, iconSize);
  // The button is disabled and aria-busy the moment `loading` flips (see
  // Button below); only the spinner glyph waits. A save that lands in 120ms
  // never flashes a spinner, and one that is shown stays long enough to read.
  const spinnerVisible = usePendingVisible(loading);

  return (
    <>
      {spinnerVisible && <Spinner className={getSpinnerSizeClass(size, iconSize)} />}
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
  /** Merge props into one child element; the caller supplies its content and interaction semantics. */
  asChild?: boolean;
  /** Disable interaction and mark the button busy immediately; a delayed spinner avoids flashes. */
  loading?: boolean;
  /** Decorative content before the label, hidden from assistive technology; ignored with `asChild`. */
  prefix?: React.ReactNode;
  /** Decorative content after the label, hidden from assistive technology; ignored with `asChild`. */
  suffix?: React.ReactNode;
  /** Elevation shadow level. `true` resolves to `"md"` */
  shadow?: boolean | "sm" | "md" | "lg";
  /**
   * Icon-only box size (28 / 32 / 36px) — only takes effect with
   * `shape="square"` or `shape="circle"`. Independent of `size`: use this
   * instead of `size` when the button carries only an icon, so its
   * dimensions don't inherit the text-button height/padding/font scale.
   */
  iconSize?: "sm" | "md" | "lg";
}

/**
 * Action button with visual variants and a busy state that prevents repeat activation.
 * Supply an accessible name with text or `aria-label` for icon-only buttons.
 */
const Button = ({
  className,
  variant,
  size,
  shape,
  iconSize,
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
      className={cn(buttonVariants({ variant, size, shape, iconSize }), shadowClass, className)}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <ButtonContent
          loading={loading}
          prefix={prefix}
          suffix={suffix}
          size={size}
          iconSize={iconSize}
        >
          {children}
        </ButtonContent>
      )}
    </Comp>
  );
};
Button.displayName = "Button";
// Without asChild, Button renders a native <button> (see utils/native-button).
(Button as unknown as Record<symbol, boolean>)[RENDERS_NATIVE_BUTTON] = true;

// ─── ButtonLink ───────────────────────────────────────────────────────────────

export interface ButtonLinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "prefix">,
    VariantProps<typeof buttonVariants> {
  /** Decorative content before the link text, hidden from assistive technology. */
  prefix?: React.ReactNode;
  /** Decorative content after the link text, hidden from assistive technology. */
  suffix?: React.ReactNode;
  /** Elevation shadow level. `true` resolves to `"md"` */
  shadow?: boolean | "sm" | "md" | "lg";
  /** Mark the link busy and disabled, remove it from tab order and block pointer interaction. */
  loading?: boolean;
  /**
   * Icon-only box size (28 / 32 / 36px) — only takes effect with
   * `shape="square"` or `shape="circle"`. Independent of `size`: use this
   * instead of `size` when the link carries only an icon, so its
   * dimensions don't inherit the text-button height/padding/font scale.
   */
  iconSize?: "sm" | "md" | "lg";
}

/**
 * Native anchor styled as a button for navigation, with an optional delayed busy spinner.
 * Give icon-only links an accessible name; use `href` for their destination.
 */
const ButtonLink = ({
  className,
  variant,
  size,
  shape,
  iconSize,
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
        buttonVariants({ variant, size, shape, iconSize }),
        shadowClass,
        loading && "pointer-events-none opacity-50",
        className,
      )}
      {...loadingProps}
      {...props}
    >
      <ButtonContent
        loading={loading}
        prefix={prefix}
        suffix={suffix}
        size={size}
        iconSize={iconSize}
      >
        {children}
      </ButtonContent>
    </a>
  );
};
ButtonLink.displayName = "ButtonLink";

export { Button, ButtonLink };
