"use client";

import { FeatureArrowCard } from "@nebutra/ui/primitives";
import { Shield, Sparkles, Zap } from "lucide-react";

export function FeatureArrowCardDemo() {
  return (
    <div className="md:grid-cols-2 gap-6 max-w-3xl p-4 md:p-8 mx-auto grid w-full grid-cols-1">
      <FeatureArrowCard
        icon={Zap}
        title="Performance"
        subtitle="Lightning fast."
        description="Built for speed from the ground up."
        cardContent={
          <div className="bg-blue-50 dark:bg-blue-950/30 flex h-full w-full items-center justify-center">
            <span className="text-2xl font-bold text-blue-500">99.9%</span>
          </div>
        }
        onArrowClick={() => {}}
        className="rounded-xl"
      />

      <FeatureArrowCard
        icon={Shield}
        title="Security"
        subtitle="Bank-grade protection."
        description="Your data is safe with us always."
        cardContent={
          <div className="bg-emerald-50 dark:bg-emerald-950/30 flex h-full w-full items-center justify-center">
            <Shield className="size-8 text-emerald-500" />
          </div>
        }
        onArrowClick={() => {}}
        className="rounded-xl"
      />

      <FeatureArrowCard
        icon={Sparkles}
        title="AI Native"
        subtitle="Smart automation."
        description="Let AI handle the repetitive tasks."
        cardContent={
          <div className="bg-purple-50 dark:bg-purple-950/30 flex h-full w-full items-center justify-center">
            <div className="gap-1 flex">
              <span className="size-2 bg-purple-500 animate-bounce rounded-full delay-75"></span>
              <span className="size-2 bg-purple-500 animate-bounce rounded-full delay-150"></span>
              <span className="size-2 bg-purple-500 animate-bounce rounded-full delay-300"></span>
            </div>
          </div>
        }
        onArrowClick={() => {}}
        className="md:col-span-2 rounded-xl"
      />
    </div>
  );
}
