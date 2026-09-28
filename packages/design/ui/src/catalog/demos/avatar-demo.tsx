"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@nebutra/ui/primitives";

const va = (seed: string) => `https://avatar.vercel.sh/${seed}`;

/** xs → xl with gradient avatars + size label */
export function AvatarDemo() {
  return (
    <div className="gap-6 flex flex-wrap items-end">
      {(["xs", "sm", "md", "lg", "xl"] as const).map((size) => (
        <div key={size} className="gap-2 flex flex-col items-center">
          <Avatar size={size}>
            <AvatarImage src={va(`nebutra-${size}`)} alt={size} />
            <AvatarFallback size={size}>{size.toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="text-[11px] text-muted-foreground">{size}</span>
        </div>
      ))}
    </div>
  );
}
