"use client";

import type * as React from "react";
import { createContext, type HTMLAttributes, useContext } from "react";
import { cn } from "../utils";
import { Badge, type BadgeProps } from "./badge";

// =============================================================================
// Types
// =============================================================================

type AnnouncementContextType = {
  themed: boolean;
};

const AnnouncementContext = createContext<AnnouncementContextType>({
  themed: false,
});

const useAnnouncementContext = () => {
  const context = useContext(AnnouncementContext);
  if (!context) {
    throw new Error("Announcement compound components must be used within Announcement");
  }
  return context;
};

/**
 * Props for Announcement component
 *
 * @description
 * A pill-shaped announcement badge with optional tag and title sections.
 * Built on top of Badge with enhanced styling for announcements.
 *
 * **UX Scenarios:**
 * - Product update announcements
 * - Feature release notices
 * - Status indicators (error, success, warning)
 * - Promotional banners
 * - Version release tags
 *
 * **Composition:**
 * - `Announcement` - Container with badge styling
 * - `AnnouncementTag` - Left-side category/type label
 * - `AnnouncementTitle` - Main announcement text with optional icon
 */
export interface AnnouncementProps extends BadgeProps {
  /**
   * Whether to apply themed styling (for colored backgrounds)
   * @default false
   */
  themed?: boolean;
}

/**
 * Props for AnnouncementTag
 */
export type AnnouncementTagProps = HTMLAttributes<HTMLDivElement>;

/**
 * Props for AnnouncementTitle
 */
export type AnnouncementTitleProps = HTMLAttributes<HTMLDivElement>;

// =============================================================================
// Components
// =============================================================================

/**
 * Announcement - Pill-style announcement badge container
 *
 * @example
 * ```tsx
 * // Basic announcement
 * <Announcement>
 *   <AnnouncementTag>New</AnnouncementTag>
 *   <AnnouncementTitle>
 *     Check out our latest feature
 *     <ArrowUpRightIcon size={16} />
 *   </AnnouncementTitle>
 * </Announcement>
 *
 * // Themed (colored background)
 * <Announcement themed className="bg-rose-100 text-rose-700">
 *   <AnnouncementTag>Error</AnnouncementTag>
 *   <AnnouncementTitle>Something went wrong</AnnouncementTitle>
 * </Announcement>
 *
 * // Success variant
 * <Announcement themed className="bg-green-100 text-green-700">
 *   <AnnouncementTag>Success</AnnouncementTag>
 *   <AnnouncementTitle>Operation completed</AnnouncementTitle>
 * </Announcement>
 * ```
 */
export const Announcement: React.FC<AnnouncementProps> = ({
  variant = "outline",
  themed = false,
  className,
  children,
  ...props
}) => (
  <AnnouncementContext.Provider value={{ themed }}>
    <Badge
      variant={variant}
      className={cn(
        "max-w-full gap-2 rounded-full bg-background px-3 py-0.5 font-medium shadow-sm transition-all",
        "hover:shadow-md",
        themed && "border-foreground/5",
        className,
      )}
      {...props}
    >
      {children}
    </Badge>
  </AnnouncementContext.Provider>
);

/**
 * AnnouncementTag - Category/type label on the left side
 */
export const AnnouncementTag: React.FC<AnnouncementTagProps> = ({ className, ...props }) => {
  const { themed } = useAnnouncementContext();

  return (
    <div
      className={cn(
        "-ml-2.5 shrink-0 truncate rounded-full bg-foreground/5 px-2.5 py-1 text-xs",
        themed && "bg-background/60",
        className,
      )}
      {...props}
    />
  );
};

/**
 * AnnouncementTitle - Main announcement text container
 */
export const AnnouncementTitle: React.FC<AnnouncementTitleProps> = ({ className, ...props }) => (
  <div className={cn("flex items-center gap-1 truncate py-1", className)} {...props} />
);

export default Announcement;
