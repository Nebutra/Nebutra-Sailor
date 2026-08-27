"use client";

import { Popover as BasePopover } from "@base-ui/react/popover";
import type * as React from "react";
import { overlayClassNames, overlayZIndex } from "../tokens/components/overlay";
import { cn } from "../utils/cn";
import { overlayPrimitiveClassNames } from "./overlay";

const HoverCardContent = ({
  className,
  align = "center",
  sideOffset = 4,
  side = "bottom",
  style,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BasePopover.Popup> & {
  align?: "start" | "center" | "end";
  sideOffset?: number;
  side?: "top" | "right" | "bottom" | "left";
} & { ref?: React.Ref<React.ElementRef<typeof BasePopover.Popup>> | undefined }) => (
  <BasePopover.Portal>
    <BasePopover.Positioner side={side} align={align} sideOffset={sideOffset}>
      <BasePopover.Popup
        ref={ref}
        className={cn(
          overlayClassNames.popoverSurface,
          overlayPrimitiveClassNames.popoverSurface,
          "w-64",
          className,
        )}
        style={{ zIndex: overlayZIndex.popover, ...style }}
        {...props}
      />
    </BasePopover.Positioner>
  </BasePopover.Portal>
);
HoverCardContent.displayName = "HoverCardContent";

export { HoverCardContent };
