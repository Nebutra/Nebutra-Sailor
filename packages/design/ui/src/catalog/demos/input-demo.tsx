"use client";
import { Input } from "@nebutra/ui/primitives";
export function InputDemo() {
  return (
    <div className="flex max-w-sm flex-col gap-3">
      <Input aria-label="Small project name" size="sm" placeholder="Small" />
      <Input aria-label="Default project name" placeholder="Default" />
      <Input aria-label="Large project name" size="lg" placeholder="Large" />
    </div>
  );
}
