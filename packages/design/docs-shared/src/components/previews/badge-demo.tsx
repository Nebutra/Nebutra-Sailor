"use client";
import { Badge } from "@nebutra/ui/primitives";
export function BadgeDemo() {
  return (
    <div className="gap-2 flex flex-wrap">
      <Badge>Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="outline">Outline</Badge>
    </div>
  );
}
