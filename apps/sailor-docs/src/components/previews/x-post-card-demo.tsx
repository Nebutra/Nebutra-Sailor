"use client";

import { XPostCard } from "@nebutra/ui/primitives";

export function XPostCardDemo() {
  return (
    <div className="py-12 md:flex-row gap-8 flex w-full flex-col items-center justify-center border-y bg-muted/20">
      {/* Real Post */}
      <div className="gap-3 max-w-sm flex w-full flex-col">
        <h3 className="text-sm font-medium ml-1 text-muted-foreground">Embedded Post</h3>
        <XPostCard
          id="1744047805177266619" // Next.js related tweet
          className="w-full"
        />
      </div>

      {/* Mocked/Fallback/Different Post */}
      <div className="gap-3 max-w-sm flex w-full flex-col">
        <h3 className="text-sm font-medium ml-1 text-muted-foreground">Light Theme Preview</h3>
        <div className="light bg-white p-4 border-zinc-200 rounded-xl border">
          <XPostCard
            id="1612501538392551424" // Another popular tech tweet
            className="w-full border-0 bg-transparent shadow-none"
          />
        </div>
      </div>
    </div>
  );
}
