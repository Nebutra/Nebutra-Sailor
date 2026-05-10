"use client";

import * as React from "react";
import { cn } from "../utils/cn";

/* ─────────────────────────────────────────────────────────────────────────────
 * SectionContainer Component
 *
 * A standardized section wrapper that enforces consistent vertical rhythm,
 * max-width constraints, and responsive padding across the landing page.
 *
 * Usage:
 * <SectionContainer>
 *   <SectionContainer.Header>
 *     <h2>Section Title</h2>
 *   </SectionContainer.Header>
 *   <SectionContainer.Content>
 *     Main content...
 *   </SectionContainer.Content>
 * </SectionContainer>
 * ───────────────────────────────────────────────────────────────────────────── */

type SectionSize = "sm" | "md" | "lg" | "xl" | "full";
type SectionSpacing = "sm" | "md" | "lg" | "xl";

const maxWidthMap: Record<SectionSize, string> = {
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-6xl",
  xl: "max-w-7xl",
  full: "max-w-none",
};

const verticalSpacingMap: Record<SectionSpacing, string> = {
  sm: "py-12 md:py-16",
  md: "py-16 md:py-24",
  lg: "py-24 md:py-32",
  xl: "py-32 md:py-48",
};

/* ─────────────────────────────────────────────────────────────────────────── */

export interface SectionContainerProps extends React.HTMLAttributes<HTMLElement> {
  as?: "section" | "div" | "article";
  size?: SectionSize;
  spacing?: SectionSpacing;
  centered?: boolean;
  noPadding?: boolean;
}

const SectionContainerRoot = React.forwardRef<HTMLElement, SectionContainerProps>(
  (
    {
      className,
      as: Component = "section",
      size = "lg",
      spacing: verticalSpacing = "md",
      centered = true,
      noPadding = false,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <Component
        ref={ref as React.Ref<HTMLDivElement>}
        className={cn(
          "relative w-full",
          !noPadding && "px-4 sm:px-6 lg:px-8",
          verticalSpacingMap[verticalSpacing],
          className,
        )}
        {...props}
      >
        <div className={cn("w-full", maxWidthMap[size], centered && "mx-auto")}>{children}</div>
      </Component>
    );
  },
);
SectionContainerRoot.displayName = "SectionContainer";

/* ─────────────────────────────────────────────────────────────────────────── */

export interface SectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  centered?: boolean;
  spacing?: "sm" | "md" | "lg";
}

const SectionHeader = React.forwardRef<HTMLDivElement, SectionHeaderProps>(
  ({ className, centered = true, spacing = "md", children, ...props }, ref) => {
    const spacingMap = {
      sm: "mb-8",
      md: "mb-12",
      lg: "mb-16",
    };

    return (
      <div
        ref={ref}
        className={cn(spacingMap[spacing], centered && "text-center", className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);
SectionHeader.displayName = "SectionContainer.Header";

/* ─────────────────────────────────────────────────────────────────────────── */

export type SectionContentProps = React.HTMLAttributes<HTMLDivElement>;

const SectionContent = React.forwardRef<HTMLDivElement, SectionContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("relative", className)} {...props}>
        {children}
      </div>
    );
  },
);
SectionContent.displayName = "SectionContainer.Content";

/* ─────────────────────────────────────────────────────────────────────────── */

export interface SectionFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  centered?: boolean;
  spacing?: "sm" | "md" | "lg";
}

const SectionFooter = React.forwardRef<HTMLDivElement, SectionFooterProps>(
  ({ className, centered = true, spacing = "md", children, ...props }, ref) => {
    const spacingMap = {
      sm: "mt-8",
      md: "mt-12",
      lg: "mt-16",
    };

    return (
      <div
        ref={ref}
        className={cn(spacingMap[spacing], centered && "text-center", className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);
SectionFooter.displayName = "SectionContainer.Footer";

/* ─────────────────────────────────────────────────────────────────────────── */

// Compound component assembly
export const SectionContainer = Object.assign(SectionContainerRoot, {
  Header: SectionHeader,
  Content: SectionContent,
  Footer: SectionFooter,
});

// Named exports
export { SectionContainerRoot, SectionContent, SectionFooter, SectionHeader };
