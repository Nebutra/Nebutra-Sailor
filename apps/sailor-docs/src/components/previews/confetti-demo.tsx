"use client";

import { Confetti, ConfettiButton, type ConfettiRef } from "@nebutra/ui/primitives";
import { useRef } from "react";

export function ConfettiDemo() {
  const confettiRef = useRef<ConfettiRef>(null);

  return (
    <div className="gap-8 p-12 relative flex w-full flex-col items-center justify-center overflow-hidden rounded-xl border bg-background">
      <Confetti
        ref={confettiRef}
        manualstart
        className="inset-0 pointer-events-none absolute z-0 h-full w-full"
      />

      <div className="gap-4 z-10 flex flex-col items-center">
        <button
          type="button"
          onClick={() =>
            confettiRef.current?.fire({
              particleCount: 150,
              spread: 100,
              origin: { y: 0.6 },
            })
          }
          className="px-6 py-3 text-sm font-semibold rounded-lg bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Fire Confetti via Ref!
        </button>

        <ConfettiButton variant="outline" className="px-6 py-3 shadow-sm">
          🎊 Easy ConfettiButton
        </ConfettiButton>
      </div>
    </div>
  );
}
