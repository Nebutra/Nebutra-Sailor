"use client";

import { XPostCard } from "@nebutra/ui/primitives";

// Public posts from @vercel; the card fetches them through react-tweet's API.
export function XPostCardDemo() {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-6 p-6 md:flex-row md:items-start">
      <XPostCard id="1683920951807971329" className="w-full max-w-sm" />
      <XPostCard id="1628832338187636740" className="w-full max-w-sm" />
    </div>
  );
}
