"use client";

import { AnimatedBeam } from "@nebutra/ui/primitives";
import { useRef } from "react";

export function AnimatedBeamDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const fromRef = useRef<HTMLDivElement>(null);
  const toRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className="p-12 relative flex w-full max-w-[400px] items-center justify-between rounded-xl border"
    >
      <div
        ref={fromRef}
        className="size-12 bg-blue-500 font-bold text-white shadow flex items-center justify-center rounded-full"
      >
        A
      </div>
      <div
        ref={toRef}
        className="size-12 bg-purple-500 font-bold text-white shadow flex items-center justify-center rounded-full"
      >
        B
      </div>
      <AnimatedBeam containerRef={containerRef} fromRef={fromRef} toRef={toRef} />
    </div>
  );
}
