"use client";

import { Popover as BasePopover } from "@base-ui/react/popover";
import * as React from "react";

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
