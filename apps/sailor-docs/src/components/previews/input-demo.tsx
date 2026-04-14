"use client";
import { Input } from "@nebutra/ui/primitives";
export function InputDemo() {
  return (
    <div className="gap-3 max-w-sm flex flex-col">
      <Input placeholder="Default input" />
      <Input placeholder="Disabled input" disabled />
    </div>
  );
}
