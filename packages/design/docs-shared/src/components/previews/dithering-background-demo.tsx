"use client";

import { DitheringBackground } from "@nebutra/ui/primitives";
import { useState } from "react";

export function DitheringBackgroundDemo() {
  const [theme, setTheme] = useState<"system" | "light" | "dark">("dark");

  return (
    <div className="relative flex h-[500px] w-full flex-col items-center justify-center overflow-hidden rounded-xl border">
      <DitheringBackground
        themeMode={theme}
        intensity={0.65}
        shape="swirl"
        type="8x8"
        parallax={true}
        parallaxStrength={15}
        className="rounded-xl"
      />

      <div className="backdrop-blur-md p-6 max-w-sm gap-4 relative z-10 flex flex-col items-center rounded-2xl border bg-background/50 text-center shadow-lg">
        <h3 className="text-2xl font-bold tracking-tight">Dithering Shader</h3>
        <p className="text-sm text-muted-foreground">
          A WebGL-powered shader background featuring retro dithering patterns and interactive
          parallax.
        </p>

        <div className="gap-2 mt-2 flex">
          <button
            type="button"
            className={`px-3 py-1 text-xs rounded-full border ${theme === "dark" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
            onClick={() => setTheme("dark")}
          >
            Dark
          </button>
          <button
            type="button"
            className={`px-3 py-1 text-xs rounded-full border ${theme === "light" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
            onClick={() => setTheme("light")}
          >
            Light
          </button>
        </div>
      </div>
    </div>
  );
}
