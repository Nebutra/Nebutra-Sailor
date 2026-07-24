"use client";

import { GlobeStickers } from "@/components/ui/globe-stickers";

export function ExportMockup() {
  return (
    <div className="w-full h-full max-w-md lg:max-w-lg mx-auto flex items-center justify-center p-4">
      <GlobeStickers speed={0.005} className="w-full" />
    </div>
  );
}
