"use client";

import { FeatureCard, FeatureCardContent, FeatureCardHeader } from "@nebutra/ui/primitives";
import { Zap } from "lucide-react";

export function FeatureCardDemo() {
  return (
    <FeatureCard className="w-80">
      <FeatureCardHeader
        icon={Zap}
        title="Lightning fast"
        description="Sub-second response times worldwide."
      />
      <FeatureCardContent className="p-6">
        <div className="h-24 rounded text-sm flex items-center justify-center bg-muted/20 text-muted-foreground">
          Visual content area
        </div>
      </FeatureCardContent>
    </FeatureCard>
  );
}
