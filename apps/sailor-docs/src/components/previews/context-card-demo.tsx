"use client";

import { ContextCard } from "@nebutra/ui/primitives";

export function ContextCardDemo() {
  return (
    <ContextCard.Trigger content="The Evil Rabbit Jumped over the Fence" side="top">
      <span className="cursor-default underline decoration-dotted underline-offset-4">
        Hover over me
      </span>
    </ContextCard.Trigger>
  );
}
