"use client";
import { ChevronRight, MoreHorizontal } from "@nebutra/icons";
import * as React from "react";
import { cn } from "../utils";
import { Slot } from "../utils/slot";
import { UiLabelText } from "./ui-labels";
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
   * Separator drawn by every `BreadcrumbSeparator` that has no children of its own. A
   * `BreadcrumbSeparator` with children still wins, so one divider can differ from the rest.
   * The built-in chevron mirrors in right-to-left pages; a custom node is drawn as given, so
   * pick a symmetric one (`/`) or flip it yourself.
   *
   * @default A right-pointing chevron that mirrors in RTL
   */
  separator?: React.ReactNode;
}
export type BreadcrumbListProps = React.ComponentPropsWithoutRef<"ol">;
export type BreadcrumbItemProps = React.ComponentPropsWithoutRef<"li">;
export interface BreadcrumbLinkProps extends React.ComponentPropsWithoutRef<"a"> {
  /**
   * Render the link styling onto the single child element (a Next.js `Link`,
   * say) instead of an `a`.
   *
   * @default false
   */
  asChild?: boolean;
}
export type BreadcrumbPageProps = React.ComponentPropsWithoutRef<"span">;
export type BreadcrumbSeparatorProps = React.ComponentPropsWithoutRef<"li">;
export type BreadcrumbEllipsisProps = React.ComponentPropsWithoutRef<"span">;

const BreadcrumbSeparatorContext = React.createContext<React.ReactNode>(undefined);
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
const Breadcrumb = ({
  ref,
  "aria-label": ariaLabel = "breadcrumb",
  separator,
  children,
  ...props
}: BreadcrumbProps & { ref?: React.Ref<HTMLElement> | undefined }) => {
  // An empty landmark is announced but leads nowhere, so render nothing without content.
  if (React.Children.toArray(children).length === 0) return null;
  return (
    <BreadcrumbSeparatorContext.Provider value={separator}>
      <nav ref={ref} aria-label={ariaLabel} {...props}>
        {children}
      </nav>
    </BreadcrumbSeparatorContext.Provider>
  );
};
Breadcrumb.displayName = "Breadcrumb";
/**
 * BreadcrumbList - Ordered list container for breadcrumb items
 */
const BreadcrumbList = ({
  className,
  ref,
  ...props
}: BreadcrumbListProps & { ref?: React.Ref<HTMLOListElement> | undefined }) => (
  <ol
    ref={ref}
    className={cn(
      "flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5",
      className,
    )}
    {...props}
  />
);
BreadcrumbList.displayName = "BreadcrumbList";
/**
 * BreadcrumbItem - Individual breadcrumb item wrapper
 */
const BreadcrumbItem = ({
  className,
  ref,
  ...props
}: BreadcrumbItemProps & { ref?: React.Ref<HTMLLIElement> | undefined }) => (
  <li ref={ref} className={cn("inline-flex items-center gap-1.5", className)} {...props} />
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
const BreadcrumbLink = ({
  asChild,
  className,
  ref,
  ...props
}: BreadcrumbLinkProps & { ref?: React.Ref<HTMLAnchorElement> | undefined }) => {
  const Comp = asChild ? Slot : "a";
  return (
    <Comp
      ref={ref}
      className={cn("transition-colors hover:text-foreground", className)}
      {...props}
    />
  );
};
BreadcrumbLink.displayName = "BreadcrumbLink";
/**
 * BreadcrumbPage - Current page indicator (non-interactive)
 */
const BreadcrumbPage = ({
  className,
  ref,
  ...props
}: BreadcrumbPageProps & { ref?: React.Ref<HTMLSpanElement> | undefined }) => (
  // biome-ignore lint/a11y/useSemanticElements: ARIA pattern
  <span
    ref={ref}
    role="link"
    aria-disabled="true"
    aria-current="page"
    className={cn("font-normal text-foreground", className)}
    {...props}
  />
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
const BreadcrumbSeparator = ({ children, className, ...props }: BreadcrumbSeparatorProps) => {
  const inherited = React.use(BreadcrumbSeparatorContext);
  return (
    <li
      role="presentation"
      aria-hidden="true"
      className={cn("[&>svg]:size-3.5", className)}
      {...props}
    >
      {children ?? inherited ?? <ChevronRight className="rtl:rotate-180" />}
    </li>
  );
};
BreadcrumbSeparator.displayName = "BreadcrumbSeparator";
/**
 * BreadcrumbEllipsis - Collapsed items indicator
 *
 * Purely decorative: it is `aria-hidden` and not focusable, so it does not
 * reveal the hidden levels by itself. To make the collapsed levels reachable,
 * wrap it in a button or menu trigger that has its own accessible name.
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
    <span className="sr-only">
      <UiLabelText section="common" name="more" />
    </span>
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
