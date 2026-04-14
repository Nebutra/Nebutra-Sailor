"use client";

import { cn } from "@nebutra/ui/utils";
import { GripVertical } from "lucide-react";
import type { ComponentProps } from "react";
import { Group, Panel as ResizablePanel, Separator } from "react-resizable-panels";

type ResizablePanelGroupProps = ComponentProps<typeof Group>;
type ResizableHandleProps = ComponentProps<typeof Separator> & {
  withHandle?: boolean;
};

export function ResizablePanelGroup({ className, ...props }: ResizablePanelGroupProps) {
  return (
    <Group
      className={cn("flex h-full w-full data-[panel-group-direction=vertical]:flex-col", className)}
      {...props}
    />
  );
}

export { ResizablePanel };

export function ResizableHandle({ className, withHandle = false, ...props }: ResizableHandleProps) {
  return (
    <Separator
      className={cn(
        "relative flex w-px shrink-0 items-center justify-center bg-border/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "after:absolute after:inset-y-0 after:left-1/2 after:w-3 after:-translate-x-1/2",
        "data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full",
        "data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:top-1/2 data-[panel-group-direction=vertical]:after:h-3 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0",
        className,
      )}
      {...props}
    >
      {withHandle ? (
        <span className="z-10 flex h-6 w-4 items-center justify-center rounded-sm border bg-background shadow-sm data-[panel-group-direction=vertical]:h-4 data-[panel-group-direction=vertical]:w-6">
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground data-[panel-group-direction=vertical]:rotate-90" />
        </span>
      ) : null}
    </Separator>
  );
}
