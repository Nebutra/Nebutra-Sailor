"use client";

import { DatePicker } from "@nebutra/ui/primitives";
import { useState } from "react";

export function DatePickerDemo() {
  const [value, setValue] = useState("2026-10-15");
  return (
    <div className="w-full max-w-xs p-6">
      <DatePicker
        label="Renewal date"
        description="The plan renews on this day each year."
        value={value}
        onValueChange={setValue}
      />
    </div>
  );
}
