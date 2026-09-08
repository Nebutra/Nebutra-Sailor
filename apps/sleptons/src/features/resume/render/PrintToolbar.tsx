"use client";

import { Button } from "@nebutra/ui/primitives";
import Link from "next/link";

export function PrintToolbar() {
  return (
    <div
      data-print-toolbar
      className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-4 py-2 text-sm"
    >
      <span className="text-muted-foreground">
        Use your browser's print dialog and choose “Save as PDF”.
      </span>
      <div className="flex gap-2">
        <Button asChild variant="ghost">
          <Link href="/resume/edit">Back to editor</Link>
        </Button>
        <Button type="button" variant="default" onClick={() => window.print()}>
          Print
        </Button>
      </div>
    </div>
  );
}
