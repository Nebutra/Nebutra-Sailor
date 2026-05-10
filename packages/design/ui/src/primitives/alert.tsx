"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import type * as React from "react";
import { cn } from "../utils";

// =============================================================================
// Variants
// =============================================================================

const alertVariants = cva("flex items-stretch w-full gap-2 group-[.toaster]:w-(--width)", {
  variants: {
    variant: {
      secondary: "",
      primary: "",
      destructive: "",
      success: "",
      info: "",
      mono: "",
      warning: "",
    },
    icon: {
      primary: "",
      destructive: "",
      success: "",
      info: "",
      warning: "",
    },
    appearance: {
      solid: "",
      outline: "",
      light: "",
      stroke: "text-foreground",
    },
    size: {
      lg: "rounded-[var(--radius-lg)] p-4 gap-3 text-base [&>[data-slot=alert-icon]>svg]:size-6 *:data-slot=alert-icon:mt-0.5 [&_[data-slot=alert-close]]:mt-1",
      md: "rounded-[var(--radius-lg)] p-3.5 gap-2.5 text-sm [&>[data-slot=alert-icon]>svg]:size-5 *:data-slot=alert-icon:mt-0 [&_[data-slot=alert-close]]:mt-0.5",
      sm: "rounded-[var(--radius-md)] px-3 py-2.5 gap-2 text-xs [&>[data-slot=alert-icon]>svg]:size-4 *:data-alert-icon:mt-0.5 [&_[data-slot=alert-close]]:mt-0.25 [&_[data-slot=alert-close]_svg]:size-3.5",
    },
  },
  compoundVariants: [
    /* Solid */
    {
      variant: "secondary",
      appearance: "solid",
      className: "bg-muted text-foreground",
    },
    {
      variant: "primary",
      appearance: "solid",
      className: "bg-primary text-primary-foreground",
    },
    {
      variant: "destructive",
      appearance: "solid",
      className: "bg-destructive text-destructive-foreground",
    },
    {
      variant: "success",
      appearance: "solid",
      className:
        "bg-[var(--color-success,var(--color-green-500))] text-[var(--color-success-foreground,var(--color-white))]",
    },
    {
      variant: "info",
      appearance: "solid",
      className:
        "bg-[var(--color-info,var(--color-violet-600))] text-[var(--color-info-foreground,var(--color-white))]",
    },
    {
      variant: "warning",
      appearance: "solid",
      className:
        "bg-[var(--color-warning,var(--color-yellow-500))] text-[var(--color-warning-foreground,var(--color-white))]",
    },
    {
      variant: "mono",
      appearance: "solid",
      className:
        "bg-muted text-muted-foreground dark:bg-muted dark:text-foreground *:data-slot-[alert=close]:text-muted-foreground",
    },

    /* Outline */
    {
      variant: "secondary",
      appearance: "outline",
      className:
        "border border-border bg-background text-foreground [&_[data-slot=alert-close]]:text-foreground",
    },
    {
      variant: "primary",
      appearance: "outline",
      className:
        "border border-border bg-background text-primary [&_[data-slot=alert-close]]:text-foreground",
    },
    {
      variant: "destructive",
      appearance: "outline",
      className:
        "border border-border bg-background text-destructive [&_[data-slot=alert-close]]:text-foreground",
    },
    {
      variant: "success",
      appearance: "outline",
      className:
        "border border-border bg-background text-[var(--color-success,var(--color-green-500))] [&_[data-slot=alert-close]]:text-foreground",
    },
    {
      variant: "info",
      appearance: "outline",
      className:
        "border border-border bg-background text-[var(--color-info,var(--color-violet-600))] [&_[data-slot=alert-close]]:text-foreground",
    },
    {
      variant: "warning",
      appearance: "outline",
      className:
        "border border-border bg-background text-[var(--color-warning,var(--color-yellow-500))] [&_[data-slot=alert-close]]:text-foreground",
    },
    {
      variant: "mono",
      appearance: "outline",
      className:
        "border border-border bg-background text-foreground [&_[data-slot=alert-close]]:text-foreground",
    },

    /* Light */
    {
      variant: "secondary",
      appearance: "light",
      className: "bg-muted border border-border text-foreground",
    },
    {
      variant: "primary",
      appearance: "light",
      className:
        "text-foreground bg-[var(--color-primary-soft,var(--color-blue-50))] border border-[var(--color-primary-alpha,var(--color-blue-100))] [&_[data-slot=alert-icon]]:text-primary dark:bg-[var(--color-primary-soft,var(--color-blue-950))] dark:border-[var(--color-primary-alpha,var(--color-blue-900))]",
    },
    {
      variant: "destructive",
      appearance: "light",
      className:
        "bg-[var(--color-destructive-soft,var(--color-red-50))] border border-[var(--color-destructive-alpha,var(--color-red-100))] text-foreground [&_[data-slot=alert-icon]]:text-destructive dark:bg-[var(--color-destructive-soft,var(--color-red-950))] dark:border-[var(--color-destructive-alpha,var(--color-red-900))]",
    },
    {
      variant: "success",
      appearance: "light",
      className:
        "bg-[var(--color-success-soft,var(--color-green-50))] border border-[var(--color-success-alpha,var(--color-green-200))] text-foreground [&_[data-slot=alert-icon]]:text-[var(--color-success,var(--color-green-600))] dark:bg-[var(--color-success-soft,var(--color-green-950))] dark:border-[var(--color-success-alpha,var(--color-green-900))]",
    },
    {
      variant: "info",
      appearance: "light",
      className:
        "bg-[var(--color-info-soft,var(--color-violet-50))] border border-[var(--color-info-alpha,var(--color-violet-100))] text-foreground [&_[data-slot=alert-icon]]:text-[var(--color-info,var(--color-violet-600))] dark:bg-[var(--color-info-soft,var(--color-violet-950))] dark:border-[var(--color-info-alpha,var(--color-violet-900))]",
    },
    {
      variant: "warning",
      appearance: "light",
      className:
        "bg-[var(--color-warning-soft,var(--color-yellow-50))] border border-[var(--color-warning-alpha,var(--color-yellow-200))] text-foreground [&_[data-slot=alert-icon]]:text-[var(--color-warning,var(--color-yellow-600))] dark:bg-[var(--color-warning-soft,var(--color-yellow-950))] dark:border-[var(--color-warning-alpha,var(--color-yellow-900))]",
    },

    /* Mono icon colors */
    {
      variant: "mono",
      icon: "primary",
      className: "[&_[data-slot=alert-icon]]:text-primary",
    },
    {
      variant: "mono",
      icon: "warning",
      className: "[&_[data-slot=alert-icon]]:text-[var(--color-warning,var(--color-yellow-600))]",
    },
    {
      variant: "mono",
      icon: "success",
      className: "[&_[data-slot=alert-icon]]:text-[var(--color-success,var(--color-green-600))]",
    },
    {
      variant: "mono",
      icon: "destructive",
      className: "[&_[data-slot=alert-icon]]:text-destructive",
    },
    {
      variant: "mono",
      icon: "info",
      className: "[&_[data-slot=alert-icon]]:text-[var(--color-info,var(--color-violet-600))]",
    },
  ],
  defaultVariants: {
    variant: "secondary",
    appearance: "solid",
    size: "md",
  },
});

