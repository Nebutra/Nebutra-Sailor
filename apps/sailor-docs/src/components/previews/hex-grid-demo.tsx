"use client";

import { HexGrid } from "@nebutra/ui/primitives";

export function HexGridDemo() {
  return (
    <div className="py-12 mx-auto w-full">
      <div className="gap-12 max-w-4xl px-4 mx-auto flex flex-col">
        {/* Example 1: Basic with Glow */}
        <div className="space-y-4">
          <div className="mb-6 text-center">
            <h3 className="text-lg font-bold">Animated Glowing Grid</h3>
            <p className="text-sm text-muted-foreground">
              Standard wireframe hexagon grid with animated glowing cells.
            </p>
          </div>
          <div className="md:h-[400px] relative flex h-[300px] w-full items-center justify-center overflow-hidden rounded-xl border bg-card">
            <HexGrid glow color="hsl(var(--primary))" opacity={0.25} />
            <div className="backdrop-blur-md px-6 py-4 relative z-10 rounded-full border bg-background/80 shadow-sm">
              <span className="font-semibold tracking-tight">Core Infrastructure</span>
            </div>
          </div>
        </div>

        {/* Example 2: Filled with Radial Mask */}
        <div className="space-y-4">
          <div className="mb-6 text-center">
            <h3 className="text-lg font-bold">Filled Grid with Mask</h3>
            <p className="text-sm text-muted-foreground">
              Solid filled hexagons masked by a radial gradient.
            </p>
          </div>
          <div className="md:h-[400px] bg-black relative flex h-[300px] w-full items-center justify-center overflow-hidden rounded-xl border">
            <HexGrid
              filled
              size={32}
              color="#0BF1C3"
              opacity={0.15}
              className="[mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]"
            />
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter mix-blend-overlay">
                NEBUTRA
              </h2>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
