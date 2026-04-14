"use client";

import { Badge, Button } from "@nebutra/ui/primitives";

export default function BasePopoverDemo() {
  return (
    <div className="flex items-center gap-3">
      <Button variant="outline">Show Popover</Button>
      <div className="rounded-lg border bg-popover p-4 max-w-[300px] text-sm space-y-2 shadow-md">
        <p className="font-medium">Premium Plan</p>
        <p className="text-muted-foreground">
          Advanced analytics provides deeper insights into your data, including trends, predictions,
          and detailed user behavior.
        </p>
        <p className="flex items-center space-x-1">
          <Badge variant="destructive">Note!</Badge>
          <span className="text-xs text-muted-foreground">Plan upgrade is required.</span>
        </p>
      </div>
    </div>
  );
}
