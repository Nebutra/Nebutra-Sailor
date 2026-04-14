"use client";

import { Textarea } from "@nebutra/ui/primitives";

export function TextareaWithLimitDemo() {
  return (
    <div className="gap-1 flex w-full flex-col">
      <Textarea defaultValue="" placeholder="Type here..." maxLength={500} />
      <span className="text-xs w-full text-right text-muted-foreground">0/500</span>
    </div>
  );
}
