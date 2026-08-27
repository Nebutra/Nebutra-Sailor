"use client";

import { Avatar, AvatarFallback } from "@nebutra/ui/primitives";

export function AvatarFallbackSimpleDemo() {
  return (
    <Avatar size="md">
      <AvatarFallback size="md">NN</AvatarFallback>
    </Avatar>
  );
}
