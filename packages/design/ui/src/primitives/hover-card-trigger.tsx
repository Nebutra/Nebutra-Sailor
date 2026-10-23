"use client";

import { Popover as BasePopover } from "@base-ui/react/popover";
import * as React from "react";
import { resolveLazyChild } from "../utils/lazy-child";
import { rendersNativeButton } from "../utils/native-button";

/** Element the pointer rests on to open the card. Pass `asChild` to use your own control. */
const HoverCardTrigger = ({
  asChild,
  children: rawChildren,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BasePopover.Trigger> & {
  /**
   * Render the trigger onto the single child element instead of a native button.
   * @default false
   */
  asChild?: boolean;
} & {
  ref?: React.Ref<HTMLButtonElement> | undefined;
}) => {
  const children = resolveLazyChild(rawChildren);
  if (asChild && React.isValidElement(children)) {
    return (
      <BasePopover.Trigger
        ref={ref}
        {...props}
        render={children as React.ReactElement<Record<string, unknown>>}
        nativeButton={rendersNativeButton(children)}
      />
    );
  }
  return (
    <BasePopover.Trigger ref={ref} {...props}>
      {children}
    </BasePopover.Trigger>
  );
};
HoverCardTrigger.displayName = "HoverCardTrigger";

export { HoverCardTrigger };
