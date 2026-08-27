"use client";

import type React from "react";
import { cn } from "../utils";

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  /** Whether the card has a hover/press effect */
  isInteractive?: boolean;
}

/**
 * Card — surface container with border, background, and shadow.
 *
 * @status stable
 * @planned apps/web dashboard — settings panels, billing summary, team member tiles.
 *   See governance/registry.ts for full allocation record.
 *
 * @example
 * ```tsx
 * <Card>
 *   <p>Card content</p>
 * </Card>
 * ```
 */
export function Card({ children, isInteractive = false, className }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-border bg-background p-4 text-foreground shadow-sm dark:bg-black/40",
        isInteractive && "cursor-pointer transition-shadow hover:shadow-md",
        className,
      )}
    >
      {children}
    </div>
  );
}
