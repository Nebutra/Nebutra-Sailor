"use client";

import { MoreVertical as GripVertical } from "@nebutra/icons";
import type * as React from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { cn } from "../utils/cn";
import { controlFocusVisibleClassName } from "./form-control";

/**
 * Flex container that lays its panels out along one axis and owns their shared layout.
 * Wraps `Group` from react-resizable-panels v4, so `defaultLayout`, `onLayoutChanged`,
 * `disabled` and `groupRef` pass straight through. Panel sizes are not persisted by the wrapper:
 * save them yourself from `onLayoutChanged` and restore them with `defaultLayout`.
 * Give the group a height (or a width, for vertical) so the panels have space to divide.
 */
function ResizablePanelGroup({
  className,
  direction,
  orientation,
  ...props
}: React.ComponentProps<typeof Group> & {
  /**
   * Layout axis, kept for older call sites. `orientation` wins when both are set.
   * @deprecated Use `orientation` instead
   */
  direction?: "horizontal" | "vertical";
}) {
  return (
    <Group
      orientation={orientation ?? direction ?? "horizontal"}
      className={cn("flex h-full w-full data-[panel-group-direction=vertical]:flex-col", className)}
      {...props}
    />
  );
}

/**
 * One resizable region of a `ResizablePanelGroup`; it is react-resizable-panels' `Panel` unchanged.
 * Numeric sizes are pixels and strings are percentages (`defaultSize="30%"`), and a panel must be
 * a direct child of the group. Use `minSize`, `maxSize` and `collapsible` to constrain it.
 */
const ResizablePanel = Panel;

/**
 * Draggable, keyboard-focusable divider between two panels (`role="separator"`).
 * Arrow keys along the group's axis resize the neighbouring panels, Home and End jump to their
 * limits, Enter collapses or expands the collapsible panel before it, and F6 moves focus to the
 * next divider. Place it directly between two `ResizablePanel`s.
 */
const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof Separator> & {
  /**
   * Show a grip chip centred on the divider so the drag target is visible.
   * @default false
   */
  withHandle?: boolean;
}) => (
  <Separator
    className={cn(
      // react-resizable-panels v4 reports the axis as aria-orientation on the separator
      // (a vertical group gets a horizontal separator), not as data-panel-group-direction.
      "relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full aria-[orientation=horizontal]:after:left-0 aria-[orientation=horizontal]:after:h-1 aria-[orientation=horizontal]:after:w-full aria-[orientation=horizontal]:after:-translate-y-1/2 aria-[orientation=horizontal]:after:translate-x-0 [&[aria-orientation=horizontal]>div]:rotate-90",
      controlFocusVisibleClassName,
      className,
    )}
    {...props}
  >
    {withHandle && (
      <div className="z-10 flex h-4 w-3 items-center justify-center rounded-[var(--radius-sm)] border bg-border">
        <GripVertical className="size-2.5" />
      </div>
    )}
  </Separator>
);

export { ResizableHandle, ResizablePanel, ResizablePanelGroup };
