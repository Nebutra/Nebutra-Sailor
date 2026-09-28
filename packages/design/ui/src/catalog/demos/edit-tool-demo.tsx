"use client";

import { EditTool } from "@nebutra/ui/primitives";

const BEFORE = `export function price(cents: number) {
  return "$" + cents / 100;
}`;

const AFTER = `export function price(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}`;

export function EditToolDemo() {
  return (
    <div className="w-full max-w-xl p-6">
      <EditTool
        state="completed"
        filePath="src/lib/price.ts"
        oldContent={BEFORE}
        newContent={AFTER}
      />
    </div>
  );
}
