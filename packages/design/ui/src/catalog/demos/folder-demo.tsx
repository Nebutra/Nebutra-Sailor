"use client";

import { Folder } from "@nebutra/ui/primitives";

export function FolderDemo() {
  return (
    <div className="flex flex-wrap items-end gap-6 p-6">
      <Folder color="blue" label="Contracts" />
      <Folder color="yellow" label="Invoices" />
      <Folder color="grey" size="sm" label="Archive" />
    </div>
  );
}
