"use client";

import { Popover as BasePopover } from "@base-ui/react/popover";
import * as React from "react";
import { overlayTokens } from "../tokens/components/overlay";

export { HoverCardContent } from "./hover-card-content";
export { HoverCardTrigger } from "./hover-card-trigger";

// Base UI Popover currently lacks a native "hover to open" feature built-in,
// so we simulate it with simple controlled state around the BasePopover.
const HoverCard = ({
  openDelay = overlayTokens.motion.hoverOpenDelay,
  closeDelay = overlayTokens.motion.hoverCloseDelay,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof BasePopover.Root> & {
  openDelay?: number;
  closeDelay?: number;
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
