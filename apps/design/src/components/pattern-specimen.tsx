"use client";

/**
 * The live half of a pattern page, picked by slug.
 *
 * The lookup lives inside the client boundary for the same reason the component
 * previews' does: a server component can import a component from here, but not
 * index into an object this module exports.
 *
 * A pattern with no specimen says so rather than rendering an empty band — the
 * decision table above it is still the substance, and a silent gap would read
 * as a layout fault.
 */

import type * as React from "react";
import {
  EmptyStateSpecimens,
  FormSpecimens,
  LayoutSpecimens,
  ModalitySpecimens,
  NavigationSpecimens,
  TableSpecimens,
} from "@/components/pattern-specimens";

const SPECIMENS: Record<string, React.ReactNode> = {
  modality: <ModalitySpecimens />,
  "empty-states": <EmptyStateSpecimens />,
  forms: <FormSpecimens />,
  tables: <TableSpecimens />,
  navigation: <NavigationSpecimens />,
  layout: <LayoutSpecimens />,
};

export function PatternSpecimen({ slug }: { slug: string }) {
  const specimen = SPECIMENS[slug];
  if (specimen) return <>{specimen}</>;
  return (
    <p className="text-[13px] text-muted-foreground leading-relaxed">
      No specimen here yet — the chart primitives are shown live on the Showcase, which renders the
      docs-shared demos directly.
    </p>
  );
}
