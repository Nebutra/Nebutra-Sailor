import type { ReactElement } from "react";
import type { SerializablePackageFeatureEntry } from "../package-feature-data";

/**
 * Contract for per-package bespoke showcase components.
 *
 * Each showcase is a custom-designed "what this package actually does"
 * visualization that replaces the default CodeBlock section on the
 * feature detail page. Built from @nebutra/ui primitives — no hand-rolled
 * SVG/div geometry.
 */
export type PackageShowcaseProps = {
  entry: SerializablePackageFeatureEntry;
  locale: "en" | "zh";
  /**
   * Pre-resolved copy for the showcase's own labels/rows, built server-side
   * from `packageCatalog.showcases.<slug>.*` via `getShowcaseCopy()` —
   * showcases are Client Components, so they read strings from this prop
   * instead of calling next-intl themselves.
   */
  copy?: Record<string, unknown>;
};

export type PackageShowcase = (props: PackageShowcaseProps) => ReactElement;
