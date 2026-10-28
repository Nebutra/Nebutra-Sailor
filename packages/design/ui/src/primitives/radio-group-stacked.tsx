"use client";

"use client";

import { Radio as BaseRadio } from "@base-ui/react/radio";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import type * as React from "react";
import { cn } from "../utils/cn";
import { controlFocusVisibleClassName } from "./form-control";

const RadioGroupStacked = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseRadioGroup> & {
  ref?: React.Ref<React.ComponentRef<typeof BaseRadioGroup>> | undefined;
}) => {
  return <BaseRadioGroup className={cn("grid gap-2", className)} {...props} ref={ref} />;
};
RadioGroupStacked.displayName = "RadioGroupStacked";

const RadioGroupStackedItem = ({
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
        // Base UI radio emits `data-checked` / `data-unchecked`; the Radix-era
        // `data-state-checked:` selectors never matched.
        "relative flex w-full flex-row items-center justify-between rounded-[var(--radius-card,var(--radius-lg))] border border-input px-4 py-3 text-start",
        "transition-[background-color,border-color,box-shadow,color] duration-micro ease-out motion-reduce:transition-none",
        "hover:bg-accent",
        "data-[checked]:border-primary data-[checked]:bg-primary/5 data-[checked]:ring-1 data-[checked]:ring-primary",
        controlFocusVisibleClassName,
        className,
      )}
      {...props}
    >
      <div className="flex w-full items-center">
        <BaseRadio.Indicator className="absolute start-4 flex items-center justify-center"></BaseRadio.Indicator>
        <div className="flex w-full items-center">{children}</div>
      </div>
    </BaseRadio.Root>
  );
};
RadioGroupStackedItem.displayName = "RadioGroupStackedItem";

export { RadioGroupStacked, RadioGroupStackedItem };
