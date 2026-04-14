"use client";

import { Alert } from "@nebutra/ui/primitives";
import { Info } from "lucide-react";

export function IntroductionDemo() {
  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      <Alert className="mb-6 gap-4 flex items-start">
        <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
        <div>
          <h4 className="font-semibold text-foreground">Welcome to Nebutra Sailor</h4>
          <p className="text-sm mt-1 text-muted-foreground">
            This collection of primitives provides a strong foundation for building exceptional SaaS
            applications. Explore the available components to get started.
          </p>
        </div>
      </Alert>
    </div>
  );
}
