"use client";

import { Button } from "@nebutra/ui/primitives";
export function ButtonVariantsDemo() {
  return (
    <div className="gap-3 flex">
      <Button variant="default">Default</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="destructive">Delete</Button>
      <Button variant="warning">Warning</Button>
      <Button variant="link">Learn more</Button>
    </div>
  );
}
