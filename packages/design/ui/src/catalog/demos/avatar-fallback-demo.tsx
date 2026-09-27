"use client";

import { Avatar, AvatarFallback } from "@nebutra/ui/primitives";

/** Initials fallback when no image is available */
export function AvatarFallbackDemo() {
  return (
    <div className="gap-3 flex">
      {["AC", "BK", "CL"].map((init) => (
        <Avatar key={init} size="md">
          <AvatarFallback size="md">{init}</AvatarFallback>
        </Avatar>
      ))}
    </div>
  );
}
