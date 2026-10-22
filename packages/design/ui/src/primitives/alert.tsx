"use client";

import { Cross as X } from "@nebutra/icons";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "../utils";

// =============================================================================
// Variants
// =============================================================================

// Layout: a wrapping row. Icon and message share the first line (the message
// has a 12rem basis and grows); the toolbar keeps its natural width and, when
// the row cannot hold message + actions, wraps to its own line, indented to the
// message. The close button is pinned to the top-end corner so it never wraps
// with the toolbar. At 390px the two-action composition used to push its
// actions 23–33px out of the Alert's own box.
const alertVariants = cva(
  "relative flex flex-wrap items-start w-full gap-2 group-[.toaster]:w-(--width) has-[>[data-slot=alert-close]]:pe-10",
  {
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
        lg: "rounded-[var(--radius-lg)] p-4 gap-3 text-base [--alert-indent:2.25rem] [&>[data-slot=alert-icon]>svg]:size-6 [&>[data-slot=alert-close]]:top-3.5 [&>[data-slot=alert-close]]:end-3",
        md: "rounded-[var(--radius-lg)] p-3.5 gap-2.5 text-sm [--alert-indent:1.875rem] [&>[data-slot=alert-icon]>svg]:size-5 [&>[data-slot=alert-close]]:top-2.5 [&>[data-slot=alert-close]]:end-2.5",
        sm: "rounded-[var(--radius-md)] px-3 py-2.5 gap-2 text-xs [--alert-indent:1.5rem] [&>[data-slot=alert-icon]>svg]:size-4 [&>[data-slot=alert-close]]:top-1.5 [&>[data-slot=alert-close]]:end-1.5",
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
        className: "bg-success text-success-foreground",
      },
      {
        variant: "info",
        appearance: "solid",
        className: "bg-info text-info-foreground",
      },
      {
        variant: "warning",
        appearance: "solid",
        className: "bg-warning text-warning-foreground",
      },
      {
        variant: "mono",
        appearance: "solid",
        className:
          "bg-muted text-muted-foreground dark:bg-muted dark:text-foreground [&_[data-slot=alert-close]]:text-muted-foreground",
      } /* Outline */,
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
          "border border-border bg-background text-destructive-strong [&_[data-slot=alert-close]]:text-foreground",
      },
      {
        variant: "success",
        appearance: "outline",
        className:
          "border border-border bg-background text-success-strong [&_[data-slot=alert-close]]:text-foreground",
      },
      {
        variant: "info",
        appearance: "outline",
        className:
          "border border-border bg-background text-[hsl(var(--info))] [&_[data-slot=alert-close]]:text-foreground",
      },
      {
        variant: "warning",
        appearance: "outline",
        className:
          "border border-border bg-background text-warning-strong [&_[data-slot=alert-close]]:text-foreground",
      },
      {
        variant: "mono",
        appearance: "outline",
        className:
          "border border-border bg-background text-foreground [&_[data-slot=alert-close]]:text-foreground",
      } /* Light */,
      {
        variant: "secondary",
        appearance: "light",
        className: "bg-muted border border-border text-foreground",
      },
      {
        variant: "primary",
        appearance: "light",
        className:
          "bg-[hsl(var(--primary)/0.1)] border border-[hsl(var(--primary)/0.25)] text-foreground [&_[data-slot=alert-icon]]:text-[hsl(var(--primary))]",
      },
      {
        variant: "destructive",
        appearance: "light",
        className:
          "bg-[hsl(var(--destructive)/0.1)] border border-[hsl(var(--destructive)/0.25)] text-foreground [&_[data-slot=alert-icon]]:text-[hsl(var(--destructive))]",
      },
      {
        variant: "success",
        appearance: "light",
        className:
          "bg-[hsl(var(--success)/0.1)] border border-[hsl(var(--success)/0.25)] text-foreground [&_[data-slot=alert-icon]]:text-[hsl(var(--success))]",
      },
      {
        variant: "info",
        appearance: "light",
        className:
          "bg-[hsl(var(--info)/0.1)] border border-[hsl(var(--info)/0.25)] text-foreground [&_[data-slot=alert-icon]]:text-[hsl(var(--info))]",
      },
      {
        variant: "warning",
        appearance: "light",
        className:
          "bg-[hsl(var(--warning)/0.1)] border border-[hsl(var(--warning)/0.25)] text-foreground [&_[data-slot=alert-icon]]:text-[hsl(var(--warning))]",
      } /* Stroke — a coloured edge on the canvas, ink stays foreground. It used to
       declare only text-foreground, so all seven variants rendered identically
       with no edge at all. */,
      { variant: "secondary", appearance: "stroke", className: "border border-border" },
      { variant: "mono", appearance: "stroke", className: "border border-border" },
      {
        variant: "primary",
        appearance: "stroke",
        className:
          "border border-[hsl(var(--primary)/0.5)] [&_[data-slot=alert-icon]]:text-[hsl(var(--primary))]",
      },
      {
        variant: "destructive",
        appearance: "stroke",
        className:
          "border border-[hsl(var(--destructive)/0.5)] [&_[data-slot=alert-icon]]:text-destructive-strong",
      },
      {
        variant: "success",
        appearance: "stroke",
        className:
          "border border-[hsl(var(--success)/0.5)] [&_[data-slot=alert-icon]]:text-success-strong",
      },
      {
        variant: "info",
        appearance: "stroke",
        className:
          "border border-[hsl(var(--info)/0.5)] [&_[data-slot=alert-icon]]:text-[hsl(var(--info))]",
      },
      {
        variant: "warning",
        appearance: "stroke",
        className:
          "border border-[hsl(var(--warning)/0.6)] [&_[data-slot=alert-icon]]:text-warning-strong",
      } /* Mono icon colors */,
      {
        variant: "mono",
        icon: "primary",
        className: "[&_[data-slot=alert-icon]]:text-primary",
      },
      {
        variant: "mono",
        icon: "warning",
        className: "[&_[data-slot=alert-icon]]:text-warning-strong",
      },
      {
        variant: "mono",
        icon: "success",
        className: "[&_[data-slot=alert-icon]]:text-success-strong",
      },
      {
        variant: "mono",
        icon: "destructive",
        className: "[&_[data-slot=alert-icon]]:text-destructive-strong",
      },
      {
        variant: "mono",
        icon: "info",
        className: "[&_[data-slot=alert-icon]]:text-[hsl(var(--info))]",
      },
    ],
    defaultVariants: {
      variant: "secondary",
      appearance: "solid",
      size: "md",
    },
  },
);

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
   * Semantic color palette for the message, combined with appearance.
   * @default "secondary"
   */
  variant?: VariantProps<typeof alertVariants>["variant"];
  /** Icon color override used when variant is "mono"; render the icon with AlertIcon. */
  icon?: VariantProps<typeof alertVariants>["icon"];
  /**
   * Surface treatment: filled, outlined, tinted, or a colored border on the canvas.
   * @default "solid"
   */
  appearance?: VariantProps<typeof alertVariants>["appearance"];
  /**
   * Spacing, typography, and icon size for the alert.
   * @default "md"
   */
  size?: VariantProps<typeof alertVariants>["size"];
  /**
   * Shows a dismiss button; the caller controls removing or hiding the alert.
   * @default false
   */
  close?: boolean;
  /**
   * Called when the dismiss button is activated.
   */
  onClose?: () => void;
  /** Accessible name for the close button. Pass a translated string. */
  closeLabel?: string;
}

