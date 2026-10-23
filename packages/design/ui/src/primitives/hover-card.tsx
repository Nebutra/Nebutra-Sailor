"use client";

import { Popover as BasePopover } from "@base-ui/react/popover";
import * as React from "react";
import { overlayTokens } from "../tokens/components/overlay";

export { HoverCardContent } from "./hover-card-content";
export { HoverCardTrigger } from "./hover-card-trigger";

// Base UI Popover currently lacks a native "hover to open" feature built-in,
// so we simulate it with simple controlled state around the BasePopover.
/**
 * HoverCard - Preview card revealed on pointer hover
 *
 * @description
 * Groups a trigger and a card that opens after the pointer rests on the wrapper and closes
 * shortly after it leaves. Open state is driven by pointer hover only: keyboard focus and clicks
 * do not open it, so never make it the only way to reach its content. Closing by Escape or an
 * outside press is still honoured.
 */
const HoverCard = ({
  openDelay = overlayTokens.motion.hoverOpenDelay,
  closeDelay = overlayTokens.motion.hoverCloseDelay,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof BasePopover.Root> & {
  /**
   * Milliseconds the pointer must rest on the wrapper before the card opens.
   * @default 200
   */
  openDelay?: number;
  /**
   * Milliseconds after the pointer leaves before the card closes.
   * @default 100
   */
  closeDelay?: number;
  /** The `HoverCardTrigger` and `HoverCardContent` parts. */
  children: React.ReactNode;
}) => {
  const [open, setOpen] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout>(null);

  function handleMouseEnter() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setOpen(true), openDelay);
  }

  function handleMouseLeave() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setOpen(false), closeDelay);
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: hover state wrapper — interactive trigger lives inside HoverCardTrigger
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="inline-block relative"
    >
      <BasePopover.Root
        open={open}
        onOpenChange={(v) => {
          if (!v) setOpen(false); // Only allow closing via clicks outside
        }}
        {...props}
      >
        {children}
      </BasePopover.Root>
    </div>
  );
};
HoverCard.displayName = "HoverCard";

export { HoverCard };
