"use client";

import { Button, StarsCanvas } from "@nebutra/ui/primitives";
import { Pause, Play } from "lucide-react";
import { useState } from "react";

export function StarsCanvasDemo() {
  const [paused, setPaused] = useState(false);

  return (
    <div className="bg-black relative flex h-[500px] w-full flex-col items-center justify-center overflow-hidden rounded-xl border">
      {/* Absolute positioned stars canvas */}
      <StarsCanvas
        paused={paused}
        transparent={true} // Transparent so we can see the black bg
        hue={280} // Purple-ish stars
        brightness={0.8}
        speedMultiplier={0.8}
        position="absolute"
        zIndex={1}
      />

      {/* Content on top */}
      <div className="gap-6 p-6 relative z-10 flex flex-col items-center text-center">
        <div className="space-y-2 max-w-md">
          <h2 className="text-4xl font-bold tracking-tighter text-white">Atmospheric Effects</h2>
          <p className="text-zinc-400">
            Create immersive depth with performant HTML5 canvas particle systems. Perfect for hero
            sections and dark mode experiences.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="bg-black/50 border-zinc-800 text-white hover:bg-white hover:text-black transition-colors"
          onClick={() => setPaused(!paused)}
          prefix={paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
        >
          {paused ? "Resume Animation" : "Pause Animation"}
        </Button>
      </div>
    </div>
  );
}
