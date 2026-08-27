"use client";

import { CanvasRevealEffect } from "@nebutra/ui/primitives";

export function CanvasRevealEffectDemo() {
  return (
    <div className="p-4 flex w-full items-center justify-center">
      <div className="max-w-2xl h-[300px] w-full overflow-hidden rounded-xl border">
        <CanvasRevealEffect
          animationSpeed={0.5}
          colors={[
            [59, 130, 246],
            [139, 92, 246],
          ]}
          dotSize={3}
          containerClassName="bg-slate-950"
        />
      </div>
    </div>
  );
}
