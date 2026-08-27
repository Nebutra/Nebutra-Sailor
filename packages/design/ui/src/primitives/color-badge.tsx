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
  gray: "bg-muted text-white fill-white",
  "gray-subtle": "bg-muted text-muted-foreground fill-gray-900",
  blue: "bg-blue-700 text-white fill-white",
  "blue-subtle": "bg-blue-200 text-blue-900 fill-blue-900",
  purple: "bg-purple-700 text-white fill-white",
  "purple-subtle": "bg-purple-200 text-purple-900 fill-purple-900",
  amber: "bg-amber-600 text-black fill-black",
  "amber-subtle": "bg-amber-200 text-amber-900 fill-amber-900",
  red: "bg-red-700 text-white fill-white",
  "red-subtle": "bg-red-200 text-red-900 fill-red-900",
  pink: "bg-pink-700 text-white fill-white",
  "pink-subtle": "bg-pink-300 text-pink-900 fill-pink-900",
  green: "bg-green-700 text-white fill-white",
  "green-subtle": "bg-green-200 text-green-900 fill-green-900",
  teal: "bg-teal-700 text-white fill-white",
  "teal-subtle": "bg-teal-300 text-teal-900 fill-teal-900",
  inverted: "bg-muted text-muted-foreground fill-gray-100 dark:fill-gray-900",
  trial: "bg-gradient-to-br from-blue-500 to-pink-500 text-white fill-white",
  turbo: "bg-gradient-to-br from-rose-500 to-blue-500 text-white fill-white",
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
