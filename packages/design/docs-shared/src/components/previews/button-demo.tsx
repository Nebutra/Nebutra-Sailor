"use client";

import { ArrowRight, Envelope as Mail } from "@nebutra/icons";
import { Button } from "@nebutra/ui/primitives";

export function ButtonDemo() {
  return (
    <div className="gap-3 flex flex-wrap">
      <Button variant="default">Default</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="destructive">Destructive</Button>
      <Button prefix={<Mail />}>With Icon</Button>
      <Button suffix={<ArrowRight />}>Continue</Button>
      <Button loading>Loading</Button>
    </div>
  );
}