// =============================================================================
// Types
// =============================================================================

/**
 * Alert variant types
 */
export type AlertVariant =
  | "secondary"
  | "primary"
  | "destructive"
  | "success"
  | "info"
  | "mono"
  | "warning";

/**
 * Alert appearance types
 */
export type AlertAppearance = "solid" | "outline" | "light" | "stroke";

/**
 * Alert size types
 */
export type AlertSize = "sm" | "md" | "lg";

/**
 * Props for Alert component
 *
 * @description
 * A versatile alert component with multiple variants, appearances, and sizes.
 * Supports icons, close button, and rich content.
 *
 * **UX Scenarios:**
 * - Success/error/warning notifications
 * - Form validation messages
 * - System status alerts
 * - Informational banners
 * - Toast notifications
 *
 * **Accessibility:**
 * - role="alert" for screen readers
 * - Dismissible with close button
 * - Proper ARIA labeling
 */
export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  /**
   * Show close button
   * @default false
   */
  close?: boolean;
  /**
   * Callback when close button is clicked
   */
  onClose?: () => void;
}

export interface AlertIconProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {}

export type AlertTitleProps = React.HTMLAttributes<HTMLDivElement>;

export type AlertDescriptionProps = React.HTMLAttributes<HTMLDivElement>;

export type AlertContentProps = React.HTMLAttributes<HTMLDivElement>;

