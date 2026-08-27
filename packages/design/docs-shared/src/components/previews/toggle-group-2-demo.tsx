"use client";

import { TextBold as Bold, TextItalic as Italic, TextFormat as Underline } from "@nebutra/icons";
import { ToggleGroup, ToggleGroupItem } from "@nebutra/ui/primitives";
export function ToggleGroup2Demo() {
  return (
    <ToggleGroup type="multiple" defaultValue={["bold", "italic"]}>
      <ToggleGroupItem value="bold" aria-label="Toggle bold">
        <Bold className="size-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="italic" aria-label="Toggle italic">
        <Italic className="size-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="underline" aria-label="Toggle underline">
        <Underline className="size-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
