"use client";

import { Textarea } from "@nebutra/ui/primitives";
import { useState } from "react";

export function TextareaWithLimitDemo() {
  const [value, setValue] = useState("");
  const maxLength = 500;

  return (
    <div className="gap-1 flex w-full flex-col">
      <Textarea
        id="limited-notes"
        label="Notes"
        value={value}
        onValueChange={setValue}
        placeholder="Type here..."
        maxLength={maxLength}
      />
      <span className="w-full text-right text-muted-foreground text-xs">
        {value.length}/{maxLength}
      </span>
    </div>
  );
}
