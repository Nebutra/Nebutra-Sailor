"use client";

import { AnimatedGradientText } from "@nebutra/ui/primitives";

export function AnimatedGradientTextDemo() {
  return (
    <div className="p-8 flex w-full items-center justify-center">
      <h1 className="text-4xl font-bold">
        <AnimatedGradientText>Animated Gradient Text</AnimatedGradientText>
      </h1>
    </div>
  );
}
