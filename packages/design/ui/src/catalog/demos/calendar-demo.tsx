"use client";

import { Calendar } from "@nebutra/ui/primitives";
import { useState } from "react";

export function CalendarDemo() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  return (
    <div className="flex justify-center p-6">
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        className="rounded-[var(--radius-lg)] border border-border"
      />
    </div>
  );
}
