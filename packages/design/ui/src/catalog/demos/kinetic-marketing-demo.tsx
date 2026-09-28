"use client";

import { Layers } from "@nebutra/icons";
import { KineticFeatureCard } from "@nebutra/ui/patterns";

export function KineticMarketingDemo() {
  return (
    <div className="w-full max-w-md p-6">
      <KineticFeatureCard
        icon={Layers}
        title="Tenancy, done once"
        description="Row-level security is generated from the schema, so every query is scoped before it runs."
      />
    </div>
  );
}
