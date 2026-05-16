"use client";

import { SpeakerVolumeLoud as Volume2 } from "@nebutra/icons";
import { Slider } from "@nebutra/ui/primitives";
export function Slider3Demo() {
  return (
    <div className="flex w-full items-end gap-3">
      <Volume2 className="h-4 w-4 shrink-0 text-muted-foreground" />
      <Slider defaultValue={70} label="Volume" max={100} step={5} unit="%" />
    </div>
  );
}
