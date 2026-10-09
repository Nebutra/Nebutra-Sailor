"use client";

import { NumberField } from "@nebutra/ui/primitives";
import { useState } from "react";

export function NumberFieldDemo() {
  const [seats, setSeats] = useState<number | null>(5);
  return (
    <div className="grid w-full max-w-sm gap-4 p-6">
      <NumberField
        id="demo-seats"
        label="Seats"
        description="Between 1 and 50. Drag the label to scrub."
        scrub
        min={1}
        max={50}
        value={seats}
        onValueChange={setSeats}
      />
      <NumberField
        id="demo-budget"
        label="Monthly budget"
        locale="en-US"
        format={{ style: "currency", currency: "USD" }}
        step={50}
        defaultValue={1200}
      />
      <NumberField id="demo-padding" label="Padding" suffix="px" defaultValue={16} size="sm" />
    </div>
  );
}
