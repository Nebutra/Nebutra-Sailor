"use client";

import { BentoCard, BentoGrid } from "@nebutra/ui/primitives";
import { Globe, Lock, Sparkles, Zap } from "lucide-react";

export function BentoGridDemo() {
  return (
    <div className="p-8 flex w-full items-center justify-center">
      <BentoGrid className="max-w-4xl">
        <BentoCard
          name="AI-powered"
          description="Built-in intelligence that learns from your workflow and makes smarter suggestions over time."
          Icon={Sparkles}
          className="lg:col-span-2"
          href="#"
          cta="Explore AI features"
        />
        <BentoCard
          name="Lightning fast"
          description="Sub-second response times, globally distributed across 35+ regions."
          Icon={Zap}
          href="#"
          cta="See benchmarks"
        />
        <BentoCard
          name="Enterprise security"
          description="SOC 2 Type II certified. GDPR and HIPAA compliant out of the box."
          Icon={Lock}
          href="#"
          cta="View compliance"
        />
        <BentoCard
          name="Global reach"
          description="Deploy anywhere. Serve everyone. One platform, worldwide coverage."
          Icon={Globe}
          className="lg:col-span-2"
          href="#"
          cta="See regions"
        />
      </BentoGrid>
    </div>
  );
}
