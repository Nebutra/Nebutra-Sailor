"use client";

import { RelativeTimeCard } from "@nebutra/ui/primitives";

const NOW = Date.now();
const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const ROWS = [
  { label: "10s", delta: 10 * 1000 },
  { label: "2m", delta: 2 * MIN },
  { label: "5h", delta: 5 * HOUR },
  { label: "Yesterday", delta: 26 * HOUR },
  { label: "3d", delta: 3 * DAY },
  { label: "21d", delta: 21 * DAY },
  { label: "~2y", delta: 2 * 365 * DAY },
];

export function RelativeTimeCardDemo() {
  return (
    <div className="grid w-full max-w-md grid-cols-2 gap-x-12 gap-y-3 font-mono text-sm">
      {ROWS.map(({ label, delta }) => (
        <div key={label} className="contents">
          <span className="text-muted-foreground">{label} ago</span>
          <RelativeTimeCard date={NOW - delta} />
        </div>
      ))}
    </div>
  );
}
