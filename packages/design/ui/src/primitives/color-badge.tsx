"use client";

import Link from "next/link";
import * as React from "react";
import { cn } from "../utils/cn";

/**
 * Color variant definitions for ColorBadge
 *
 * Note: Some variants use CSS custom properties (--ds-*) for advanced theming.
 * If not defined, fallback to standard Tailwind colors.
 */
const colorBadgeVariants = {
  gray: "bg-muted text-muted-foreground fill-muted-foreground",
  "gray-subtle": "bg-muted text-muted-foreground fill-muted-foreground",
  blue: "bg-info text-info-foreground fill-info-foreground",
  "blue-subtle": "bg-blue-3 text-blue-11 fill-blue-11",
  // allow-palette: categorical hue with no token equivalent (purple/violet has no semantic slot; --category-N is too desaturated for a solid badge fill)
  purple: "bg-purple-700 text-white fill-white",
  // allow-palette: categorical hue with no token equivalent (purple/violet has no semantic slot)
  "purple-subtle": "bg-purple-200 text-purple-900 fill-purple-900",
  amber: "bg-warning text-warning-foreground fill-warning-foreground",
  "amber-subtle": "bg-warning/15 text-warning-strong fill-warning-strong",
  red: "bg-destructive text-destructive-foreground fill-destructive-foreground",
  "red-subtle": "bg-destructive/15 text-destructive-strong fill-destructive-strong",
  // allow-palette: categorical hue with no token equivalent (pink has no semantic slot)
  pink: "bg-pink-700 text-white fill-white",
  // allow-palette: categorical hue with no token equivalent (pink has no semantic slot)
  "pink-subtle": "bg-pink-300 text-pink-900 fill-pink-900",
  green: "bg-success text-success-foreground fill-success-foreground",
  "green-subtle": "bg-success/15 text-success-strong fill-success-strong",
  teal: "bg-cyan-11 text-cyan-1 fill-cyan-1",
  "teal-subtle": "bg-cyan-3 text-cyan-11 fill-cyan-11",
  inverted: "bg-muted text-muted-foreground fill-background dark:fill-foreground",
  // The same trial / turbo gradients Badge uses (--ds-trial-*, --ds-turbo-*),
  // not a second hand-picked pair. Fixed and vivid in both themes: white ink.
  // allow-palette: fixed vivid gradient, white ink in both themes
  trial: "bg-gradient-to-br from-trial-start to-trial-end text-white fill-white",
  // allow-palette: fixed vivid gradient, white ink in both themes
  turbo: "bg-gradient-to-br from-turbo-start to-turbo-end text-white fill-white",
  pill: "bg-background text-foreground fill-foreground border border-border",
} as const;

const colorBadgeSizes = {
  sm: "text-[11px] h-5 px-1.5 tracking-[0.2px] gap-[3px]",
  md: "text-[12px] h-6 px-2.5 tracking-normal gap-1",
  lg: "text-[14px] h-8 px-3 tracking-normal gap-1.5",
} as const;

const iconSizes = {
  sm: "size-[11px]",
  md: "size-[14px]",
  lg: "size-4",
} as const;

export type ColorBadgeVariant = keyof typeof colorBadgeVariants;
export type ColorBadgeSize = keyof typeof colorBadgeSizes;

/**
 * Props for the ColorBadge component.
 */
export interface ColorBadgeProps {
  /** Content to display inside the badge */
  children?: React.ReactNode;
  /** Color variant */
  variant?: ColorBadgeVariant;
  /** Size variant */
  size?: ColorBadgeSize;
  /** Whether to capitalize the text */
  capitalize?: boolean;
  /** Optional icon to display before the text */
  icon?: React.ReactNode;
  /** Render as a Next.js Link (requires href) */
  asLink?: boolean;
  /** URL for link variant */
  href?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ColorBadge - Vercel-style multi-color badge component
 *
 * A versatile badge component with multiple color variants and sizes.
 * Supports icons and can be rendered as a link.
 *
 * @example Basic usage
 * ```tsx
 * <ColorBadge variant="blue">New</ColorBadge>
 * <ColorBadge variant="green-subtle" size="lg">Success</ColorBadge>
 * ```
 *
 * @example With icon
 * ```tsx
 * <ColorBadge variant="purple" icon={<ShieldIcon />}>
 *   Protected
 * </ColorBadge>
 * ```
 *
 * @example As link
 * ```tsx
 * <ColorBadge variant="blue" asLink href="/docs">
 *   View Docs
 * </ColorBadge>
 * ```
 *
 * @example Status badges
 * ```tsx
 * <ColorBadge variant="green">Active</ColorBadge>
 * <ColorBadge variant="amber">Pending</ColorBadge>
 * <ColorBadge variant="red">Error</ColorBadge>
 * ```
 */
export function ColorBadge({
  children,
  variant = "gray",
  size = "md",
  capitalize = true,
  icon,
  asLink = false,
  href,
  className,
}: ColorBadgeProps) {
  const baseClasses = cn(
    "inline-flex justify-center items-center shrink-0 rounded-full font-sans font-medium whitespace-nowrap tabular-nums",
    capitalize && "capitalize",
    colorBadgeVariants[variant],
    colorBadgeSizes[size],
    className,
  );

  const content = (
    <>
      {icon && (
        <span className={cn("flex items-center justify-center", iconSizes[size])}>
          {React.isValidElement(icon)
            ? React.cloneElement(icon as React.ReactElement<{ className?: string }>, {
                className: cn(
                  "size-full",
                  (icon as React.ReactElement<{ className?: string }>).props.className,
                ),
              })
            : icon}
        </span>
      )}
      {children}
    </>
  );

  if (asLink && href) {
    return (
      <Link className={cn(baseClasses, "no-underline")} href={href}>
        {content}
      </Link>
    );
  }

  return <div className={baseClasses}>{content}</div>;
}

export { colorBadgeSizes, colorBadgeVariants };
