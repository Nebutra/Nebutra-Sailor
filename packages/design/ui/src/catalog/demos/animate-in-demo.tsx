"use client";

import { AnimateIn, AnimateInGroup, Card } from "@nebutra/ui/primitives";

const FEATURES = ["Multi-tenant by default", "Billing that reconciles", "Agents with audit trails"];

export function AnimateInDemo() {
  return (
    <AnimateInGroup stagger="normal" className="grid w-full gap-4 p-6 sm:grid-cols-3">
      {FEATURES.map((feature) => (
        <AnimateIn key={feature} preset="fadeUp">
          <Card className="p-4 text-foreground text-sm">{feature}</Card>
        </AnimateIn>
      ))}
    </AnimateInGroup>
  );
}
