"use client";

import { Input } from "@nebutra/ui/primitives"; // Usually Input is exported

export function InputWithAddonsDemo() {
  return (
    <div className="gap-4 flex flex-col">
      {/* Domain hint */}
      <Input
        suffix={<span className="text-xs text-muted-foreground">@nebutra.com</span>}
        placeholder="username"
      />

      {/* Currency */}
      <Input
        prefix={<span className="text-xs text-muted-foreground">$</span>}
        suffix={
          <span className="text-xs font-medium pl-2 border-l text-muted-foreground">USD</span>
        }
        type="number"
        placeholder="0.00"
      />
    </div>
  );
}
