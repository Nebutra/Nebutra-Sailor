"use client";

import type React from "react";
import { cn } from "../utils";

export interface SectionProps {
  children: React.ReactNode;
  /** Optional semantic section label (aria-label) */
  label?: string;
  className?: string;
}

/**
 * Section — semantic page section with vertical spacing.
 *
 * @status stable
 * @planned apps/web dashboard — semantic grouping of dashboard page content with aria-label.
 *
 * @example
 * ```tsx
 * <Section label="Features">
 *   <FeatureGrid />
 * </Section>
 * ```
 */
export function Section({ children, label, className }: SectionProps) {
  return (
    <section aria-label={label} className={cn("py-8", className)}>
      {children}
    </section>
  );
}
