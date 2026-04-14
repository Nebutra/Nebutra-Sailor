"use client";

import { Button } from "@nebutra/ui/primitives";
import { ArrowRight, Mail } from "lucide-react";

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