export type AlertToolbarProps = React.HTMLAttributes<HTMLDivElement>;

// =============================================================================
// Components
// =============================================================================

/**
 * Alert - Contextual feedback messages
 *
 * @example
 * ```tsx
 * import {
 *   Alert,
 *   AlertIcon,
 *   AlertTitle,
 *   AlertDescription,
 *   AlertContent,
 * } from "@nebutra/ui";
 * import { CircleCheck, CircleAlert, TriangleAlert } from "lucide-react";
 *
 * // Basic alert
 * <Alert>
 *   <AlertIcon><CircleAlert /></AlertIcon>
 *   <AlertTitle>Default alert message</AlertTitle>
 * </Alert>
 *
 * // Success alert with close
 * <Alert variant="success" appearance="light" close onClose={() => {}}>
 *   <AlertIcon><CircleCheck /></AlertIcon>
 *   <AlertTitle>Operation successful!</AlertTitle>
 * </Alert>
 *
 * // Destructive alert with description
 * <Alert variant="destructive" appearance="outline">
 *   <AlertIcon><TriangleAlert /></AlertIcon>
 *   <AlertContent>
 *     <AlertTitle>Error occurred</AlertTitle>
 *     <AlertDescription>
 *       Please try again or contact support.
 *     </AlertDescription>
 *   </AlertContent>
 * </Alert>
 *
 * // Different sizes
 * <Alert size="sm" variant="info">...</Alert>
 * <Alert size="md" variant="warning">...</Alert>
 * <Alert size="lg" variant="primary">...</Alert>
 * ```
 */
function Alert({
  className,
  variant,
  size,
  icon,
  appearance,
  close = false,
  onClose,
  children,
  ...props
}: AlertProps) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant, size, icon, appearance }), className)}
      {...props}
    >
      {children}
      {close && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss"
          data-slot="alert-close"
          className={cn(
            "group shrink-0 size-4 inline-flex items-center justify-center rounded-[var(--radius-sm)]",
            "opacity-70 hover:opacity-100 transition-opacity",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          )}
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

/**
 * AlertTitle - Alert heading/title
 */
function AlertTitle({ className, ...props }: AlertTitleProps) {
  return (
    <div data-slot="alert-title" className={cn("grow tracking-tight", className)} {...props} />
  );
}

/**
 * AlertIcon - Icon container for alert
 */
function AlertIcon({ children, className, ...props }: AlertIconProps) {
  return (
    <div data-slot="alert-icon" className={cn("shrink-0", className)} {...props}>
      {children}
    </div>
  );
}

/**
 * AlertToolbar - Actions area for alert
 */
function AlertToolbar({ children, className, ...props }: AlertToolbarProps) {
  return (
    <div data-slot="alert-toolbar" className={cn(className)} {...props}>
      {children}
    </div>
  );
}

/**
 * AlertDescription - Detailed description text
 */
function AlertDescription({ className, ...props }: AlertDescriptionProps) {
  return (
    <div
      data-slot="alert-description"
      className={cn("text-sm [&_p]:leading-relaxed [&_p]:mb-2", className)}
      {...props}
    />
  );
}

/**
 * AlertContent - Container for title and description
 */
function AlertContent({ className, ...props }: AlertContentProps) {
  return (
    <div
      data-slot="alert-content"
      className={cn("space-y-2 [&_[data-slot=alert-title]]:font-semibold", className)}
      {...props}
    />
  );
}

export {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  AlertToolbar,
  alertVariants,
};
