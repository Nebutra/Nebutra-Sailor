"use client";

import { Dropzone } from "@nebutra/ui/primitives";
import { useState } from "react";

export function DropzoneDemo() {
  const [names, setNames] = useState<string[]>([]);
  return (
    <div className="grid w-full max-w-md gap-4 p-6">
      <Dropzone
        multiple
        maxFiles={3}
        maxSize={5 * 1024 * 1024}
        accept="image/*,.pdf"
        paste
        description="Images or PDF, up to 5 MB each. Paste works too."
        onFiles={(files) => setNames(files.map((file) => file.name))}
      />
      <Dropzone size="sm" label="Attach a CSV" accept=".csv,text/csv" onFiles={() => {}} />
      {names.length > 0 ? (
        <ul className="text-sm text-muted-foreground">
          {names.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
