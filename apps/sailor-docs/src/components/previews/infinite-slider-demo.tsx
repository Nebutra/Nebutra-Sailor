"use client";

import { InfiniteSlider } from "@nebutra/ui/primitives";
import { Cloud, Code, Cpu, Database, Lock, Network, Shield, Zap } from "lucide-react";

export function InfiniteSliderDemo() {
  const icons = [
    { icon: <Cpu className="size-8" />, label: "Compute" },
    { icon: <Cloud className="size-8" />, label: "Storage" },
    { icon: <Database className="size-8" />, label: "Database" },
    { icon: <Network className="size-8" />, label: "Network" },
    { icon: <Shield className="size-8" />, label: "Security" },
    { icon: <Zap className="size-8" />, label: "Serverless" },
    { icon: <Lock className="size-8" />, label: "IAM" },
    { icon: <Code className="size-8" />, label: "DevTools" },
  ];

  return (
    <div className="max-w-4xl py-12 gap-16 mx-auto flex w-full flex-col overflow-hidden">
      <div className="space-y-4">
        <h3 className="text-sm font-semibold tracking-wider mb-8 text-center text-muted-foreground uppercase">
          Trusted by top cloud infrastructure providers
        </h3>

        {/* Fast right-to-left */}
        <InfiniteSlider gap={24} speed={60}>
          {icons.map((item, i) => (
            <div
              key={i}
              className="gap-2 px-6 py-3 flex items-center rounded-full bg-secondary text-secondary-foreground"
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </div>
          ))}
        </InfiniteSlider>

        {/* Slow left-to-right on hover */}
        <InfiniteSlider gap={24} speed={40} speedOnHover={10} reverse className="mt-8">
          {icons.reverse().map((item, i) => (
            <div
              key={i}
              className="w-32 h-32 flex cursor-pointer flex-col items-center justify-center rounded-2xl border bg-card text-card-foreground shadow-sm transition-colors hover:border-primary"
            >
              <div className="mb-3 text-primary">{item.icon}</div>
              <span className="font-medium text-sm">{item.label}</span>
            </div>
          ))}
        </InfiniteSlider>
      </div>
    </div>
  );
}
