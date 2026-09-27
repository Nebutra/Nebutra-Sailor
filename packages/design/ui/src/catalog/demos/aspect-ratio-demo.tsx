"use client";

import { AspectRatio } from "@nebutra/ui/primitives";
import Image from "next/image";

export function AspectRatioDemo() {
  return (
    <div className="max-w-sm w-full">
      <AspectRatio
        ratio={16 / 9}
        className="overflow-hidden rounded-md bg-muted ring-1 ring-border"
      >
        <Image
          src="https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?q=80&w=2070&auto=format&fit=crop"
          alt="Example landscape from Unsplash"
          fill
          className="object-cover"
        />
      </AspectRatio>
    </div>
  );
}
