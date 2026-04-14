"use client";

import { BorderTrail } from "@nebutra/ui/primitives";

export function BorderTrailDemo() {
  return (
    <div className="p-12 flex w-full items-center justify-center">
      <div className="h-40 w-72 p-6 relative flex flex-col items-center justify-center rounded-xl border bg-background">
        <BorderTrail
          className="from-blue-500 via-purple-500 to-pink-500 bg-gradient-to-r"
          size={120}
        />
        <p className="font-bold">Premium Card</p>
        <p className="text-sm text-muted-foreground">With gradient trail</p>
      </div>
    </div>
  );
}
