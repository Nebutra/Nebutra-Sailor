"use client";

import { RelativeTimeCard } from "@nebutra/ui/primitives";

const DEPLOYED_AT = new Date(Date.now() - 1000 * 60 * 47);

export function RelativeTimeCardDemo() {
  return (
    <div className="p-10 text-muted-foreground text-sm">
      Last deployed <RelativeTimeCard date={DEPLOYED_AT} /> by Dana
    </div>
  );
}
