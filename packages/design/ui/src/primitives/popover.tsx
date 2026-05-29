import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import * as React from "react";
import { overlayClassNames, overlayZIndex } from "../tokens/components/overlay";
import { cn } from "../utils/cn";
import { overlayPrimitiveClassNames } from "./overlay";

function Popover({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

type PopoverTriggerProps = React.ComponentProps<typeof PopoverPrimitive.Trigger> & {
  asChild?: boolean;
};

function PopoverTrigger({ asChild, children, render, ...props }: PopoverTriggerProps) {
  const renderElement: PopoverPrimitive.Trigger.Props["render"] =
    asChild && React.isValidElement(children) ? children : render;
  return (
    <PopoverPrimitive.Trigger
      data-slot="popover-trigger"
      render={renderElement}
      {...(renderElement ? props : { ...props, children })}
    />
  );
}

function PopoverPositioner({
  sideOffset = 4,
  style,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Positioner>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        data-slot="popover-positioner"
        sideOffset={sideOffset}
        style={{ zIndex: overlayZIndex.popover, ...style }}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

export interface PopoverContentProps extends React.ComponentProps<typeof PopoverPrimitive.Popup> {
  align?: PopoverPrimitive.Positioner.Props["align"];
  sideOffset?: PopoverPrimitive.Positioner.Props["sideOffset"];
  alignOffset?: PopoverPrimitive.Positioner.Props["alignOffset"];
  side?: PopoverPrimitive.Positioner.Props["side"];
  showArrow?: boolean;
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 8,
  alignOffset = 0,
  side = "bottom",
  children,
  showArrow = false,
  style,
  ...props
}: PopoverContentProps) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        data-slot="popover-positioner"
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        side={side}
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn(
            overlayClassNames.popoverSurface,
            overlayPrimitiveClassNames.popoverSurface,
            className,
          )}
          style={{ zIndex: overlayZIndex.popover, ...style }}
          {...props}
        >
          {children}
          {showArrow && <PopoverArrow />}
        </PopoverPrimitive.Popup>
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}

function PopoverArrow({
  className,
  style,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Arrow>) {
  return (
    <PopoverPrimitive.Arrow
      data-slot="popover-arrow"
      className={cn(
        "data-[side=bottom]:top-[-8px] data-[side=left]:right-[-13px] data-[side=left]:rotate-90 data-[side=right]:left-[-13px] data-[side=right]:-rotate-90 data-[side=top]:bottom-[-8px] data-[side=top]:rotate-180",
        className,
      )}
      style={{ zIndex: overlayZIndex.popover, ...style }}
      {...props}
    >
      <svg aria-hidden="true" width="20" height="10" viewBox="0 0 20 10" fill="none">
        <path
          d="M9.66437 2.60207L4.80758 6.97318C4.07308 7.63423 3.11989 8 2.13172 8H0V9H20V8H18.5349C17.5468 8 16.5936 7.63423 15.8591 6.97318L11.0023 2.60207C10.622 2.2598 10.0447 2.25979 9.66437 2.60207Z"
          className="fill-popover"
        />
        <path
          d="M10.3333 3.34539L5.47654 7.71648C4.55842 8.54279 3.36693 9 2.13172 9H0V8H2.13172C3.11989 8 4.07308 7.63423 4.80758 6.97318L9.66437 2.60207C10.0447 2.25979 10.622 2.2598 11.0023 2.60207L15.8591 6.97318C16.5936 7.63423 17.5468 8 18.5349 8H20V9H18.5349C17.2998 9 16.1083 8.54278 15.1901 7.71648L10.3333 3.34539Z"
          className="fill-border"
        />
      </svg>
    </PopoverPrimitive.Arrow>
  );
}

function PopoverAnchor({ ...props }: React.ComponentProps<"span">) {
  return <span data-slot="popover-anchor" {...props} />;
}

export { Popover, PopoverAnchor, PopoverContent, PopoverPositioner, PopoverTrigger };