export interface AlertIconProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  /** Compatibility prop; set variant on the parent Alert to color the icon. */
  variant?: VariantProps<typeof alertVariants>["variant"];
  /** Compatibility prop; set icon on the parent Alert to override a mono icon's color. */
  icon?: VariantProps<typeof alertVariants>["icon"];
  /** Compatibility prop; set appearance on the parent Alert to style its surface. */
  appearance?: VariantProps<typeof alertVariants>["appearance"];
  /** Compatibility prop; set size on the parent Alert to size its icon. */
  size?: VariantProps<typeof alertVariants>["size"];
}

export type AlertTitleProps = React.HTMLAttributes<HTMLDivElement>;

export type AlertDescriptionProps = React.HTMLAttributes<HTMLDivElement>;

export type AlertContentProps = React.HTMLAttributes<HTMLDivElement>;

export type AlertToolbarProps = React.HTMLAttributes<HTMLDivElement>;

// =============================================================================
// Components
// =============================================================================

/**
 * Displays contextual feedback in an alert region with composable content and actions.
 * Dismissal calls onClose without changing the alert's visibility.
 *
 * @example
 * ```tsx
 * import {
 *   Alert, *   AlertIcon, *   AlertTitle, *   AlertDescription, *   AlertContent, * } from "@nebutra/ui";
 * import { CheckCircle as CircleCheck, Warning as CircleAlert, Warning as TriangleAlert } from "@nebutra/icons";
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
  closeLabel = "Dismiss",
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
          aria-label={closeLabel}
          data-slot="alert-close"
          // A ghost icon button: 24px box (WCAG 2.5.8), tint on hover per the
          // hover contract instead of an opacity dim, and the global focus ring.
          className={cn(
            "absolute top-2.5 end-2.5 inline-flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)]",
            "text-current transition-colors duration-micro hover:bg-accent hover:text-accent-foreground",
          )}
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

/**
 * Short message or heading that shares the alert's first row with its icon and actions.
 */
function AlertTitle({ className, ...props }: AlertTitleProps) {
  return (
    <div
      data-slot="alert-title"
      className={cn("min-w-0 flex-[1_1_12rem] tracking-tight", className)}
      {...props}
    />
  );
}

/**
 * Holds a leading icon whose size and color are controlled by the parent Alert.
 */
function AlertIcon({ children, className, ...props }: AlertIconProps) {
  return (
    <div
      data-slot="alert-icon"
      className={cn("flex shrink-0 [&>svg]:shrink-0", className)}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Groups alert actions, wrapping beneath the message when space is limited.
 */
function AlertToolbar({ children, className, ...props }: AlertToolbarProps) {
  return (
    <div
      data-slot="alert-toolbar"
      className={cn(
        "flex shrink-0 flex-wrap items-center gap-2 self-center",
        // When it wraps under the message, line up with the message, not the icon.
        "[[data-slot=alert-icon]~&]:ms-[var(--alert-indent,0px)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Supporting text or paragraphs explaining the alert and any recovery steps.
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
 * Groups an AlertTitle and AlertDescription into a flexible message column.
 */
function AlertContent({ className, ...props }: AlertContentProps) {
  return (
    <div
      data-slot="alert-content"
      className={cn(
        "min-w-0 flex-[1_1_12rem] space-y-2 [&_[data-slot=alert-title]]:font-semibold",
        className,
      )}
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
