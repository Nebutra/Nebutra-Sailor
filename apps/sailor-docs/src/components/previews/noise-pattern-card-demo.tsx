"use client";

import { NoisePatternCard, NoisePatternCardBody } from "@nebutra/ui/primitives";
import { Sparkles } from "lucide-react";

export function NoisePatternCardDemo() {
  return (
    <div className="max-w-2xl p-4 md:p-8 mx-auto w-full">
      <NoisePatternCard className="shadow-lg">
        <NoisePatternCardBody className="md:flex-row gap-6 md:items-start p-8 flex min-h-[250px] flex-col items-center">
          <div className="w-16 h-16 shadow-inner flex flex-shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
            <Sparkles className="w-8 h-8" />
          </div>

          <div className="gap-4 md:text-left flex flex-col text-center">
            <div>
              <h3 className="text-2xl font-bold tracking-tight mb-2 text-foreground">
                Organic Grain Texture
              </h3>
              <p className="leading-relaxed text-muted-foreground">
                Add depth and vintage feel to your interfaces with this animated SVG noise pattern.
                Perfect for premium cards, feature highlights, and section backgrounds that need
                that extra touch of analog warmth in a digital world.
              </p>
            </div>

            <div className="gap-3 md:justify-start mt-2 flex flex-wrap justify-center">
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-secondary text-secondary-foreground">
                SVG Filters
              </span>
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-secondary text-secondary-foreground">
                Animated
              </span>
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-secondary text-secondary-foreground">
                Tailwind CSS
              </span>
            </div>
          </div>
        </NoisePatternCardBody>
      </NoisePatternCard>
    </div>
  );
}
