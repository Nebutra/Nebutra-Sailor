"use client";

"use client";

import { Radio as BaseRadio } from "@base-ui/react/radio";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import type * as React from "react";
import { cn } from "../utils/cn";
import { controlFocusVisibleClassName } from "./form-control";

const RadioGroupCard = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseRadioGroup> & {
  ref?: React.Ref<React.ComponentRef<typeof BaseRadioGroup>> | undefined;
}) => {
  return <BaseRadioGroup className={cn("grid gap-2", className)} {...props} ref={ref} />;
};
RadioGroupCard.displayName = "RadioGroupCard";

const RadioGroupCardItem = ({
  className,
  children,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseRadio.Root> & {
  ref?: React.Ref<React.ComponentRef<typeof BaseRadio.Root>> | undefined;
}) => {
  return (
    <BaseRadio.Root
      ref={ref}
      className={cn(
        // Base UI radio emits `data-checked` / `data-unchecked`. The Radix-era
        // `data-state-checked:` selectors this shipped with never matched, so the
        // selected card had no visual state at all.
        // Hairline at rest; selection adds a 1px ring on top of the border (a 2px
        // edge, drawn only when chosen) plus a faint primary wash.
        "relative flex flex-col items-center justify-center rounded-[var(--radius-card,var(--radius-lg))] border border-input bg-popover p-4",
        "transition-[background-color,border-color,box-shadow,color] duration-micro ease-out motion-reduce:transition-none",
        "hover:bg-accent hover:text-accent-foreground",
        "data-[checked]:border-primary data-[checked]:bg-primary/5 data-[checked]:ring-1 data-[checked]:ring-primary",
        controlFocusVisibleClassName,
        className,
      )}
      {...props}
    >
      {children}
    </BaseRadio.Root>
  );
};
RadioGroupCardItem.displayName = "RadioGroupCardItem";

export { RadioGroupCard, RadioGroupCardItem };
