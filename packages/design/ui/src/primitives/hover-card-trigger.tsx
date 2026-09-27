"use client";

import { Popover as BasePopover } from "@base-ui/react/popover";
import * as React from "react";
import { rendersNativeButton } from "../utils/native-button";

const HoverCardTrigger = ({
  asChild,
  children,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BasePopover.Trigger> & { asChild?: boolean } & {
  ref?: React.Ref<HTMLButtonElement> | undefined;
}) => {
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
