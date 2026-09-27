"use client";

import { FileCard } from "@nebutra/ui/primitives";

export function FileCardDemo() {
  return (
    <div className="flex flex-wrap items-end gap-4 p-6">
      <FileCard format="pdf" />
      <FileCard format="doc" />
      <FileCard format="csv" />
      <FileCard format="md" />
    </div>
  );
}
