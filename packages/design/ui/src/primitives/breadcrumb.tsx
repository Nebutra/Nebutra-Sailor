"use client";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import * as React from "react";
import { cn } from "../utils";
import { Slot } from "../utils/slot";
// =============================================================================
// Types
// =============================================================================
/**
 * Props for Breadcrumb component
 *
 * @description
 * A navigation component showing the user's location within a site hierarchy.
 * Supports custom separators, ellipsis for collapsed items, and flexible linking.
 *
 * **UX Scenarios:**
 * - Site navigation hierarchy
 * - File/folder path display
 * - Multi-step form progress
 * - Category/subcategory navigation
 * - Dashboard section navigation
 *
 * **Accessibility:**
 * - nav element with aria-label="breadcrumb"
 * - aria-current="page" on current page
 * - Proper list semantics (ol/li)
 * - Screen reader support
 */
export interface BreadcrumbProps extends React.ComponentPropsWithoutRef<"nav"> {
  /**
   * Custom separator element (defaults to ChevronRight icon)
   */
  separator?: React.ReactNode;
}
export type BreadcrumbListProps = React.ComponentPropsWithoutRef<"ol">;
export type BreadcrumbItemProps = React.ComponentPropsWithoutRef<"li">;
export interface BreadcrumbLinkProps extends React.ComponentPropsWithoutRef<"a"> {
  /**
   * Render as child component (for use with Next.js Link, etc.)
   */
  asChild?: boolean;
}
export type BreadcrumbPageProps = React.ComponentPropsWithoutRef<"span">;
export type BreadcrumbSeparatorProps = React.ComponentPropsWithoutRef<"li">;
export type BreadcrumbEllipsisProps = React.ComponentPropsWithoutRef<"span">;
// =============================================================================
// Components
// =============================================================================
/**
 * Breadcrumb - Root navigation container
 *
 * @example
 * ```tsx
 * import {
 *   Breadcrumb,
 *   BreadcrumbList,
 *   BreadcrumbItem,
 *   BreadcrumbLink,
 *   BreadcrumbPage,
 *   BreadcrumbSeparator,
 * } from "@nebutra/ui";
 *
 * <Breadcrumb>
 *   <BreadcrumbList>
 *     <BreadcrumbItem>
 *       <BreadcrumbLink href="/">Home</BreadcrumbLink>
 *     </BreadcrumbItem>
 *     <BreadcrumbSeparator />
 *     <BreadcrumbItem>
 *       <BreadcrumbLink href="/docs">Documents</BreadcrumbLink>
 *     </BreadcrumbItem>
 *     <BreadcrumbSeparator />
 *     <BreadcrumbItem>
 *       <BreadcrumbPage>Current Page</BreadcrumbPage>
 *     </BreadcrumbItem>
 *   </BreadcrumbList>
 * </Breadcrumb>
 * ```
 */
const Breadcrumb = React.forwardRef<HTMLElement, BreadcrumbProps>(({ ...props }, ref) => (
  <nav ref={ref} aria-label="breadcrumb" {...props} />
));
Breadcrumb.displayName = "Breadcrumb";
/**
 * BreadcrumbList - Ordered list container for breadcrumb items
 */
const BreadcrumbList = React.forwardRef<HTMLOListElement, BreadcrumbListProps>(
  ({ className, ...props }, ref) => (
    <ol
      ref={ref}
      className={cn(
        "flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5",
        className,
      )}
      {...props}
    />
  ),
);
BreadcrumbList.displayName = "BreadcrumbList";
/**
 * BreadcrumbItem - Individual breadcrumb item wrapper
 */
const BreadcrumbItem = React.forwardRef<HTMLLIElement, BreadcrumbItemProps>(
  ({ className, ...props }, ref) => (
    <li ref={ref} className={cn("inline-flex items-center gap-1.5", className)} {...props} />
  ),
);
BreadcrumbItem.displayName = "BreadcrumbItem";
/**
 * BreadcrumbLink - Clickable link within a breadcrumb item
 *
 * @example
 * ```tsx
 * // Standard anchor
 * <BreadcrumbLink href="/path">Link</BreadcrumbLink>
 *
 * // With Next.js Link
 * <BreadcrumbLink asChild>
 *   <Link href="/path">Link</Link>
 * </BreadcrumbLink>
 *
 * // With icon
 * <BreadcrumbLink href="/" className="flex items-center gap-2">
 *   <HomeIcon className="size-4" />
 *   Home
 * </BreadcrumbLink>
 * ```
 */
const BreadcrumbLink = React.forwardRef<HTMLAnchorElement, BreadcrumbLinkProps>(
  ({ asChild, className, ...props }, ref) => {
    const Comp = asChild ? Slot : "a";
    return (
      <Comp
        ref={ref}
        className={cn("transition-colors hover:text-foreground", className)}
        {...props}
      />
    );
  },
);
BreadcrumbLink.displayName = "BreadcrumbLink";
/**
 * BreadcrumbPage - Current page indicator (non-interactive)
 */
const BreadcrumbPage = React.forwardRef<HTMLSpanElement, BreadcrumbPageProps>(
  ({ className, ...props }, ref) => (
    // biome-ignore lint/a11y/useSemanticElements: ARIA pattern
    <span
      ref={ref}
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn("font-normal text-foreground", className)}
      {...props}
    />
  ),
);
BreadcrumbPage.displayName = "BreadcrumbPage";
/**
 * BreadcrumbSeparator - Visual separator between items
 *
 * @example
 * ```tsx
 * // Default (ChevronRight icon)
 * <BreadcrumbSeparator />
 *
 * // Custom separator
 * <BreadcrumbSeparator>/</BreadcrumbSeparator>
 * <BreadcrumbSeparator>→</BreadcrumbSeparator>
 * ```
 */
const BreadcrumbSeparator = ({ children, className, ...props }: BreadcrumbSeparatorProps) => (
  <li
    role="presentation"
    aria-hidden="true"
    className={cn("[&>svg]:size-3.5", className)}
    {...props}
  >
    {children ?? <ChevronRight />}
  </li>
);
BreadcrumbSeparator.displayName = "BreadcrumbSeparator";
/**
 * BreadcrumbEllipsis - Collapsed items indicator
 *
 * @example
 * ```tsx
 * <BreadcrumbItem>
 *   <BreadcrumbEllipsis />
 * </BreadcrumbItem>
 * ```
 */
const BreadcrumbEllipsis = ({ className, ...props }: BreadcrumbEllipsisProps) => (
  <span
    role="presentation"
    aria-hidden="true"
    className={cn("flex h-9 w-9 items-center justify-center", className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More</span>
  </span>
);
BreadcrumbEllipsis.displayName = "BreadcrumbEllipsis";

export {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
};
