import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { usePortalContainer } from "@nebutra/ui/utils/portal-container";
import * as React from "react";
import { overlayClassNames, overlayZIndex } from "../tokens/components/overlay";
import { cn } from "../utils/cn";
import { resolveLazyChild } from "../utils/lazy-child";
import { rendersNativeButton } from "../utils/native-button";
import { overlayPrimitiveClassNames } from "./overlay";

/** Coordinates a trigger and anchored popup using Base UI's popover state and focus handling. */
function Popover({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

/** Portal target accepted by popover content and positioning primitives. */
export type PopoverPortalContainer = React.ComponentProps<
  typeof PopoverPrimitive.Portal
>["container"];

type PopoverTriggerProps = React.ComponentProps<typeof PopoverPrimitive.Trigger> & {
  /** Uses a single valid child element as the trigger instead of creating a button. */
  asChild?: boolean;
};

/** Opens or toggles the popover, optionally composing the behavior onto a child element. */
function PopoverTrigger({ asChild, children: rawChildren, render, ...props }: PopoverTriggerProps) {
  const children = resolveLazyChild(rawChildren);
  const renderElement: PopoverPrimitive.Trigger.Props["render"] =
    asChild && React.isValidElement(children) ? children : render;
  return (
    <PopoverPrimitive.Trigger
      data-slot="popover-trigger"
      render={renderElement}
      nativeButton={rendersNativeButton(renderElement)}
      {...(renderElement ? props : { ...props, children })}
    />
  );
}

/** Portals a caller-composed popover surface and positions it relative to the trigger. */
function PopoverPositioner({
  sideOffset = 4,
  container,
  style,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Positioner> & {
  /** Portal target; defaults to the nearest portal scope or document.body. */
  container?: PopoverPortalContainer;
}) {
  const portalContainer = usePortalContainer(container);
  return (
    <PopoverPrimitive.Portal container={portalContainer}>
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
  /** Alignment of the popup along the trigger's side. */
  align?: PopoverPrimitive.Positioner.Props["align"];
  /** Gap from the trigger, in pixels or a Base UI offset callback. */
  sideOffset?: PopoverPrimitive.Positioner.Props["sideOffset"];
  /** Offset along the alignment axis, in pixels or a Base UI offset callback. */
  alignOffset?: PopoverPrimitive.Positioner.Props["alignOffset"];
  /** Preferred side of the trigger; collision handling may choose another side. */
  side?: PopoverPrimitive.Positioner.Props["side"];
  /** Adds a decorative arrow pointing toward the trigger. */
  showArrow?: boolean;
  /** Portal target; defaults to the nearest portal scope or document.body. */
  container?: PopoverPortalContainer;
}

/** Renders the styled popover surface in a portal, with optional arrow and positioning offsets. */
function PopoverContent({
  className,
  align = "center",
  sideOffset = 8,
  alignOffset = 0,
  side = "bottom",
  children,
  showArrow = false,
  container,
  style,
  ...props
}: PopoverContentProps) {
  const portalContainer = usePortalContainer(container);
  return (
    <PopoverPrimitive.Portal container={portalContainer}>
      <PopoverPrimitive.Positioner
        style={{ zIndex: overlayZIndex.popover }}
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
          style={style}
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
        // `data-side` is the physical side the popup opened on, so the arrow must sit on the
        // matching physical edge (right-/left-), not on a logical one.
        "data-[side=bottom]:top-[-8px] data-[side=left]:right-[-13px] data-[side=left]:rotate-90 data-[side=right]:left-[-13px] data-[side=right]:-rotate-90 data-[side=top]:bottom-[-8px] data-[side=top]:rotate-180", // allow-physical: data-side is the physical side the popup opened on
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

/** Span wrapper for caller-composed anchor content, marked with the popover-anchor slot. */
function PopoverAnchor({ ...props }: React.ComponentProps<"span">) {
  return <span data-slot="popover-anchor" {...props} />;
}

export { Popover, PopoverAnchor, PopoverContent, PopoverPositioner, PopoverTrigger };
