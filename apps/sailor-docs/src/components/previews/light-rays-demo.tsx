"use client";

import { Card, LightRays } from "@nebutra/ui/primitives";
import { Sparkles } from "lucide-react";

export function LightRaysDemo() {
  return (
    <div className="max-w-3xl p-4 md:p-8 mx-auto w-full">
      <Card className="p-8 bg-black dark:bg-black/90 relative flex h-[400px] w-full flex-col items-center justify-center overflow-hidden border text-center">
        {/* The light rays component in the background */}
        <LightRays
          count={12}
          color="rgba(125, 211, 252, 0.3)" // soft blue
          speed={15}
          blur={24}
        />

        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 bg-blue-500/10 border-blue-500/20 mb-6 flex items-center justify-center rounded-full border">
            <Sparkles className="w-8 h-8 text-blue-400" />
          </div>

          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-4">
            Illuminate Your Data
          </h2>

          <p className="text-blue-100/60 max-w-md text-lg">
            Discover insights previously hidden in the dark. Our advanced analytics engine brings
            everything to light.
          </p>

          <button
            type="button"
            className="mt-8 px-6 py-2.5 bg-white text-black font-medium hover:bg-blue-50 rounded-full transition-colors"
          >
            Get Started
          </button>
        </div>
      </Card>
    </div>
  );
}
