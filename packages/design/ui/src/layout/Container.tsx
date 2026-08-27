"use client";

import type React from "react";
import { cn } from "../utils";

export type ContainerSize = "sm" | "md" | "lg" | "xl" | "full";

const sizeClasses: Record<ContainerSize, string> = {
  sm: "max-w-screen-sm",
  md: "max-w-screen-md",
  lg: "max-w-screen-lg",
  xl: "max-w-screen-xl",
  full: "max-w-full",
};

export interface ContainerProps {
  children: React.ReactNode;
  /** Max-width breakpoint */
  size?: ContainerSize;
  className?: string;
}

/**
 * Container — centred max-width layout wrapper.
 *
 * @status stable
 * @planned apps/web dashboard — canonical max-width wrapper for all page layouts.
 *
 * @example
 * ```tsx
 * <Container size="lg">
 *   <p>Page content</p>
 * </Container>
 * ```
 */
export function Container({ children, size = "lg", className }: ContainerProps) {
  return <div className={cn("mx-auto w-full px-4", sizeClasses[size], className)}>{children}</div>;
}
