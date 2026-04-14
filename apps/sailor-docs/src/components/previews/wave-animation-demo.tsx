"use client";

import { Button, WaveAnimation } from "@nebutra/ui/primitives";
import { Activity, Pause, Play } from "lucide-react";
import { useState } from "react";

export function WaveAnimationDemo() {
  const [paused, setPaused] = useState(false);

  return (
    <div className="bg-zinc-950 relative flex h-[400px] w-full flex-col items-center justify-center overflow-hidden rounded-xl border">
      {/* Absolute positioned wave animation */}
      <WaveAnimation
        paused={paused}
        position="absolute"
        zIndex={1}
        palette={["#6366f1", "#8b5cf6", "#d946ef", "#f43f5e", "#f97316"]}
        speed={1.5}
        barCount={40}
        amplitude={1.2}
        trailOpacity={0.05}
      />

      {/* Content on top */}
      <div className="gap-6 p-6 bg-black/40 backdrop-blur-sm border-white/10 relative z-10 flex flex-col items-center rounded-2xl border text-center shadow-2xl">
        <div className="gap-3 flex items-center">
          <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-full">
            <Activity className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tighter text-white">Audio Visualizer</h2>
        </div>

        <p className="text-zinc-300 max-w-sm text-sm leading-relaxed">
          Dynamic HTML5 canvas visualization with trailing effects and customizable color palettes.
        </p>

        <Button
          variant="outline"
          size="sm"
          className="bg-zinc-900 border-zinc-700 text-white hover:bg-white hover:text-black transition-colors"
          onClick={() => setPaused(!paused)}
          prefix={paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
        >
          {paused ? "Resume Feed" : "Pause Feed"}
        </Button>
      </div>
    </div>
  );
}
