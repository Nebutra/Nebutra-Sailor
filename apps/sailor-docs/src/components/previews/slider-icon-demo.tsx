"use client";
import { SpeakerVolumeLoud as Volume2 } from "@nebutra/icons";
import { Slider } from "@nebutra/ui/primitives";

export function SliderIconDemo() {
  return (
    <div className="gap-3 flex w-full items-center">
      <Volume2 className="h-4 w-4 shrink-0 text-muted-foreground" />
      <Slider defaultValue={70} max={100} step={1} />
    </div>
  );
}
