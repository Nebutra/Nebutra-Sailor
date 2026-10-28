"use client";

import { useDirection } from "@base-ui/react/direction-provider";
import { Popover as BasePopover } from "@base-ui/react/popover";
import * as React from "react";
import { overlayClassNames, overlayZIndex } from "../tokens/components/overlay";
import { cn } from "../utils/cn";
import { HoverCardContext } from "./hover-card-context";
import { overlayPrimitiveClassNames } from "./overlay";

/**
 * Portalled, anchored card surface shown while the hover card is open. Opening never moves focus
 * into it: focus stays on the trigger, and Tab reaches the card's focusable content in page order.
 */
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
   * Preferred side of the trigger; the card flips when there is no room. Prefer `inline-start` and
   * `inline-end`: they mirror under `dir="rtl"`, while `left` and `right` stay physical.
   * @default "bottom"
   */
  side?: "top" | "right" | "bottom" | "left" | "inline-start" | "inline-end";
} & { ref?: React.Ref<React.ElementRef<typeof BasePopover.Popup>> | undefined }) => {
  const root = React.use(HoverCardContext);
  // HoverCard wraps its root in a DirectionProvider fed from the `dir` around the trigger; the
  // portalled positioner needs the same value as a `dir` attribute so `align` and the text inside
  // the card resolve in that direction too.
  const direction = useDirection();
  return (
    <BasePopover.Portal>
      <BasePopover.Positioner
        dir={direction}
        style={{ zIndex: overlayZIndex.popover }}
        side={side}
        align={align}
        sideOffset={sideOffset}
      >
        <BasePopover.Popup
          ref={ref}
          initialFocus={false}
          finalFocus={() => {
            root?.suppressFocusOpen();
            return true;
          }}
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
};
HoverCardContent.displayName = "HoverCardContent";

export { HoverCardContent };
