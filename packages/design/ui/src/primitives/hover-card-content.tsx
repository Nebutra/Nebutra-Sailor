"use client";

import { Popover as BasePopover } from "@base-ui/react/popover";
import type * as React from "react";
import { overlayClassNames, overlayZIndex } from "../tokens/components/overlay";
import { cn } from "../utils/cn";
import { overlayPrimitiveClassNames } from "./overlay";

/** Portalled, anchored card surface shown while the hover card is open. */
const HoverCardContent = ({
  className,
  align = "center",
  sideOffset = 4,
  side = "bottom",
  style,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BasePopover.Popup> & {
  /**
   * Alignment of the card against the trigger along the chosen side.
   * @default "center"
   */
  align?: "start" | "center" | "end";
  /**
   * Gap in pixels between the trigger and the card.
   * @default 4
   */
  sideOffset?: number;
  /**
   * Preferred side of the trigger; the card flips when there is no room.
   * @default "bottom"
   */
  side?: "top" | "right" | "bottom" | "left";
} & { ref?: React.Ref<React.ElementRef<typeof BasePopover.Popup>> | undefined }) => (
  <BasePopover.Portal>
    <BasePopover.Positioner
      style={{ zIndex: overlayZIndex.popover }}
      side={side}
      align={align}
      sideOffset={sideOffset}
    >
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
