"use client";

import { DitheringShader } from "@nebutra/ui/primitives";

export function DitheringShaderDemo() {
  return (
    <div className="md:grid-cols-2 gap-8 max-w-4xl p-4 mx-auto grid w-full grid-cols-1">
      <div className="gap-2 relative flex flex-col">
        <div className="top-4 left-4 backdrop-blur text-xs px-2 py-1 rounded absolute z-10 border bg-background/80 font-mono">
          shape="wave" type="4x4"
        </div>
        <div className="h-[300px] w-full overflow-hidden rounded-xl border">
          <DitheringShader
            shape="wave"
            type="4x4"
            width={800}
            height={600}
            colorBack="#000000"
            colorFront="#4338ca"
            pxSize={3}
            speed={0.8}
            className="h-full w-full"
          />
        </div>
      </div>

      <div className="gap-2 relative flex flex-col">
        <div className="top-4 left-4 backdrop-blur text-xs px-2 py-1 rounded absolute z-10 border bg-background/80 font-mono">
          shape="sphere" type="8x8"
        </div>
        <div className="h-[300px] w-full overflow-hidden rounded-xl border">
          <DitheringShader
            shape="sphere"
            type="8x8"
            width={800}
            height={600}
            colorBack="#000000"
            colorFront="#db2777"
            pxSize={4}
            speed={1.2}
            className="h-full w-full"
          />
        </div>
      </div>
    </div>
  );
}
