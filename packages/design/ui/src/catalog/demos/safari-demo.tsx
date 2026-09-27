"use client";

import { Safari } from "@nebutra/ui/primitives";

export function SafariDemo() {
  return (
    <div className="max-w-4xl px-4 py-8 w-full">
      <Safari url="acme.com" className="h-[400px] w-full" />
    </div>
  );
}
