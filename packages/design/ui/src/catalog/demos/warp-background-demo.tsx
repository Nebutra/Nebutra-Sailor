"use client";

import { WarpBackground } from "@nebutra/ui/primitives";

export function WarpBackgroundDemo() {
  return (
    <div className="py-12 gap-12 flex w-full flex-col items-center">
      {/* Example 1: Large container */}
      <WarpBackground
        perspective={200}
        className="max-w-3xl flex min-h-[400px] w-full items-center justify-center"
      >
        <div className="backdrop-blur-md p-8 max-w-md rounded-2xl border bg-background/80 text-center shadow-xl">
          <h2 className="text-3xl font-bold tracking-tight mb-4">Warp Speed</h2>
          <p className="mb-6 text-muted-foreground">
            Engage your users with immersive 3D perspective grids and animated data beams. Build
            containers that feel alive and dynamic.
          </p>
          <button
            type="button"
            className="px-6 py-2 font-medium text-sm rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Initialize Sequence
          </button>
        </div>
      </WarpBackground>

      {/* Example 2: Small cards */}
      <div className="md:grid-cols-2 gap-6 max-w-3xl grid w-full grid-cols-1">
        <WarpBackground
          perspective={50}
          beamSize={8}
          gridColor="rgba(59, 130, 246, 0.3)"
          className="p-8 h-64 flex flex-col justify-end"
        >
          <div className="p-4 backdrop-blur rounded-xl border bg-background/90">
            <h3 className="font-bold text-lg text-blue-500">Deep Perspective</h3>
            <p className="text-sm mt-1 text-muted-foreground">
              Lower perspective values create dramatic 3D tunneling effects.
            </p>
          </div>
        </WarpBackground>

        <WarpBackground
          perspective={150}
          beamsPerSide={5}
          beamDuration={2}
          gridColor="rgba(239, 68, 68, 0.2)"
          className="p-8 h-64 flex flex-col justify-end"
        >
          <div className="p-4 backdrop-blur rounded-xl border bg-background/90">
            <h3 className="font-bold text-lg text-red-500">High Velocity</h3>
            <p className="text-sm mt-1 text-muted-foreground">
              More beams paired with shorter durations creates hyper-speed motion.
            </p>
          </div>
        </WarpBackground>
      </div>
    </div>
  );
}
