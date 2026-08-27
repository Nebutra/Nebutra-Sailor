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
};

export type PackageShowcase = (props: PackageShowcaseProps) => ReactElement;
